# Propuesta de Cambio: Ajuste de viewport iOS, safe area y glassmorphism en dock de navegación

```yaml
change_id: "2026-11-ios-viewport-glassmorphism-dock"
title: "Ajuste de viewport iOS, safe area y glassmorphism en dock de navegación"
module: "MOD-ui"
status: CONSOLIDATED
consolidated_at: "2026-11-12"
created_at: "2026-11-12"
author: "Antigravity"
tier: fast_path
```

---

## 1. Motivación y Contexto

En dispositivos iOS (iPhone) con Safari PWA en modo standalone:
1. Aparece una franja en blanco en la parte inferior de la pantalla debido a que el viewport no ocupa `100dvh` (dynamic viewport height) o el body/html no extiende el fondo a la safe area.
2. La barra de navegación inferior queda demasiado elevada sobre el mapa (`bottom-4` + `safe-bottom`) o desalineada respecto al borde inferior de la pantalla.
3. El efecto de translucidez y desenfoque (glassmorphism) no se procesa adecuadamente en WebKit/iOS Safari si falta el prefijo `-webkit-backdrop-filter`.

---

## 2. Delta de Especificación (Cambios sobre MOD-ui)

### Invariantes y Reglas Afectadas
- **[~] Modificado:** Ajuste de estilos de viewport y docks flotantes:
  - Definición explícita de `min-height: 100dvh` y `height: 100dvh` para el viewport móvil.
  - Soporte universal de `backdrop-filter` con `-webkit-backdrop-filter` para todas las clases de glassmorphism (`bg-surface-glass`, `.glass-dock`).
  - Posicionamiento óptimo de `nav` en Mapa, Chat y Perfil utilizando `env(safe-area-inset-bottom)` de forma nativa sin generar huecos en blanco inferiores.
  - Asegurar que `#google-map-container` y el canvas cubran el 100% real de la altura de la pantalla hasta el borde físico inferior.

---

## 3. Casos Límite y Compatibilidad Hacia Atrás

- Compatible con navegadores de escritorio y Android (Chromium y Firefox aplican `backdrop-filter` estándar y `100dvh`).
- Sin impacto en APIs ni contratos de datos.
