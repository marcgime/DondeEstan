# Módulo: Planificador de Viajes e Itinerarios GuIA (MOD-guia)

```yaml
module_id: MOD-guia
name: "Planificador de Viajes e Itinerarios GuIA"
target_path: "src/guia/"
scope: "block_guia.md"
owner: "Product Engineering"
version: "1.0.0"
last_updated: "2026-11-25"
```

---

## 1. Propósito y Responsabilidades

Es la autoridad funcional responsable de **la integración de la ventana unificada de viajes e itinerarios GuIA para todos los usuarios cuyos grupos tengan acceso habilitado por el administrador (`guia_enabled`).** dentro de `DondeEstan`.

### Lo que hace
- Renderiza la vista unificada de GuIA (`renderGuiaView`) sin barra superior redundante ni selector de grupos.
- Verifica que el usuario pertenezca a al menos un grupo con `guia_enabled: true` y redirige a `map` en caso contrario.
- Expone el servicio y generador de itinerarios de viaje (`GuiaService`, `generateGroupItinerary`).

### Lo que NO hace
- No duplica barras de navegación superiores sobre la interfaz embebida de GuIA.
- No obliga al usuario o administrador a seleccionar un grupo concreto para visualizar GuIA.

---

## 2. Contratos y Tipos Públicos (CT-*)

### CT-GUIA-01: Modelos de Itinerarios (`GroupTrip`)
- **Símbolo / Archivo:** `src/guia/types.ts::GroupTrip`
- **Invariantes:** Estructuras tipadas de metadatos y plan diario por franjas.

### CT-GUIA-02: Servicio de Viajes (`GuiaService`)
- **Símbolo / Archivo:** `src/guia/guia_service.ts::GuiaService`
- **Invariantes:** Suscripción y persistencia en Firestore.

### CT-GUIA-03: Vista Unificada de GuIA (`renderGuiaView`)
- **Símbolo / Archivo:** `src/guia/views/GuiaView.ts::renderGuiaView`
- **Invariantes:** Vista a pantalla completa sin menú superior redundante y con acceso único compartido para todos los grupos con `guia_enabled`.

---

## 3. Reglas de Negocio e Invariantes (BR-*)

- **BR-GUIA-01:** Todo grupo sin `guia_enabled` explícito tiene el acceso a GuIA desactivado por defecto.
- **BR-GUIA-02:** El acceso a GuIA es único para todos los grupos habilitados: cualquier usuario que pertenezca a al menos un grupo con `guia_enabled: true` ve la pestaña `GuIA` en el dock inferior y accede directamente a la ventana unificada sin selector de grupos ni barra superior.

---

## 4. Mapa de implementación

| Contrato / Flujo | Símbolo de Código | Ruta en Disco | Pruebas Unitarias |
|---|---|---|---|
| CT-GUIA-01 | `GroupTrip`, `NewTripRequest` | `src/guia/types.ts` | `tests/unit/guia/guia.test.ts` |
| CT-GUIA-02 | `GuiaService` | `src/guia/guia_service.ts` | `tests/unit/guia/guia.test.ts` |
| CT-GUIA-03 | `generateGroupItinerary` | `src/guia/generator.ts` | `tests/unit/guia/guia.test.ts` |
| CT-GUIA-04 | `renderGuiaView` | `src/guia/views/GuiaView.ts` | `tests/unit/guia/guia.test.ts` |
