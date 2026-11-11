# Workflow — Publicación en Git (DondeEstan)

## Disparador
SOLICITUD EXPRESA DEL USUARIO para hacer push o publicar en NONE.

## Protocolo
1. Inspeccionar:
```bash
python .ai-harness/skills/git-publish/runner.py status
```
2. Publicar tras pasar puertas de enlace:
```bash
python .ai-harness/skills/git-publish/runner.py push -m "<tipo>: <descripcion del cambio>"
```
