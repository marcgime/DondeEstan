"""Configuración del arnés y comprobación de dependencias del tooling.

Este módulo es el único punto donde se resuelve la ruta de `harness.config.yaml`
y donde se declaran los valores por defecto. Ningún validador debe hardcodear
nombres de contexto, scopes, prefijos de spec ni listas de términos prohibidos.

Uso típico en un runner de skill:

    from harness_config import load_config, require_dependencies

    require_dependencies()          # antes de importar módulos con pydantic
    config = load_config(workspace_root)
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

CONFIG_FILENAME = "harness.config.yaml"

# Valores por defecto: permiten que un proyecto arranque con una configuración
# mínima sin romper los validadores. Lo que no esté aquí debe estar en el YAML.
DEFAULTS: dict[str, Any] = {
    "version": 1,
    "project": {"name": "<PROYECTO>", "slug": "<slug>", "stack": "generic"},
    "context": {"required": [], "agents_must_reference": []},
    "scopes": {
        "required": [],
        "path_roots": [],
        "forbidden_paths": [
            ".ai-harness/skills/",
            ".ai-harness/context/",
            ".github/",
            "harness.config.yaml",
        ],
    },
    "sdd": {
        "engine": "openspec",
        "paths": {
            "modules": ".ai-harness/sdd/modules",
            "changes": ".ai-harness/sdd/changes",
            "archive": ".ai-harness/sdd/archive",
            "templates": ".ai-harness/sdd/templates",
        },
        "blocks": ["modules", "changes", "archive", "templates"],
        "implementation_map_heading": "Mapa de implementación",
        "tiers": {
            "fast_path": {"enabled": True, "max_files_changed": 3, "require_tests": True},
            "standard": {"require_proposal": True, "require_tasks_complete": True},
            "core": {"require_proposal": True, "require_adr": True},
        },
    },
    "memory": {"failure_prefix": "FM", "min_failure_modes": 5},
    "skills": {"docs_root": ".agents/skills"},
    "architecture": {
        "features": [],
        "forbidden_by_feature": {},
        "exclusive_import_paths": {},
        "framework_import_prefix": "package:flutter/",
        "framework_free_features": [],
        "persistence_feature": "",
        "persistence_imports": [],
        "forbidden_packages": [],
    },
    "ui": {"token_feature": ""},
    "invariants": {
        "profile": "none",
        "streaming": {
            "endpoint": {"host": "", "port": 0, "path": ""},
            "producer_feature": "",
            "consumer_feature": "",
            "producer_forbidden_imports": [],
            "forbidden_tokens": {},
        },
    },
}


def harness_dir_of(root: Path) -> Path:
    """Devuelve la carpeta `.ai-harness` a partir de la raíz del workspace."""
    resolved = Path(root).resolve()
    return resolved if resolved.name == ".ai-harness" else resolved / ".ai-harness"


def workspace_of(root: Path) -> Path:
    """Devuelve la raíz del repositorio (padre de `.ai-harness`)."""
    return harness_dir_of(root).parent


def config_path(root: Path | None = None) -> Path:
    """Ruta del archivo de configuración del workspace."""
    workspace = workspace_of(root) if root is not None else _guess_workspace()
    return workspace / CONFIG_FILENAME


def _guess_workspace() -> Path:
    """Sube desde el cwd hasta encontrar `.ai-harness`."""
    for candidate in (Path.cwd(), *Path.cwd().parents):
        if (candidate / ".ai-harness").is_dir():
            return candidate
    return Path.cwd()


def _merge(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    """Fusión profunda: las claves del YAML sobrescriben los valores por defecto."""
    result = dict(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = _merge(result[key], value)
        else:
            result[key] = value
    return result


def load_config(root: Path | None = None) -> dict[str, Any]:
    """Carga `harness.config.yaml` fusionándolo con DEFAULTS.

    Lanza FileNotFoundError si el archivo no existe: un arnés sin configuración
    explícita no debe validarse en silencio.
    """
    require_dependencies()
    import yaml

    path = config_path(root)
    if not path.exists():
        raise FileNotFoundError(
            f"No se encontró '{CONFIG_FILENAME}' en {path.parent}. "
            "La configuración es obligatoria para validar el arnés."
        )

    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    if not isinstance(raw, dict):
        raise ValueError(f"'{CONFIG_FILENAME}' debe contener un mapa YAML en la raíz.")
    return _merge(DEFAULTS, raw)


def require_dependencies() -> None:
    """Verifica las dependencias de tooling con un mensaje accionable."""
    missing: list[str] = []
    try:  # noqa: SIM105 - import de sondeo, no de uso
        import pydantic  # noqa: F401
    except ImportError:
        missing.append("pydantic>=2.5")
    try:
        import yaml  # noqa: F401
    except ImportError:
        missing.append("PyYAML>=6.0")

    if missing:
        print(
            "Faltan dependencias del arnés: "
            + ", ".join(missing)
            + "\nInstálalas con:  python -m pip install -r requirements.txt",
            file=sys.stderr,
        )
        raise SystemExit(2)


def invariant_profile(config: dict[str, Any]) -> str:
    """Perfil de invariantes activo ('none' o 'streaming')."""
    return str(config.get("invariants", {}).get("profile", "none")).strip().lower()


def streaming_config(config: dict[str, Any]) -> dict[str, Any]:
    """Bloque de configuración del perfil streaming."""
    return dict(config.get("invariants", {}).get("streaming", {}) or {})
