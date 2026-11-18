# Propuesta de Cambio: Integración del logo oficial como favicon/PWA icon y nombre por defecto DondeEstan

```yaml
change_id: "2026-11-pwa-logo-and-branding"
title: "Integración del logo oficial como favicon/PWA icon y nombre por defecto DondeEstan"
module: "MOD-ui"
status: CONSOLIDATED
consolidated_at: "2026-11-18"
created_at: "2026-11-18"
author: "Antigravity"
tier: standard
```

---

## 1. Motivación y Contexto

La PWA carecía de un favicon real y utilizaba un icono SVG genérico provisional. Además, al instalar o guardar la aplicación en el escritorio o pantalla de inicio, el nombre por defecto era `"Familia"` (o `"Localizador Familiar"`) en lugar de `"DondeEstan"`. Se integra el logotipo oficial proporcionado por el usuario en todos los tamaños requeridos por navegadores de escritorio y móviles (favicon, `apple-touch-icon`, iconos PWA `192x192` y `512x512`) y en la interfaz de la aplicación (pantalla de inicio de sesión/registro `AuthView` y banner de instalación `PwaInstallPrompt`), configurando `"DondeEstan"` como nombre por defecto al instalar.

---

## 2. Delta de Especificación (Cambios sobre el Módulo Maestro)

### Contratos Afectados
- **[~] Modificado:** `CT-UI-03: checkAndRenderIosInstallPrompt` (`src/ui/components/PwaInstallPrompt.ts`)
  - Muestra el logotipo oficial de la app (`/icons/icon-192.png`) e indica `"Instala DondeEstan en tu iPhone"`.
- **[+] Añadido:** `CT-UI-07: renderAuthView` (`src/auth/views/AuthView.ts`)
  - Cabecera de autenticación y registro con el logotipo oficial (`/icons/icon-192.png`).

### Invariantes y Reglas Afectadas
- **[+] Añadido:** `BR-UI-05:` El manifiesto PWA (`public/manifest.json`) y las etiquetas meta de `index.html` (`apple-mobile-web-app-title`, `application-name`) deben declarar `"DondeEstan"` como `name` y `short_name` por defecto al guardar en el escritorio o pantalla de inicio, sirviendo el logotipo oficial como favicon (`/favicon.png`), `apple-touch-icon` (`/icons/apple-touch-icon.png`) e iconos PWA (`/icons/icon-192.png`, `/icons/icon-512.png`).

### Flujos Afectados
- Instalación de la PWA en escritorio/móvil y visualización del logotipo en la pestaña del navegador, pantalla de acceso/registro y sugerencia de instalación iOS.

---

## 3. Casos Límite y Compatibilidad Hacia Atrás

- **¿Rompe consumidores existentes?** No. Se actualiza la versión de caché del Service Worker (`public/sw.js`) para precachear los nuevos iconos PNG.
- **¿Cómo afecta a la migración de datos o persistencia existente?** No afecta a Firestore ni al grupo por defecto `"Familia"`.
