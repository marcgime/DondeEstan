# Tareas de Implementación: Contador dinámico y alerta preventiva > 15 miembros

```yaml
change_id: "2026-11-whitelist-counter-alert15"
status: COMPLETED
```

---

## 1. Módulo Admin (`src/admin/`)
- [x] 1.1 Actualizar `AdminView.ts` para contabilizar en tiempo real los miembros en whitelist.
- [x] 1.2 Implementar alerta visual preventiva si `count > 15` con estilo amigable de diseño.
- [x] 1.3 Eliminar cualquier referencia fija a "Máx 8" en textos y vistas.

## 2. Módulo Profile (`src/profile/`)
- [x] 2.1 Actualizar tarjeta de información en `ProfileView.ts` para reflejar el nuevo estado de núcleo sin límite fijo.

## 3. Pruebas y Validación
- [x] 3.1 Ejecutar suite de pruebas unitarias (`npm test`).
- [x] 3.2 Compilar proyecto (`npm run build`).
- [x] 3.3 Validadores del arnés (`harness-validator`, `preflight`, `sync-sdd`).
