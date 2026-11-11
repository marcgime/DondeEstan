# Cambios Activos (OpenSpec Changes)

Este directorio contiene las propuestas de cambio activas del proyecto.

## Ciclo de vida

1. **Creación:** Se inicializa mediante la skill `/propose-change` (`python .ai-harness/skills/propose-change/runner.py <slug>`).
2. **Estructura de cada carpeta de cambio:**
   - `proposal.md`: Justificación, contratos y especificación delta (`+`, `~`, `-`).
   - `tasks.md`: Lista de tareas pendientes y completadas (`- [ ]`, `- [x]`).
3. **Consolidación:** Una vez implementadas y verificadas todas las tareas, el cambio se consolida en el módulo correspondiente de `modules/` y se traslada a `archive/` mediante `/consolidate-change`.

