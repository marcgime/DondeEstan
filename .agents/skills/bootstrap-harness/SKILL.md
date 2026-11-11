---
name: bootstrap-harness
description: Inicializa y personaliza todo el arnés de desarrollo asistido por IA para un nuevo proyecto a partir de documentación previa depositada en .ai-harness/input/, análisis del codebase o mediante asistencia del modelo de IA.
---

# Bootstrap Harness

Inicializa y personaliza todo el arnés de desarrollo asistido por IA para un nuevo proyecto a partir de documentación previa (`.ai-harness/input/`), análisis del codebase existente o asistencia directa del modelo de IA.

## Propósito

Transforma la plantilla neutra en un entorno gobernado de ingeniería adaptado al producto real, generando de forma atómica:
- Configuración estructural (`harness.config.yaml`).
- Orquestador de agentes estricto sin reglas de negocio (`AGENTS.md`).
- Presentación y setup del producto real (`README.md`).
- Exclusiones específicas del stack tecnológico (`.gitignore` y `.aiignore`).
- Los 12 documentos normativos de contexto en `.ai-harness/context/` (adaptados a GUI, Backend API o CLI).
- Scopes funcionales de escritura en `.ai-harness/scopes/` según los módulos del negocio real.
- Semilla de memoria preventiva en `.ai-harness/memory/failure_modes.md` y `ADR-0001` a `ADR-0003`.
- Sistema de diseño completo (6 documentos + `tokens.json`, solo si el producto incluye interfaz gráfica).
- Semilla canónica SDD (`CMP-00` a `CMP-03` y `PRC-01`).
- Skills documentadas en `.agents/skills/` y workflows en `.clinerules/workflows/`.

## Modos de Ejecución

### 1. Modo Asistido por IA (Recomendado para Agentes)
Cuando trabajas con un modelo de IA (Antigravity, Cline, Roo-Code):
1. Depositar el PRD, brief o arquitectura previa en `.ai-harness/input/` (o explicárselo a la IA en el chat).
2. El agente analiza el dominio, deduce los módulos reales (`scopes`), el stack y las políticas de persistencia/privacidad.
3. El agente redacta un manifiesto estructurado (`manifest.yaml`) sin valores hardcodeados ni sesgos.
4. El agente ejecuta:
   ```bash
   python .ai-harness/skills/bootstrap-harness/runner.py --manifest .ai-harness/input/manifest.yaml
   ```

### 2. Modo Interactivo por Consola
Para desarrolladores humanos respondiendo pregunta por pregunta en terminal:
```bash
python .ai-harness/skills/bootstrap-harness/runner.py --interactive
```

### 3. Modo Simulación (Dry-Run)
Prueba la generación sin escribir archivos en disco:
```bash
python .ai-harness/skills/bootstrap-harness/runner.py --interactive --dry-run
```

## Protocolo de Gobernanza

- No deja textos genéricos con etiquetas `<PROYECTO>` ni valores literales.
- Si el producto es un backend o CLI, no fuerza tokens de color ni navegación por D-Pad.
- Al concluir, el runner ejecuta automáticamente `harness-validator` para verificar que el arnés queda 100% en verde.
