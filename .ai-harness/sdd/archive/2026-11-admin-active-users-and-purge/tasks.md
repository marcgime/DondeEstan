# Checklist de Implementación: Usuarios Registrados en Panel Admin

```yaml
change_id: "2026-11-admin-active-users-and-purge"
total_tasks: 3
completed_tasks: 3
```

- [x] **T1: Método `subscribeToAllMembers` en `AdminService`**
  - Implementar escucha reactiva a todos los usuarios familiares en Firestore (`/users`).
- [x] **T2: Rediseño de Sección 3 en `AdminView.ts`**
  - Renombrar a "Miembros Familiares (Usuarios Activos)".
  - Quitar formulario de preautorización.
  - Renderizar lista de usuarios con rol, estado y botón de eliminación con modal de confirmación.
- [x] **T3: Tests Unitarios y Despliegue CI/CD**
  - Actualizar tests de `AdminService` y `AdminView`.
  - Validar arnés (`harness-validator`, `preflight`, `sync-sdd`) y publicar a Cloudflare.
