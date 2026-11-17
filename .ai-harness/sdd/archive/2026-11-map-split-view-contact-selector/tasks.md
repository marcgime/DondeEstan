# Checklist de Implementación: Map Split View y Selector de Contactos

```yaml
change_id: "2026-11-map-split-view-contact-selector"
total_tasks: 4
completed_tasks: 4
```

- [x] **T1: Rediseño del Layout de `MapView.ts`**
  - Contenedor superior para el mapa (cuadrado, ancho completo, bordes redondeados).
  - Barra intermedia con Toggle Switch accesible ("Mostrar todos") y contador.
  - Contenedor inferior scrolleable para la lista de familiares.
- [x] **T2: Lógica Reactiva de Selección y Filtrado de Marcadores**
  - Gestión del estado `showAll` y `selectedMemberUids: Set<string>`.
  - Si `showAll === true`: Lista en modo visualización / readonly. Marcadores de todos los familiares en mapa.
  - Si `showAll === false`: Clic en contacto añade/quita de `selectedMemberUids`. Mapa actualiza marcadores en tiempo real.
- [x] **T3: Estilos, Glassmorphism WebKit y Tests Unitarios**
  - Garantizar `-webkit-backdrop-filter` y transparencia calibrada en dock y switches.
  - Tests en `tests/unit/location/` para la lógica de filtrado de miembros.
- [x] **T4: Quality Gates y Despliegue CI/CD**
  - Ejecutar `vitest`, `harness-validator`, `preflight` y `sync-sdd`. Consolidar propuesta y publicar.
