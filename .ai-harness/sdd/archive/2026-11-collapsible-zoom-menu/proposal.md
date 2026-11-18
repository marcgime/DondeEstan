# Propuesta de Cambio: Selector de zoom plegable en Mi Perfil

```yaml
change_id: "2026-11-collapsible-zoom-menu"
title: "Selector de zoom plegable en Mi Perfil"
module: "MOD-profile"               # Módulo afectado en .ai-harness/sdd/modules/
status: CONSOLIDATED
consolidated_at: "2026-11-18"
created_at: "2026-11-18"
author: "Product Engineering"
tier: standard                      # fast_path | standard | core
```

---

## 1. Motivación y Contexto

En la vista **Mi Perfil** (`src/profile/views/ProfileView.ts`), el selector de "Tamaño de Letra y Zoom" permanece siempre desplegado con los 4 botones de escala visual, ocupando un espacio vertical excesivo en pantallas móviles. Al convertirlo en un menú plegable (colapsado por defecto mostrando la opción activa y el porcentaje), se despeja la pantalla y solo se despliega el detalle cuando el usuario pulsa sobre la fila, volviendo a plegarse automáticamente tras elegir un nivel de zoom.

---

## 2. Delta de Especificación (Cambios sobre el Módulo Maestro)

### Contratos Afectados
- **[~] Modificado:** `UI-01: renderProfileView` (`src/profile/views/ProfileView.ts`)
  - Incorpora estado local `isZoomMenuOpen` (inicializado en `false`) con botón accesible (`#btn-toggle-zoom-menu`, `aria-expanded`) para desplegar/plegar el selector de escala visual.

### Invariantes y Reglas Afectadas
- **[+] Añadido:** `BR-PROFILE-04: Selector de Zoom Plegable`
  - El bloque de ajuste de zoom (`Tamaño de Letra y Zoom`) en `ProfileView` se presenta plegado por defecto mostrando la etiqueta y porcentaje activos; al pulsar su cabecera se despliegan las 4 opciones (`UI_SCALE_OPTIONS`), y al seleccionar una opción se aplica la escala y el menú se minimiza automáticamente (`isZoomMenuOpen = false`).

### Flujos Afectados
1. El usuario abre **Mi Perfil** -> El menú de zoom aparece plegado mostrando p. ej. `Cómodo · 108%` y un icono chevron.
2. El usuario pulsa `#btn-toggle-zoom-menu` -> Se despliega la rejilla con las 4 opciones de zoom.
3. El usuario elige un nivel de zoom (o vuelve a pulsar la cabecera) -> Se aplica `applyUiScale`, se sincroniza con `profileService.updateUiScale` y el menú se pliega automáticamente.

---

## 3. Casos Límite y Compatibilidad Hacia Atrás

- **¿Rompe consumidores existentes?** No. La firma pública `renderProfileView(container, options)` se mantiene intacta.
- **¿Cómo afecta a la persistencia?** Sigue utilizando `localStorage` y `profileService.updateUiScale(uid, scale)` sin cambios de esquema.
- **Casos de fallo previstos:** Si el usuario pulsa la opción ya activa en el menú desplegado, igualmente se cierra el desplegable para minimizarlo sin requerir escritura redundante en Firestore.
