# Tareas de Implementación: Fase 2 — Mapa Google Maps y Geolocalización Reactiva con Throttling

> Checklist de ejecución técnica atómica asociado a `proposal.md`.
> Cada paso se verifica antes de marcar con `[x]`.

---

## Bloque 1: Algoritmos de Geolocalización y Throttling (MOD-location)
- [ ] 1.1 Implementar `src/location/geo_utils.ts` con la fórmula Haversine (`calculateDistanceMeters`).
- [ ] 1.2 Implementar `src/location/types.ts` con contratos de ubicación, presencia y opciones de tracker.
- [ ] 1.3 Implementar `src/location/throttle.ts` con `LocationThrottleService` (`Δt >= 30s && Δd >= 15m || Δt >= 120s`).
- [ ] 1.4 Escribir pruebas unitarias exhaustivas en `tests/unit/location/throttle.test.ts`.

## Bloque 2: Ciclo de Vida y Tracker GPS en iOS Safari (MOD-location)
- [ ] 2.1 Implementar `src/location/tracker.ts` con `GeolocationTracker` y soporte de `visibilitychange` / `pagehide`.
- [ ] 2.2 Implementar emisor a Firestore que actualiza `/users/{uid}.location` y `/users/{uid}.status`.
- [ ] 2.3 Implementar cálculo de desconexión abrupta (>90 s) en `src/location/presence.ts`.
- [ ] 2.4 Escribir pruebas unitarias en `tests/unit/location/presence.test.ts`.

## Bloque 3: Integración de Google Maps y Marcadores DOM (MOD-location & MOD-ui)
- [ ] 3.1 Implementar cargador dinámico de Google Maps JS API en `src/location/maps_loader.ts`.
- [ ] 3.2 Implementar `src/location/map_service.ts` con gestión de mapa, marcadores de miembros con halo pulsante (verde online, gris offline).
- [ ] 3.3 Implementar acciones de mapa: autocentrado y encuadre global `fitBounds`.
- [ ] 3.4 Implementar componente Bottom Sheet `DS-LOCATION-CARD` (`src/location/components/LocationCard.ts`).

## Bloque 4: Integración en la PWA y Verificación
- [ ] 4.1 Montar la vista de Mapa en `src/location/views/MapView.ts` integrando el tracker GPS y los miembros en directo.
- [ ] 4.2 Conectar `MapView` en el shell principal de `src/main.ts`.
- [ ] 4.3 Ejecutar suite de pruebas con `npm test` y verificar 100% verde.
- [ ] 4.4 Ejecutar compilación `npm run build`.

## Bloque 5: Quality Gates del Arnés
- [ ] 5.1 Ejecutar `harness-validator`.
- [ ] 5.2 Ejecutar `preflight`.
- [ ] 5.3 Actualizar mapa de implementación en `modules/location.md`.
- [ ] 5.4 Consolidar la propuesta con `consolidate-change` y actualizar línea base con `sync-sdd --baseline`.
