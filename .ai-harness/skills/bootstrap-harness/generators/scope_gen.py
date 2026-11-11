"""
Template-Driven Scope Generator: Genera archivos de scope (.ai-harness/scopes/block_*.md)
utilizando las plantillas canónicas de scopes como estructura y abstrayendo responsabilidades
según las features reales detectadas del negocio.
"""

from __future__ import annotations

from pathlib import Path
from models import BootstrapManifest, ScopeDefinition, StackType


class ScopeGenerator:
    """Genera archivos de scope a partir de los bloques reales definidos en el manifiesto."""

    def __init__(self, manifest: BootstrapManifest, harness_dir: Path | None = None) -> None:
        self.manifest = manifest
        self.harness_dir = Path(harness_dir).resolve() if harness_dir else Path(__file__).resolve().parents[3]
        self.scopes_dir = self.harness_dir / "scopes"

    def generate_scope(self, scope: ScopeDefinition) -> str:
        m = self.manifest
        raw_path = scope.path_roots[0] if scope.path_roots else f"src/{scope.name}"
        clean_path = raw_path.rstrip("/")
        is_flutter = m.stack.stack_type in (StackType.FLUTTER, StackType.DART)
        is_python = m.stack.stack_type == StackType.PYTHON
        is_node = m.stack.stack_type == StackType.NODE
        folder_prefix = "lib" if is_flutter else "src"

        # Inferencia de tipo de módulo para estructura y responsabilidades coherentes
        lower_name = scope.name.lower()
        lower_desc = (scope.description or "").lower()

        is_ui_scope = lower_name in ("ui", "dashboard", "presentation") or any(w in lower_desc for w in ("visual", "interfaz", "pantalla", "componentes"))
        is_daemon = any(w in lower_name or w in lower_desc for w in ("orchestrator", "daemon", "fsm", "scheduler", "cfo"))
        is_sensor = any(w in lower_name or w in lower_desc for w in ("discovery", "sensor", "scraper", "crawler", "mining"))
        is_sandbox = any(w in lower_name or w in lower_desc for w in ("factory", "build", "sandbox", "qa", "compilador"))
        is_distribution = any(w in lower_name or w in lower_desc for w in ("distribution", "growth", "marketing", "seo", "cro"))

        # Estructura interna adaptada a la naturaleza del bloque o a las capas arquitectónicas
        if is_ui_scope:
            structure = f"""{clean_path}/
├── components/      # Componentes visuales atómicos reutilizables (DS-*)
├── views/           # Páginas y vistas principales
└── theme/           # Integración y mapeo de tokens (tokens.json)"""
            owned_responsibility = f"Componentes de presentación, interfaces web y vistas de {scope.title}."
        elif is_daemon:
            structure = f"""{clean_path}/
├── engine/          # Máquina de estados finitos (FSM) y eventos
├── scheduler/       # Programación de ciclos y colas de tareas
└── cfo/             # Control de balance presupuestario y reglas de corte"""
            owned_responsibility = f"Motor de orquestación, gestión de estados y control de ciclos de {scope.title}."
        elif is_sensor:
            structure = f"""{clean_path}/
├── sensors/         # Clientes de recolección de señales y scraping
├── scoring/         # Algoritmos deterministas de puntuación y ranking
└── models/          # Modelos inmutables de candidatos y contratos"""
            owned_responsibility = f"Rastreo, recolección de datos y algoritmos de scoring de {scope.title}."
        elif is_sandbox:
            structure = f"""{clean_path}/
├── pipeline/        # Generador y compilador de código
├── sandbox/         # Entorno aislado para testing y validación estática
└── packager/        # Empaquetado y artefactos listos para despliegue"""
            owned_responsibility = f"Generación autónoma, ejecución en sandbox y verificación de {scope.title}."
        elif is_distribution:
            structure = f"""{clean_path}/
├── channels/        # Adaptadores para directorios y plataformas externas
├── seo/             # Sitemaps dinámicos y esquemas estructurados
└── cro/             # Monitoreo de conversión y bucle de optimización"""
            owned_responsibility = f"Distribución automatizada, escucha social ética y SEO de {scope.title}."
        elif m.architecture.layers:
            layer_lines = "\n".join([f"├── {l}/" + (" " * max(1, 14 - len(l))) + f"# Capa de {l}" for l in m.architecture.layers[:-1]])
            last_l = m.architecture.layers[-1]
            layer_lines += f"\n└── {last_l}/" + (" " * max(1, 14 - len(last_l))) + f"# Capa de {last_l}"
            structure = f"{clean_path}/\n{layer_lines}"
            owned_responsibility = f"Lógica de dominio, servicios e interfaces de {scope.title} organizadas según {m.architecture.style}."
        else:
            structure = f"""{clean_path}/
├── domain/          # Entidades puras y reglas de negocio
├── services/        # Lógica de aplicación y casos de uso
└── contracts/       # Interfaces públicas y DTOs serializables"""
            owned_responsibility = f"Lógica de negocio, servicios y contratos de dominio de {scope.title}."

        # Identificación del archivo de punto de entrada público
        if is_python:
            public_api = f"`{clean_path}/__init__.py` o `{clean_path}/public/`"
        elif is_node:
            public_api = f"`{clean_path}/index.ts` o `{clean_path}/public/`"
        elif is_flutter:
            public_api = f"`{clean_path}.dart` o `{clean_path}/public/`"
        else:
            public_api = f"`{clean_path}/` (interfaces exportadas)"

        # Formatear lista de rutas prohibidas
        forbidden_list = ", ".join([f"`{p}`" for p in scope.forbidden_paths]) if scope.forbidden_paths else "`Ninguna de otros bloques privados`"

        if scope.name == "core":
            not_owned_items = f"""- Reglas de negocio privadas de las features funcionales.
- Componentes visuales o interfaces gráficas de usuario.
- Modificación directa de archivos del arnés o de pipelines de CI."""
        else:
            not_owned_items = f"""- Infraestructura transversal compartida (vive en `{folder_prefix}/core/`).
- Entidades, contratos o datos pertenecientes a otras features.
- Configuración global o ciclo de vida transversal de la aplicación.
- Modificación directa de archivos del arnés o de pipelines de CI."""

        return f"""# Scope — {scope.title} (`block_{scope.name}`)

> Solo define límites y fronteras de responsabilidad. Contratos, esquemas e implementación se especifican en la SDD.

---

## 1. Identidad

| Campo | Valor |
|---|---|
| Bloque | {scope.title} |
| Dominio | {scope.description} |
| Ruta autorizada | `{clean_path}/` |
| Rutas prohibidas | {forbidden_list} |
| Formatos | Tipos nativos inmutables / JSON serializado |
| Estado | Límites estrictos y cerrados |

---

## 2. Propósito y Valor del Bloque

Es la autoridad responsable de **{scope.description}** dentro de {m.identity.name}.
Garantiza el aislamiento funcional del módulo, encapsulando sus estructuras internas y exponiendo únicamente interfaces públicas.

---

## 3. Posee (Responsabilidades exclusivas)

- Modelos de datos, reglas de negocio e invariantes específicos de {scope.title}.
- Implementación interna y adaptadores necesarios para cumplir su función.
- {owned_responsibility}

---

## 4. No posee (Límites y exclusiones estrictas)

{not_owned_items}

---

## 5. Estructura interna de rutas

```
{structure}
```

---

## 6. API Pública y Matriz de Dependencias

- **API Pública autorizada:** {public_api}.
- **Dependencias entrantes:** Solo módulos que consuman la interfaz pública documentada.
- **Prohibido:** Importar archivos de carpetas internas privadas de otro bloque.
"""
