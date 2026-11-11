# Workflow — Sincronización SDD (DondeEstan)

## Objetivo
Comprobar paridad entre specs aprobadas y el código en disco.

## Protocolo
1. Ejecutar:
```bash
python .ai-harness/skills/sync-sdd/runner.py
```
2. Tras completar una implementación aprobada, fijar la línea base:
```bash
python .ai-harness/skills/sync-sdd/runner.py --baseline
```
