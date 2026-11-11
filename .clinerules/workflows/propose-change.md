# Workflow — Proponer Cambio OpenSpec (DondeEstan)

## Objetivo
Crear una propuesta de cambio aislada (delta) en `changes/` para su revisión rápida antes de codificar.

## Protocolo
1. Ejecutar:
```bash
python .ai-harness/skills/propose-change/runner.py <slug> --module <MOD-id> --title "<Título>"
```
2. Completar el delta conceptual en `proposal.md` y las tareas en `tasks.md`.
3. Revisar con el desarrollador humano.
