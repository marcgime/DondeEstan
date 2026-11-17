# Checklist de Implementación: Autoencuadre dinámico y zoom manual

```yaml
change_id: "2026-11-dynamic-auto-zoom-bounds"
total_tasks: 3
completed_tasks: 3
```

- [x] **T1: Métodos de Zoom Manual en Motores de Mapa**
  - Añadir soporte para zoom in / zoom out en `IMapEngine`, `LeafletFamilyMapService` y `FamilyMapService`.
  - Asegurar gestos táctiles de zoom (`touchZoom: true`, `doubleClickZoom: true`) activos en Leaflet.
- [x] **T2: Autoencuadre Reactivo (`fitBounds` / `centerOn`) en `MapView.ts`**
  - Al cambiar el toggle a ON: calcular límites de todos y encuadrar.
  - Al hacer clic en un contacto (OFF): calcular límites del subconjunto seleccionado y encuadrar automáticamente.
  - Añadir botones de zoom manual (+) y (-) sobre el recuadro del mapa.
- [x] **T3: Validación y Quality Gates**
  - Tests unitarios de cálculo de encuadre.
  - Ejecutar `harness-validator`, `preflight`, `sync-sdd` y despliegue a Cloudflare.
