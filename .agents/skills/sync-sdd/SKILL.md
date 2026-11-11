---
name: sync-sdd
description: Comprueba la sincronización entre especificaciones SDD (.spec.md) y código fuente real en disco para DondeEstan.
---

# Sync SDD

Verifica que cada spec aprobada tiene su archivo de código destino (`target`) correspondiente y detecta divergencias mediante hashes criptográficos.

## Comandos

```bash
# Comprobación de estado general
python .ai-harness/skills/sync-sdd/runner.py

# Actualizar la línea base tras implementar cambios en una spec aprobada
python .ai-harness/skills/sync-sdd/runner.py --baseline
```

## Estados de alineación

- **PRESENT:** La spec y su implementación están alineadas con la línea base.
- **MISSING:** La spec está aprobada pero el archivo de destino en disco no existe.
- **DIVERGED:** El archivo de código ha cambiado respecto a la última baseline registrada.
- **N/A:** Specs en borrador (`DRAFT`) que aún no exigen código de producción.
