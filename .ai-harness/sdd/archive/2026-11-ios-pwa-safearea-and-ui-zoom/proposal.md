# Propuesta de Cambio: Ajuste de safe-area superior en iOS PWA y escala de zoom configurable en Perfil

```yaml
change_id: "2026-11-ios-pwa-safearea-and-ui-zoom"
title: "Ajuste de safe-area superior en iOS PWA y escala de zoom configurable en Perfil"
module: "MOD-ui"
status: CONSOLIDATED
consolidated_at: "2026-11-18"
created_at: "2026-11-18"
author: "Antigravity"
tier: standard
```

---

## 1. Motivación y Contexto

Al instalar la aplicación como PWA en iPhone (iOS Safari Standalone) se detectaron dos problemas de experiencia de usuario:
1. **Difuminado superior que se come las cabeceras de las páginas:**
   - En `index.html`, el uso de `apple-mobile-web-app-status-bar-style="black-translucent"` combinado con `theme-color="#6b38fb"` hacía que iOS superpusiera un difuminado/gradiente de barra de estado en la parte superior.
   - Además, las clases arbitrarias de Tailwind `pt-[calc(env(safe-area-inset-top,0px)+0.5rem)]` sin espacios alrededor del operador `+` generaban CSS inválido según la especificación W3C (`calc(a + b)` exige espacios alrededor de `+` y `-`), provocando que WebKit descartase el `padding-top` y que las cabeceras quedasen ocultas bajo el área del Dynamic Island / reloj de iOS.
2. **Estructura y tipografía demasiado pequeña en iPhone:**
   - La escala base de 16px combinada con un uso intensivo de `text-xs` y tamaños fijos en píxeles (`text-[10px]`, `text-[11px]`) hace que toda la estructura y las letras se vean pequeñas en pantalla móvil.
   - Se requiere aplicar por defecto un ligero zoom inicial (`108%`) en toda la estructura de la app y permitir al usuario configurarlo en tiempo real desde la vista de **Mi Perfil**.

---

## 2. Delta de Especificación (Cambios sobre el Módulo Maestro)

### Contratos Afectados
- **[+] Añadido:** `CT-UI-05: Gestor de Escala y Zoom de Interfaz (UiScaleManager)` en `src/ui/theme/ui_scale.ts`
  - Define los niveles `UiScaleLevel = 'compact' | 'default' | 'comfortable' | 'large'` (`100%`, `108%`, `116%`, `125%`).
  - Expone `getStoredUiScale()`, `applyUiScale(level)`, `initUiScale()` y `UI_SCALE_OPTIONS`.
- **[~] Modificado:** `CT-01` / `CT-03` en `MOD-profile` (`src/profile/types.ts`, `src/profile/profile_service.ts`, `src/profile/views/ProfileView.ts`)
  - Añade soporte opcional para persistir `ui_scale` en el perfil del usuario y renderiza el selector interactivo de zoom/tamaño de letra en `ProfileView`.
- **[~] Modificado:** `CT-UI-01` (`src/ui/theme/tokens.css`, `index.html`, `public/manifest.json`)
  - Define utilidades CSS válidas con espacios en `calc()` para safe-areas de iOS (`.safe-header-top`, `.safe-dock-bottom`, `.safe-composer-bottom`, `.safe-sheet-bottom`) y alinea `theme-color` con `#fff7ff` (`--color-surface-canvas`).

### Invariantes y Reglas Afectadas
- **[+] Añadido:** `BR-UI-03: Escalado proporcional en rem y respeto estricto de safe-area-inset-top`
  - Ninguna vista debe usar `calc()` sin espacios ni tamaños de texto en `px` que impidan el escalado proporcional desde el elemento raíz `<html>`.

---

## 3. Casos Límite y Compatibilidad Hacia Atrás

- **Compatibilidad:** No rompe ningún consumidor existente. Si un usuario no tiene `ui_scale` guardado en `localStorage` ni en Firestore, se aplica automáticamente el nivel `'default'` (`108%`, un ligero zoom respecto al 100% anterior).
- **Fallback sin almacenamiento:** Si `localStorage` está restringido en modo privado de Safari, `ui_scale.ts` aplica igualmente el zoom en el DOM en memoria sin lanzar excepciones.
