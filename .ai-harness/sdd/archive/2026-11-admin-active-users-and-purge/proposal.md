# Propuesta de Cambio: Transformación de Panel Admin a Usuarios Registrados

```yaml
change_id: "2026-11-admin-active-users-and-purge"
title: "Transformación de panel admin: sustitución de whitelist por Usuarios Registrados con eliminación y desvinculación"
module: "MOD-admin"
status: CONSOLIDATED
consolidated_at: "2026-11-18"
created_at: "2026-11-18"
author: "Antigravity"
tier: standard
```

---

## 1. Motivación y Contexto

Se sustituye la antigua sección de "Lista Blanca (Preautorizados)" por **"Miembros Familiares (Usuarios Registrados)"**.
- Las solicitudes de nuevos usuarios llegan en estado `pending_approval` tras verificar su correo. El administrador puede Aprobarlas o Rechazarlas.
- En la sección de miembros familiares, el administrador puede ver a todos los miembros activos y puede **Eliminar / Expulsar** a cualquiera con confirmación explícita.
- Al eliminar un usuario: se purga su documento en `/users/{uid}`, se borra su ubicación y se desvincula de Firestore. Además, se añade la indicación y soporte para que dicho usuario pueda volver a registrarse desde cero cuando lo desee sin bloqueos.

---

## 2. Delta de Especificación (MOD-admin)

### Contratos y Métodos
- **[-] Eliminado en `AdminView`:** Formulario de añadir correos preautorizados (`form-add-whitelist`).
- **[+] Añadido en `AdminService`:**
  - `subscribeToAllMembers(onMembers: (members: UserProfile[]) => void): Unsubscribe`: Escucha en tiempo real la colección `/users` filtrando miembros registrados.
  - `purgeMember(targetUid: string, currentAdminUid: string)`: Elimina el registro de Firestore y su estado.
- **[~] Modificado en `AdminView`:**
  - Título: "Miembros Familiares (Usuarios Activos)".
  - Contador: `${totalCount} familiares registrados` con alerta si `> 15`.
  - Botón de papelera con confirmación: "¿Expulsar y eliminar a [Nombre] del núcleo familiar?".
  - El administrador conectado no puede autoeliminarse (BR-ADM-02).

---

## 3. Casos Límite y Compatibilidad Hacia Atrás

- Se garantiza que el administrador nunca pueda auto-eliminarse por accidente.
- Limpieza completa sin referencias residuales a la colección `/whitelist`.
