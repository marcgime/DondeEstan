---
name: harness-validator
description: Valida contexto, scopes, memoria, SDD y skills del arnés de DondeEstan.
---

# Harness Validator

Puerta de enlace normativa del arnés. Previene derivas en la configuración, ausencia de documentos obligatorios o inconsistencias de especificaciones.

## Comandos

```bash
# Ejecución estándar (reporte legible)
python .ai-harness/skills/harness-validator/runner.py

# Modo estricto (advertencias tratadas como errores)
python .ai-harness/skills/harness-validator/runner.py --strict

# Salida estructurada para pipelines o agentes
python .ai-harness/skills/harness-validator/runner.py --json
```

## Checks y Verificaciones

1. **Contexto Normativo (`check_context.py`):** Verifica que los 12 documentos canónicos existan y contengan contenido sustantivo sin marcadores pendientes (`<PROYECTO>`).
2. **Scopes Modulares (`check_context.py`):** Asegura que cada `block_*.md` tenga rutas autorizadas y ninguna prohibida.
3. **Memoria Preventiva (`check_memory.py`):** Comprueba el número mínimo de modos de fallo y la presencia de ADRs requeridos.
4. **Especificaciones SDD (`check_sdd.py`):** Audita frontmatter obligatorio, presencia de `user_story.md`, trazabilidad `FR-*`/`ST-*` y mapa de implementación.
5. **Registro de Skills (`check_skills.py`):** Valida que toda skill listada en `registry.yaml` cuente con su runner y su archivo `SKILL.md`.

## Protocolo de resolución de fallos

- Si falla `SDD-MISSING-FRONTMATTER`: Completar los campos requeridos en la cabecera YAML de la spec.
- Si falla `SDD-MAP-MISSING-REQUIREMENT`: Incluir filas con `FR-NN` o `ST-NN` en la tabla del mapa de implementación §10.
- Si un check falla, **investigar la causa raíz** antes de reejecutar. Prohibido omitir validaciones.
