# Propuesta de Cambio: Actualización SW para PWA iOS y mejora de translucidez glassmorphism

```yaml
change_id: "2026-11-ios-sw-translucency-fix"
title: "Actualización SW para PWA iOS y mejora de translucidez glassmorphism"
module: "MOD-ui"
status: CONSOLIDATED
consolidated_at: "2026-11-12"
created_at: "2026-11-12"
author: "Antigravity"
tier: fast_path
```

---

## 1. Motivación y Contexto

1. **Caché persistente de PWA en iOS (Service Worker):**
   - El Service Worker `public/sw.js` usaba `CACHE_NAME = 'dondeestan-shell-v1'` y una estrategia de caché que retenía los assets estáticos antiguos del primer arranque. Al cerrar y abrir la app, iOS PWA servía el CSS en caché sin actualizar de inmediato a menos que el Service Worker se actualice (bump de versión `v2` y `skipWaiting`).
2. **Translucidez de Glassmorphism insuficiente:**
   - La opacidad actual (`rgba(255, 255, 255, 0.82)`) es demasiado opaca, por lo que casi no se aprecia el mapa detrás.
   - Ajustaremos a una translucidez sutil y elegante (`rgba(255, 255, 255, 0.58)` a `0.65`) con desenfoque de 20px y saturación para que el mapa se transparente claramente debajo de los botones y de la barra.

---

## 2. Delta de Especificación

### Invariantes y Reglas Afectadas
- **[~] Modificado:**
  - `public/sw.js`: Cambiar versión de caché a `dondeestan-shell-v2` y forzar actualización activa del Service Worker.
  - `src/ui/theme/tokens.css`:
    - `--color-surface-glass`: `rgba(255, 255, 255, 0.62)`.
    - `--color-surface-glass-border`: `rgba(255, 255, 255, 0.45)`.
    - `.glass-dock`: `background: rgba(255, 255, 255, 0.65); -webkit-backdrop-filter: blur(20px) saturate(180%); backdrop-filter: blur(20px) saturate(180%);`.
    - `.glass-panel`: `background: rgba(255, 255, 255, 0.60); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);`.

---

## 3. Casos Límite y Compatibilidad Hacia Atrás

- Garantiza que al abrir la app, el Service Worker detecte el nuevo hash y actualice el shell automáticamente.
- Máxima legibilidad manteniendo contraste WCAG AA.
