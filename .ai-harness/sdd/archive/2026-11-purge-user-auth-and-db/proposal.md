# Propuesta de Cambio: Purga completa de usuario en Firestore, Whitelist y Firebase Authentication

```yaml
change_id: "2026-11-purge-user-auth-and-db"
title: "Purga completa de usuario en Firestore, Whitelist y Firebase Authentication"
module: "MOD-admin"                 # Módulo afectado en .ai-harness/sdd/modules/
status: CONSOLIDATED
consolidated_at: "2026-11-18"
created_at: "2026-11-18"
author: "Product Engineering"
tier: standard                      # fast_path | standard | core
```

---

## 1. Motivación y Contexto

Cuando el administrador elimina a un usuario desde el Panel de Administración (`purgeMember`), anteriormente solo se borraba el documento `/users/{uid}` en Firestore, dejando activa su entrada en `/whitelist/{email}` y su cuenta en **Firebase Authentication** (`firebase/auth`). En arquitectura 100% Spark sin servidor ni Service Account privada, el borrado de Firebase Authentication debe ejecutarse mediante auto-purga desde el cliente autenticado del usuario eliminado (tanto en vivo si está conectado, como al intentar iniciar sesión o re-registrarse), además de eliminar su documento en Firestore y su correo en Whitelist.

---

## 2. Delta de Especificación (Cambios sobre el Módulo Maestro)

### Contratos Afectados
- **[~] Modificado:** `CT-02: AdminService::purgeMember(targetUid, currentAdminUid, targetEmail?)` (`src/admin/admin_service.ts`)
  - Elimina el documento `/users/{targetUid}` en Firestore y purga también `/whitelist/{email}` si existe correo asociado.
- **[+] Añadido:** `CT-AUTH-04: FamilyAuthService::purgeCurrentUserAuth(user)` (`src/auth/auth_service.ts`)
  - Ejecuta `deleteUser(user)` en Firebase Authentication para eliminar el registro de Auth del usuario purgado (con fallback a `signOut` si el token requiere reautenticación reciente), e integra la auto-purga en `login()`, `register()` y en el listener reactivo de `main.ts`.

### Invariantes y Reglas Afectadas
- **[+] Añadido:** `BR-ADM-03: Purga Integral de Usuario (Firestore + Whitelist + Auth)`
  - Al eliminar un usuario, se borran sus datos en Firestore (`/users/{uid}` y `/whitelist/{email}`) y su credencial en Firebase Authentication se purga automáticamente mediante `deleteUser` en su sesión activa o en su siguiente intento de login/registro.
- **[+] Añadido:** `BR-AUTH-03: Auto-purga de Credencial Huérfana en Authentication`
  - Si un usuario autenticado en Firebase Auth carece de documento `/users/{uid}` en Firestore (fuera de la ventana transaccional de `register()`), el cliente invoca `deleteUser(user)` para eliminar su registro de Firebase Authentication.

### Flujos Afectados
1. **Admin elimina usuario (`purgeMember`):** Se borra `/users/{uid}` y `/whitelist/{email}`.
2. **Usuario eliminado con sesión abierta (`main.ts`):** `subscribeToUserProfile` recibe `null`, invoca `authService.purgeCurrentUserAuth(user)` (`deleteUser(user)`) y cierra la sesión.
3. **Usuario eliminado intenta Login (`login`):** `signInWithEmailAndPassword` renueva la credencial reciente, detecta `profile === null`, ejecuta `deleteUser(user)` borrándolo definitivamente de Firebase Authentication y lanza error informativo.
4. **Usuario eliminado intenta Registrarse de nuevo (`register`):** Si `createUserWithEmailAndPassword` devuelve `auth/email-already-in-use`, verifica si el perfil en Firestore fue purgado; de ser así, elimina el usuario huérfano de Auth (`deleteUser`) y completa el nuevo registro limpio.

---

## 3. Casos Límite y Compatibilidad Hacia Atrás

- **¿Rompe consumidores existentes?** No; `targetEmail` en `purgeMember` es opcional (si no se pasa, se lee del documento antes de borrarlo).
- **¿Cómo afecta a la persistencia?** Garantiza que no queden cuentas huérfanas en Firebase Authentication ni entradas residuales en `/whitelist`.
- **Casos de fallo previstos:** Si la sesión activa del usuario purgado lleva abierta mucho tiempo y Firebase devuelve `auth/requires-recent-login`, se cierra la sesión inmediatamente (`signOut`) y el `deleteUser` definitivo ocurre en cuanto intenta autenticarse.
