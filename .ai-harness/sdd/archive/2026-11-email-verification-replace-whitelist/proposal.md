# Propuesta de Cambio: Sustitución de whitelist por verificación de email nativa y posterior aprobación de admin

```yaml
change_id: "2026-11-email-verification-replace-whitelist"
title: "Sustitución de whitelist por verificación de email nativa y posterior aprobación de admin"
module: "MOD-auth"
status: CONSOLIDATED
consolidated_at: "2026-11-18"
created_at: "2026-11-18"
author: "Antigravity"
tier: standard
```

---

## 1. Motivación y Contexto

La preautorización estricta por lista blanca (`/whitelist`) resultaba redundante y friccional ahora que los usuarios pueden registrarse y reclamar contraseñas de forma autónoma.
Se sustituye la verificación contra la whitelist por un flujo de doble barrera:
1. **Verificación de Email en Registro:** Firebase Auth envía un correo con enlace de verificación (`sendEmailVerification`). El usuario debe pulsar el enlace para confirmar que el correo le pertenece.
2. **Petición al Administrador:** Solo los usuarios con email verificado entran en la cola de peticiones pendientes (`status: 'pending_approval'`), momento en el que el Administrador puede Aceptarlos o Rechazarlos desde el panel.

---

## 2. Delta de Especificación (MOD-auth y MOD-admin)

### Contratos y Métodos
- **[-] Eliminado:** Verificación previa de email contra la colección `/whitelist` en el registro.
- **[+] Añadido en `FamilyAuthService`:**
  - `register(email, pass, name)`: Crea usuario en Firebase Auth y llama a `sendEmailVerification(user)`. Crea documento en `/users/{uid}` con `status: 'unverified_email'`.
  - `checkEmailVerifiedAndPromote(user)`: Recarga el token del usuario (`user.reload()`) y si `user.emailVerified === true`, promociona a `status: 'pending_approval'`.
  - `resendVerificationEmail(user)`: Permite reenviar el enlace si caduca o no llega.
- **[~] Modificado en `GatekeeperScreen`:**
  - Si `status === 'unverified_email'`: Muestra pantalla para confirmar correo antes de continuar, con botón de recarga/comprobación y reenvío.
  - Si `status === 'pending_approval'`: Muestra pantalla de espera de autorización del admin.
- **[~] Modificado en `AdminService` / `AdminView`:**
  - Centrado en gestionar solicitudes entrantes de usuarios con email verificado (`pending_approval`) y lista de miembros familiares.

---

## 3. Casos Límite y Compatibilidad Hacia Atrás

- Cuentas ya activas no se ven afectadas (mantienen su `status: 'active'`).
- La pantalla de login y registro ya no menciona la lista blanca.
