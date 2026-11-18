# Tareas de Implementación: Integración del logo oficial como favicon/PWA icon y nombre por defecto DondeEstan

> Checklist de ejecución técnica asociado a `proposal.md`.
> El agente debe marcar con `[x]` cada tarea conforme se complete y verifique.

---

## 1. Fase de Especificación y Diseño
- [x] Validar la propuesta con el usuario / equipo de producto.
- [x] Confirmar que no hay colisión con otros cambios en curso en `changes/`.

## 2. Fase de Consolidación Documental
- [x] Ejecutar `/consolidate-change` (o aplicar delta en `modules/[modulo].md`).
- [x] Commit documental: `docs(specs): consolidar 2026-11-pwa-logo-and-branding`.

## 3. Fase de Implementación de Código
- [x] Generar iconos cuadrados optimizados (`favicon.png`, `icons/apple-touch-icon.png`, `icons/icon-192.png`, `icons/icon-512.png`) a partir del logo proporcionado.
- [x] Actualizar `index.html`, `public/manifest.json` y `public/sw.js` con el favicon, iconos y el nombre por defecto `"DondeEstan"`.
- [x] Actualizar `src/auth/views/AuthView.ts` y `src/ui/components/PwaInstallPrompt.ts` para mostrar el logo oficial y el nombre `"DondeEstan"`.
- [x] Actualizar el `Mapa de implementación` en el módulo maestro (`MOD-ui`).

## 4. Fase de Pruebas y Validación Determinista
- [x] Escribir o actualizar pruebas unitarias para los nuevos contratos.
- [x] Ejecutar suite de tests del proyecto y verificar 100% verde.
- [x] Ejecutar `preflight` del arnés.
- [x] Ejecutar `sync-sdd` y comprobar cero deriva.
