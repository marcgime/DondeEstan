"""Skills & Workflows Generator: Generador completo del ecosistema de skills.

Produce:
1. Replicación del motor ejecutor de skills (.ai-harness/skills/) en el proyecto destino
2. .ai-harness/skills/registry.yaml y README.md
3. .agents/skills/ (README.md y SKILL.md de alta fidelidad para cada una de las 7 skills)
4. .clinerules/ (rules.md y workflows/*.md para invocación con /)
"""

from __future__ import annotations

import shutil
from pathlib import Path
from models import BootstrapManifest, GitProvider, StackType


class SkillsGenerator:
    """Genera artefactos de documentación y orquestación de skills para agentes."""

    def __init__(self, manifest: BootstrapManifest) -> None:
        self.m = manifest

    def generate_agents_skills(self) -> dict[str, str]:
        """Devuelve diccionario relativo a .agents/skills/ con contenido."""
        m = self.m
        out: dict[str, str] = {}
        root_path = m.scopes[0].path_roots[0] if m.scopes and m.scopes[0].path_roots else "lib/"

        # 1. README general de .agents/skills/
        out["README.md"] = f"""# Inventario de Skills para Agentes — {m.identity.name}

Este directorio documenta el catálogo de capacidades y herramientas operativas para agentes de IA en `{m.identity.name}`.
Cada skill cuenta con su especificación canónica en `SKILL.md` y su runner ejecutable en `.ai-harness/skills/`:

| Skill | Finalidad | Comando principal |
|---|---|---|
| `harness-validator` | Valida integridad estructural, frontmatter, contexto y scopes | `python .ai-harness/skills/harness-validator/runner.py` |
| `preflight` | Valida código ({m.stack.language}), arquitectura, inmutabilidad y tokens | `python .ai-harness/skills/preflight/runner.py` |
| `sync-sdd` | Comprueba paridad entre módulos OpenSpec, tareas activas y código real | `python .ai-harness/skills/sync-sdd/runner.py` |
| `propose-change` | Crea una propuesta de cambio aislada (delta OpenSpec) en changes/ | `python .ai-harness/skills/propose-change/runner.py` |
| `consolidate-change` | Aplica una propuesta aprobada sobre el módulo maestro y la archiva | `python .ai-harness/skills/consolidate-change/runner.py` |
| `launch-app` | Arranca la aplicación en el entorno configurado | `python .ai-harness/skills/launch-app/runner.py` |
| `git-publish` | Publicación gobernada en Git bajo demanda explícita | `python .ai-harness/skills/git-publish/runner.py` |
"""

        # 2. harness-validator/SKILL.md
        out["harness-validator/SKILL.md"] = f"""---
name: harness-validator
description: Valida contexto, scopes, memoria, SDD y skills del arnés de {m.identity.name}.
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
"""

        # 3. preflight/SKILL.md
        forbidden_str = ", ".join(m.architecture.forbidden_packages) if m.architecture.forbidden_packages else "ninguno"
        out["preflight/SKILL.md"] = f"""---
name: preflight
description: Valida código {m.stack.language}/{m.stack.framework}, fronteras de features, contratos, tokens y dependencias para {m.identity.name}.
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

1. **00_code_quality:** Ejecución de linters y pruebas del stack (`{m.stack.test_command}`).
2. **01_architecture:** Aislamiento de features; prohibido importar archivos privados de otra feature.
3. **02_contracts:** Inmutabilidad de modelos de dominio, prohibición de tipos `any`/`dynamic`, ausencia de logs de depuración (`console.log`/`print`) y prohibición de bloques `catch` vacíos.
4. **04_ui_tokens:** Cumplimiento del sistema de diseño; detección de colores HEX literales fuera de `design-system/tokens.json`.
5. **05_dependencies:** Detección de paquetes prohibidos ({forbidden_str}).
"""

        # 4. sync-sdd/SKILL.md
        out["sync-sdd/SKILL.md"] = f"""---
name: sync-sdd
description: Comprueba la sincronización entre especificaciones SDD (.spec.md) y código fuente real en disco para {m.identity.name}.
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
"""

        # 5. propose-change/SKILL.md
        out["propose-change/SKILL.md"] = f"""---
name: propose-change
description: Crea una propuesta de cambio aislada (delta OpenSpec) en .ai-harness/sdd/changes/ para {m.identity.name}.
---

# Propose Change

Inicia una nueva propuesta de cambio según la metodología OpenSpec para su revisión en 2 minutos antes de codificar.

## Comandos

```bash
python .ai-harness/skills/propose-change/runner.py <slug> --module <MOD-id> --title "<Título del cambio>"
```
"""

        # 6. consolidate-change/SKILL.md
        out["consolidate-change/SKILL.md"] = f"""---
name: consolidate-change
description: Consolida y archiva una propuesta OpenSpec aprobada en .ai-harness/sdd/archive/ para {m.identity.name}.
---

# Consolidate Change

Aplica los deltas aprobados en el módulo maestro y mueve la propuesta a la memoria histórica `archive/`.

## Comandos

```bash
python .ai-harness/skills/consolidate-change/runner.py [change_id]
```
"""

        # 7. launch-app/SKILL.md
        out["launch-app/SKILL.md"] = f"""---
name: launch-app
description: Arranca el entorno y la aplicación {m.identity.name} localmente.
---

# Launch App

Ejecuta el entorno de la aplicación según el stack configurado (`{m.stack.language}` / `{m.stack.framework}`).

## Comandos

```bash
python .ai-harness/skills/launch-app/runner.py
```

Comando subyacente ejecutado: `{m.stack.launch_command}`.
"""

        # 8. git-publish/SKILL.md
        out["git-publish/SKILL.md"] = f"""---
name: git-publish
description: Publica en Git ({m.git_remote.provider.value.upper()}) de forma segura y gobernada bajo demanda explícita.
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
"""
        return out

    def generate_clinerules(self) -> dict[str, str]:
        res = {"rules.md": self.generate_clinerules_rules()}
        res.update(self.generate_clinerules_workflows())
        return res

    def generate_clinerules_rules(self) -> str:
        m = self.m
        return f"""# Reglas de Integración del Agente con el Arnés — {m.identity.name}

## 1. Autoridad y Jerarquía
`AGENTS.md` es el enrutador maestro del repositorio. El agente no puede contradecir, relajar ni ignorar las reglas de `context/` ni de los scopes activos.

## 2. Modus Operandi
1. **Carga JIT:** Antes de inspeccionar código o proponer cambios, cargar en orden los documentos de `AGENTS.md` §1.
2. **Límites de Escritura:** Localizar el scope correspondiente en `.ai-harness/scopes/` y escribir exclusivamente en sus rutas autorizadas.
3. **OpenSpec-First:** Prohibido escribir código de nuevas features sin propuesta en `changes/` consolidada en el módulo maestro. Para hotfixes, aplicar Fast-Path (<3 archivos).
4. **Cero Invención:** Si falta un dato o requerimiento, registrarlo como pregunta abierta y detenerse.

## 3. Despacho de Workflows
Los comandos disponibles se invocan con barra inclinada (`/`) a través de `.clinerules/workflows/`:
- `/list-skills.md`: Inventario de herramientas y skills operativas.
- `/propose-change.md`: Propuesta de cambio aislada (delta OpenSpec).
- `/consolidate-change.md`: Consolidación y archivo de propuesta aprobada.
- `/harness-validator.md`: Verificación de integridad normativa.
- `/preflight.md`: Puerta de calidad de código y arquitectura.
- `/sync-sdd.md`: Auditoría de módulos vivos y tareas en curso.
- `/launch-app.md`: Arranque de la aplicación.
- `/git-publish.md`: Publicación segura en Git (solo bajo demanda).

## 4. Resolución Autónoma de Problemas
- Si un test o validador falla, leer la traza de error antes de editar a ciegas.
- Prohibido silenciar excepciones o usar `--no-verify`.
- Corregir la causa raíz del fallo y revalidar las puertas de enlace.
"""

    def generate_clinerules_workflows(self) -> dict[str, str]:
        m = self.m
        out: dict[str, str] = {}

        out["workflows/harness-validator.md"] = f"""# Workflow — Validación del Arnés ({m.identity.name})

## Objetivo
Verificar la integridad estructural y coherencia normativa del arnés.

## Protocolo
1. Ejecutar el validador:
```bash
python .ai-harness/skills/harness-validator/runner.py
```
2. Si existen fallos (`ERROR`), corregir la spec o archivo señalado antes de continuar.
"""

        out["workflows/preflight.md"] = f"""# Workflow — Preflight de Calidad ({m.identity.name})

## Objetivo
Validar código, arquitectura, inmutabilidad y respeto a tokens antes de un commit.

## Protocolo
1. Ejecutar preflight:
```bash
python .ai-harness/skills/preflight/runner.py
```
2. Resolver cualquier infracción de linters, tests o violación de tokens.
"""

        out["workflows/sync-sdd.md"] = f"""# Workflow — Sincronización SDD ({m.identity.name})

## Objetivo
Comprobar paridad entre specs aprobadas y el código en disco.

## Protocolo
1. Ejecutar:
```bash
python .ai-harness/skills/sync-sdd/runner.py
```
2. Tras completar una implementación aprobada, fijar la línea base:
```bash
python .ai-harness/skills/sync-sdd/runner.py --baseline
```
"""

        out["workflows/propose-change.md"] = f"""# Workflow — Proponer Cambio OpenSpec ({m.identity.name})

## Objetivo
Crear una propuesta de cambio aislada (delta) en `changes/` para su revisión rápida antes de codificar.

## Protocolo
1. Ejecutar:
```bash
python .ai-harness/skills/propose-change/runner.py <slug> --module <MOD-id> --title "<Título>"
```
2. Completar el delta conceptual en `proposal.md` y las tareas en `tasks.md`.
3. Revisar con el desarrollador humano.
"""

        out["workflows/consolidate-change.md"] = f"""# Workflow — Consolidar Cambio OpenSpec ({m.identity.name})

## Objetivo
Aplicar una propuesta aprobada sobre el módulo maestro y archivarla en `archive/`.

## Protocolo
1. Aplicar las modificaciones en `.ai-harness/sdd/modules/<modulo>.md`.
2. Ejecutar:
```bash
python .ai-harness/skills/consolidate-change/runner.py [change_id]
```
3. Implementar código y pruebas siguiendo `tasks.md`.
"""

        out["workflows/launch-app.md"] = f"""# Workflow — Arranque de la Aplicación ({m.identity.name})

## Protocolo
Ejecutar el comando de arranque local:
```bash
python .ai-harness/skills/launch-app/runner.py
```
"""

        out["workflows/git-publish.md"] = f"""# Workflow — Publicación en Git ({m.identity.name})

## Disparador
SOLICITUD EXPRESA DEL USUARIO para hacer push o publicar en {m.git_remote.provider.value.upper()}.

## Protocolo
1. Inspeccionar:
```bash
python .ai-harness/skills/git-publish/runner.py status
```
2. Publicar tras pasar puertas de enlace:
```bash
python .ai-harness/skills/git-publish/runner.py push -m "<tipo>: <descripcion del cambio>"
```
"""

        out["workflows/list-skills.md"] = f"""# Workflow — Inventario de Skills ({m.identity.name})

## Protocolo
1. Leer `.ai-harness/skills/registry.yaml`.
2. Presentar la lista de herramientas operativas del repositorio.
"""
        return out

    def generate_registry_yaml(self) -> str:
        m = self.m
        skills_root = Path(__file__).resolve().parent.parent.parent
        bootstrap_entry = ""
        if (skills_root / "bootstrap-harness").exists():
            bootstrap_entry = """
  - name: bootstrap-harness
    status: active
    command: python .ai-harness/skills/bootstrap-harness/runner.py
    doc: .agents/skills/bootstrap-harness/SKILL.md
    description: Inicializa y personaliza todo el arnés de desarrollo asistido por IA para un nuevo proyecto.
"""
        return f"""version: 1
skills:{bootstrap_entry}
  - name: harness-validator
    status: active
    command: python .ai-harness/skills/harness-validator/runner.py
    doc: .agents/skills/harness-validator/SKILL.md
    description: Valida la estructura y coherencia del arnés normativo.

  - name: preflight
    status: active
    command: python .ai-harness/skills/preflight/runner.py
    doc: .agents/skills/preflight/SKILL.md
    description: Valida código ({m.stack.language}), arquitectura, contratos y tokens.

  - name: sync-sdd
    status: active
    command: python .ai-harness/skills/sync-sdd/runner.py
    doc: .agents/skills/sync-sdd/SKILL.md
    description: Audita la sincronización entre módulos OpenSpec, tareas activas y código en disco.

  - name: propose-change
    status: active
    command: python .ai-harness/skills/propose-change/runner.py
    doc: .agents/skills/propose-change/SKILL.md
    description: Crea una propuesta de cambio aislada (delta OpenSpec) en changes/ para su revisión rápida.

  - name: consolidate-change
    status: active
    command: python .ai-harness/skills/consolidate-change/runner.py
    doc: .agents/skills/consolidate-change/SKILL.md
    description: Aplica una propuesta aprobada sobre el módulo maestro y la archiva en archive/.

  - name: launch-app
    status: active
    command: python .ai-harness/skills/launch-app/runner.py
    doc: .agents/skills/launch-app/SKILL.md
    description: Arranca la aplicación ({m.stack.launch_command}).

  - name: git-publish
    status: active
    command: python .ai-harness/skills/git-publish/runner.py
    doc: .agents/skills/git-publish/SKILL.md
    description: Publica en Git ({m.git_remote.provider.value.upper()}) bajo demanda explícita.
"""
