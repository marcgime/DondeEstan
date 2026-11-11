# Propuesta de Cambio: Fase 2 — Mapa Google Maps y Geolocalización Reactiva con Throttling

```yaml
change_id: "2026-11-fase2-map-location"
title: "Fase 2: Mapa Google Maps y Geolocalización Reactiva con Throttling"
module: "MOD-location"
status: IMPLEMENTING
created_at: "2026-11-11"
author: "Antigravity"
tier: core
```

---

## 1. Motivación y Contexto

Habilitar la capacidad central de visualización y emisión de coordenadas de **DondeEstan** según el [PRD.docx](../../input/PRD.docx) (§4 Módulo 1 y §2 Arquitectura de Coste Cero):

1. **Blindaje de cuota Firestore Spark (FM-001):** Sin un estrangulamiento riguroso de emisiones, las llamadas continuas del sensor GPS agotarían las 20.000 escrituras diarias de Firestore en cuestión de horas. Se implementa la regla `(Δt >= 30s && Δd >= 15m) || (Δt >= 120s)`.
2. **Ciclo de vida adaptado a iOS WebKit (FM-002):** Cancelación del watcher GPS y emisión de `status: "offline"` ante `visibilitychange == 'hidden'`, junto con detección de corte abrupto (`now - updated_at > 90s`).
3. **Fidelidad visual Kinetic Bloom:** Marcadores de avatar circulares con halo pulsante (verde online, gris offline), floating action buttons de encuadre y centrado, y bottom sheet [`DS-LOCATION-CARD`](../../scopes/block_location.md).

---

## 2. Delta de Especificación (Cambios sobre Módulos)

### Módulo Principal Afectado: `MOD-location` (`src/location/`)

#### Contratos Afectados:
- **[+] `CT-LOC-01: HaversineDistance` (`src/location/geo_utils.ts`):**
  - Cálculo determinista de distancia entre dos coordenadas `(lat1, lng1)` y `(lat2, lng2)` en metros mediante la fórmula de Haversine.
- **[+] `CT-LOC-02: LocationThrottleService` (`src/location/throttle.ts`):**
  - Evalúa si una nueva lectura de coordenadas debe emitirse a Firestore basándose en:
    - `shouldEmit(lastReport, currentCoords, now): boolean`
    - Invariante: `true` si `(Δt >= 30_000ms && Δd >= 15m) || (Δt >= 120_000ms)`.
- **[+] `CT-LOC-03: GeolocationTracker` (`src/location/tracker.ts`):**
  - Gestiona `navigator.geolocation.watchPosition` con `{ enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }`.
  - Escucha eventos `document.addEventListener('visibilitychange')` y `window.addEventListener('pagehide')` para conmutar `status: "online"` y `status: "offline"`.
- **[+] `CT-LOC-04: FamilyMapService` (`src/location/map_service.ts`):**
  - Inicializa Google Maps y actualiza marcadores `google.maps.marker.AdvancedMarkerElement` (o marcadores DOM optimizados) para los miembros familiares activos.
  - Implementa autocentrado y encuadre global (`fitBounds`).
- **[+] `CT-LOC-05: DS-LOCATION-CARD` (`src/location/components/LocationCard.ts`):**
  - Modal inferior táctil (Bottom Sheet) que muestra avatar, nombre, tiempo relativo («hace 20 s»), indicador de batería opcional y estado de conexión.

#### Reglas de Negocio (BR-*):
- **`BR-LOC-01` (Throttling Estricto):** Prohibido escribir en Firestore con intervalo menor a 30 segundos, salvo primer reporte de sesión.
- **`BR-LOC-02` (Detección de Desconexión Abrupta):** Si `now() - location.updated_at > 90s`, el cliente marca visualmente al miembro como `offline` aunque su documento aún conserve `status: "online"`.
- **`BR-LOC-03` (Aislamiento de Sensores):** El tracker GPS se suspende inmediatamente al pasar a segundo plano para ahorrar batería en iPhone.

---

## 3. Modelo de Coordenadas (Firestore)

```typescript
export interface LocationData {
  lat: number;
  lng: number;
  updated_at: Timestamp | number;
}
```
Actualiza en `/users/{uid}`:
```typescript
{
  location: {
    lat: 41.5632,
    lng: 2.0089,
    updated_at: serverTimestamp()
  },
  status: "online" | "offline",
  updated_at: serverTimestamp()
}
```
