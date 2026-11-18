# Tareas de Implementación: Ajuste de safe-area superior en iOS PWA y escala de zoom configurable en Perfil

> Checklist de ejecución técnica asociado a `proposal.md`.
> El agente debe marcar con `[x]` cada tarea conforme se complete y verifique.

---

## 1. Fase de Especificación y Diseño
- [x] Validar la propuesta con el usuario / equipo de producto.
- [x] Confirmar que no hay colisión con otros cambios en curso en `changes/`.

## 2. Fase de Consolidación Documental
- [x] Ejecutar `/consolidate-change` (o aplicar delta en `modules/ui.md` y `modules/profile.md`).
- [x] Commit documental: `docs(specs): consolidar 2026-11-ios-pwa-safearea-and-ui-zoom`.

## 3. Fase de Implementación de Código
- [x] Actualizar `index.html`, `public/manifest.json` y `src/ui/theme/tokens.css` para eliminar el difuminado superior en iOS PWA y corregir `safe-area-inset-top` / `safe-area-inset-bottom`.
- [x] Crear `src/ui/theme/ui_scale.ts` con soporte de zoom global basado en `rem` (`100%`, `108%` por defecto, `115%`, `122%`) y persistencia local/remota.
- [x] Actualizar las vistas (`MapView`, `ChatView`, `ProfileView`, `AdminView`, `AuthView`, `GatekeeperScreen`, `DraggableBottomSheet`, `PwaInstallPrompt`) para usar `.safe-header-top` y unidades `rem` escalables, e integrar el selector de zoom en `ProfileView`.
- [x] Actualizar el `Mapa de implementación` en el módulo maestro (`ui.md` y `profile.md`).

## 4. Fase de Pruebas y Validación Determinista
- [x] Escribir pruebas unitarias para `ui_scale.ts` y la actualización de escala en `profile_service.test.ts`.
- [x] Ejecutar suite de tests del proyecto y verificar 100% verde.
- [x] Ejecutar `preflight` del arnés.
- [x] Ejecutar `sync-sdd` y comprobar cero deriva.
