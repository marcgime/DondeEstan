# Convención de Especificaciones SDD (Arquitectura OpenSpec)

Este directorio define el estándar para la evolución de especificaciones en el arnés.
El sistema sigue el paradigma **Delta-First**:
1. **`modules/`:** La verdad viva consolidada (una spec por módulo o capacidad).
2. **`changes/`:** Propuestas activas de cambio (*deltas* aislados y revisables en 2 minutos).
3. **`archive/`:** Histórico inmutable de cambios implementados y consolidados.

---

## 1. Plantillas Canónicas

| Plantilla | Propósito | Destino al instanciarse |
|---|---|---|
| `module.template.md` | Especificación viva de una capacidad o módulo completo | `.ai-harness/sdd/modules/<slug>.md` |
| `proposal.template.md` | Propuesta de cambio aislada (delta) | `.ai-harness/sdd/changes/<id>/proposal.md` |
| `tasks.template.md` | Checklist de tareas técnicas | `.ai-harness/sdd/changes/<id>/tasks.md` |

---

## 2. Ciclo de Vida de un Cambio

1. **Propuesta (`changes/<id>/`):** El agente o desarrollador crea una propuesta con `proposal.md` y `tasks.md`.
2. **Revisión Humana:** Se valida el delta conceptual sin ruido de código.
3. **Consolidación:** Se aplican las modificaciones en `modules/<modulo>.md` y la propuesta pasa a `archive/<id>/`.
4. **Implementación:** Se programa el código y los tests guiándose por `tasks.md`.
5. **Auditoría:** `sync-sdd` y `preflight` validan que no quedan tareas pendientes ni deriva de contratos.
