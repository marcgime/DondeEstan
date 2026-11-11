# Workflow — Consolidar Cambio OpenSpec (DondeEstan)

## Objetivo
Aplicar una propuesta aprobada sobre el módulo maestro y archivarla en `archive/`.

## Protocolo
1. Aplicar las modificaciones en `.ai-harness/sdd/modules/<modulo>.md`.
2. Ejecutar:
```bash
python .ai-harness/skills/consolidate-change/runner.py [change_id]
```
3. Implementar código y pruebas siguiendo `tasks.md`.
