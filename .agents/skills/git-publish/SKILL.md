---
name: git-publish
description: Publica en Git (NONE) de forma segura y gobernada bajo demanda explícita.
---

# Git Publish

Publica los cambios en el repositorio remoto únicamente tras verificar que todas las puertas de enlace pasan limpias.

## Comandos

```bash
# Inspección de estado de repositorio
python .ai-harness/skills/git-publish/runner.py status

# Publicación formal protegida por puertas de calidad
python .ai-harness/skills/git-publish/runner.py push -m "<tipo>: <descripcion del cambio>"
```

## Reglas no negociables

1. **Bajo demanda:** Requiere instrucción expresa del usuario.
2. **Puertas previas:** Ejecuta internamente `harness-validator` y `preflight`. Si alguna falla, la publicación se aborta automáticamente sin modificar el repositorio remoto.
