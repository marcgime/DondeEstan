# Skills del arnés

Este directorio contiene las skills ejecutables. La fuente de verdad del
inventario es `registry.yaml`.

## Inventario

| Skill | Función |
|---|---|
| `harness-validator` | Valida contexto, scopes, memoria, SDD y skills |
| `preflight` | Valida código, arquitectura, contratos, tokens y dependencias |
| `sync-sdd` | Audita módulos vivos y tareas OpenSpec |
| `propose-change` | Crea una propuesta de cambio (delta OpenSpec) |
| `consolidate-change` | Consolida y archiva un cambio aprobado |
| `launch-app` | Arranca la app (stack Flutter) |
| `git-publish` | Publica en Git bajo demanda explícita |

## Reglas

- Cada skill tiene `skill.yaml`, runner, documentación en `.agents/skills/<name>/SKILL.md` y entrada en `registry.yaml`.
- No se duplican runners ni manifiestos en dos árboles.
- Una skill que no esté en el registro no se considera disponible.
- Los comandos se ejecutan desde la raíz del repositorio.
- Todas las skills comparten `harness_config.py` para leer `harness.config.yaml`.
- No se añaden skills que dependan de servicios externos no declarados.

## Configuración compartida

`harness_config.py` es la única puerta de entrada a la configuración:

- resuelve la ruta de `harness.config.yaml`;
- aplica valores por defecto;
- comprueba las dependencias de `requirements.txt` con un mensaje accionable.

Un check nuevo debe leer sus listas de ahí, nunca hardcodearlas.

## Documentación

La documentación de uso de cada skill está en `.agents/skills/`. Este README
solo indexa; no duplica manuales.
