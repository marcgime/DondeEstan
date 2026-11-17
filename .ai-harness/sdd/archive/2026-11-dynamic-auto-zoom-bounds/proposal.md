# Propuesta de Cambio: Autoencuadre dinámico con fitBounds y controles de zoom manual siempre activos

```yaml
change_id: "2026-11-dynamic-auto-zoom-bounds"
title: "Autoencuadre dinámico con fitBounds al seleccionar contactos y controles de zoom manual siempre activos"
module: "MOD-location"
status: CONSOLIDATED
consolidated_at: "2026-11-17"
created_at: "2026-11-17"
author: "Antigravity"
tier: fast_path
```

---

## 1. Motivación y Contexto

1. **Autoencuadre dinámico inteligente:**
   - Al marcar "Mostrar todos" (ON): el mapa debe ajustar automáticamente su zoom (`fitBounds`) para encuadrar a todos los familiares con ubicación válida.
   - Al seleccionar o deseleccionar contactos individualmente (OFF): el mapa debe recalcular los límites y hacer zoom in / zoom out suave para encuadrar con precisión exactamente a los contactos actualmente seleccionados. Si hay solo 1 seleccionado, centra con zoom cercano (~16); si hay varios, ejecuta `fitBounds`.
2. **Zoom manual siempre habilitado:**
   - El usuario debe poder hacer zoom in / zoom out en cualquier momento tanto mediante gestos táctiles (pinch-to-zoom, doble tap) como mediante botones dedicados de (+) y (-) integrados de forma flotante sobre el mapa.

---

## 2. Delta de Especificación (Cambios sobre MOD-location)

### Invariantes y Comportamientos
- **[+] Añadido:**
  - Botones táctiles de zoom manual `(+)` y `(-)` flotantes sobre el mapa.
  - Función de autoencuadre reactiva `fitToSelectedMembers(members: MemberLocationState[])` ejecutada cada vez que cambia la selección o el toggle.
  - Habilitación de gestos de zoom táctiles nativos en los motores de Leaflet y Google Maps.
  - Gestión de padding adaptativo en `fitBounds` para evitar que los marcadores queden pegados a los bordes del recuadro cuadrado.

---

## 3. Casos Límite y Compatibilidad Hacia Atrás

- Si ningún contacto seleccionado tiene coordenadas GPS, el mapa mantiene su posición actual.
- Si solo hay 1 contacto seleccionado, no se hace un `fitBounds` que pueda distorsionar el zoom, sino un `centerOn` con zoom óptimo (16).
- Los gestos táctiles y botones de zoom respetan límites mínimos y máximos (zoom 3 a 19).
