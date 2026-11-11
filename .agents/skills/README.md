# Inventario de Skills para Agentes — DondeEstan

Este directorio documenta el catálogo de capacidades y herramientas operativas para agentes de IA en `DondeEstan`.
Cada skill cuenta con su especificación canónica en `SKILL.md` y su runner ejecutable en `.ai-harness/skills/`:

| Skill | Finalidad | Comando principal |
|---|---|---|
| `harness-validator` | Valida integridad estructural, frontmatter, contexto y scopes | `python .ai-harness/skills/harness-validator/runner.py` |
| `preflight` | Valida código (TypeScript), arquitectura, inmutabilidad y tokens | `python .ai-harness/skills/preflight/runner.py` |
| `sync-sdd` | Comprueba paridad entre módulos OpenSpec, tareas activas y código real | `python .ai-harness/skills/sync-sdd/runner.py` |
| `propose-change` | Crea una propuesta de cambio aislada (delta OpenSpec) en changes/ | `python .ai-harness/skills/propose-change/runner.py` |
| `consolidate-change` | Aplica una propuesta aprobada sobre el módulo maestro y la archiva | `python .ai-harness/skills/consolidate-change/runner.py` |
| `launch-app` | Arranca la aplicación en el entorno configurado | `python .ai-harness/skills/launch-app/runner.py` |
| `git-publish` | Publicación gobernada en Git bajo demanda explícita | `python .ai-harness/skills/git-publish/runner.py` |
