# Workflow — Preflight de Calidad (DondeEstan)

## Objetivo
Validar código, arquitectura, inmutabilidad y respeto a tokens antes de un commit.

## Protocolo
1. Ejecutar preflight:
```bash
python .ai-harness/skills/preflight/runner.py
```
2. Resolver cualquier infracción de linters, tests o violación de tokens.
