# Tareas de Implementación: Fase 4 — Panel de Administración Familiar y Perfil con Compresión de Avatar

```yaml
change_id: "2026-11-fase4-admin-profile"
status: COMPLETED
```

---

## 1. Módulo Profile (`src/profile/`)
- [x] 1.1 Implementar compresor de imágenes en cliente (`src/profile/image_compressor.ts`).
- [x] 1.2 Implementar servicio de perfil (`src/profile/profile_service.ts`).
- [x] 1.3 Pruebas unitarias para perfil y compresor (`tests/unit/profile/profile_service.test.ts`).
- [x] 1.4 Crear vista de perfil interactiva (`src/profile/views/ProfileView.ts`).
- [x] 1.5 Exportar API pública del módulo en `src/profile/index.ts`.

## 2. Módulo Admin (`src/admin/`)
- [x] 2.1 Implementar servicio de administración (`src/admin/admin_service.ts`).
- [x] 2.2 Pruebas unitarias para administración (`tests/unit/admin/admin_service.test.ts`).
- [x] 2.3 Crear vista visual del panel de administración (`src/admin/views/AdminView.ts`).
- [x] 2.4 Exportar API pública del módulo en `src/admin/index.ts`.

## 3. Integración en Navegación y Vistas (`src/main.ts`)
- [x] 3.1 Conectar `ProfileView` y `AdminView` en el flujo de `main.ts`.
- [x] 3.2 Verificar actualización reactiva tras aprobar usuarios o cambiar avatar.

## 4. Calidad y Verificación
- [x] 4.1 Ejecutar suite completa de tests (`npm test`).
- [x] 4.2 Compilar proyecto (`npm run build`).
- [x] 4.3 Ejecutar validadores del arnés (`harness-validator`, `preflight`, `sync-sdd`).
