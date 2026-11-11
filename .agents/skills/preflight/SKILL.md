---
name: preflight
description: Valida código TypeScript/Vite PWA + Tailwind CSS, fronteras de features, contratos, tokens y dependencias para DondeEstan.
---

# Preflight

Puerta de calidad del código de producción. Debe ejecutarse antes de declarar cualquier tarea terminada o realizar un commit.

## Comandos

```bash
# Verificación completa del repositorio
python .ai-harness/skills/preflight/runner.py

# Verificación acotada a un archivo o carpeta target
python .ai-harness/skills/preflight/runner.py [ruta/al/target]

# Modo estricto
python .ai-harness/skills/preflight/runner.py --strict
```

## Checks ejecutados

1. **00_code_quality:** Ejecución de linters y pruebas del stack (`npm test`).
2. **01_architecture:** Aislamiento de features; prohibido importar archivos privados de otra feature.
3. **02_contracts:** Inmutabilidad de modelos de dominio, prohibición de tipos `any`/`dynamic`, ausencia de logs de depuración (`console.log`/`print`) y prohibición de bloques `catch` vacíos.
4. **04_ui_tokens:** Cumplimiento del sistema de diseño; detección de colores HEX literales fuera de `design-system/tokens.json`.
5. **05_dependencies:** Detección de paquetes prohibidos (ninguno).
