# Checklist de Implementación: Actualización SW y Translucidez

```yaml
change_id: "2026-11-ios-sw-translucency-fix"
total_tasks: 2
completed_tasks: 2
```

- [x] **T1: Actualización de Service Worker v2 y Auto-Update**
  - Actualizar `CACHE_NAME` a `dondeestan-shell-v2` en `public/sw.js` para invalidar la caché persistente en iOS PWA.
- [x] **T2: Ajuste de Translucidez Sutil en Glassmorphism**
  - Reducir opacidad en `tokens.css` a ~0.60 - 0.65 con `backdrop-filter` para notar claramente el mapa por detrás.
