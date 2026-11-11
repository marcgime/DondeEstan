"""Utilidades compartidas para los checks de preflight (multi-stack)."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Literal

StackType = Literal["flutter", "dart", "node", "python", "go", "unknown"]


def find_project_root(start: Path) -> Path | None:
    """Busca la raíz del proyecto localizando archivos de manifiesto o harness.config.yaml."""
    current = start.resolve()
    manifest_names = {
        "pubspec.yaml",
        "package.json",
        "pyproject.toml",
        "setup.py",
        "requirements.txt",
        "go.mod",
        "Cargo.toml",
        "harness.config.yaml",
    }
    for candidate in [current, *current.parents]:
        for name in manifest_names:
            if (candidate / name).exists():
                return candidate
    return None


def get_project_stack(root: Path) -> StackType:
    """Detecta el stack del proyecto según los archivos de manifiesto presentes."""
    if (root / "pubspec.yaml").exists():
        return "flutter"
    if (root / "package.json").exists():
        return "node"
    if (root / "pyproject.toml").exists() or (root / "requirements.txt").exists():
        return "python"
    if (root / "go.mod").exists():
        return "go"
    return "unknown"


def project_name(root: Path) -> str:
    """Devuelve el nombre del proyecto desde su manifiesto según el stack."""
    # 1. Flutter / Dart
    pubspec = root / "pubspec.yaml"
    if pubspec.exists():
        for line in read_text(pubspec).splitlines():
            stripped = line.strip()
            if stripped.startswith("name:"):
                return stripped.split("name:", 1)[1].strip()

    # 2. Node
    pkg = root / "package.json"
    if pkg.exists():
        match = re.search(r'"name"\s*:\s*"([^"]+)"', read_text(pkg))
        if match:
            return match.group(1).split("/")[-1]

    # 3. Python pyproject.toml
    pyproj = root / "pyproject.toml"
    if pyproj.exists():
        match = re.search(r'name\s*=\s*"([^"]+)"', read_text(pyproj))
        if match:
            return match.group(1)

    # 4. harness.config.yaml
    harness_cfg = root / "harness.config.yaml"
    if harness_cfg.exists():
        try:
            from harness_config import load_config
            cfg = load_config(root)
            return cfg.get("project", {}).get("slug", "project")
        except Exception:
            pass

    return "project"


def pubspec_name(root: Path) -> str:
    """Compatibilidad hacia atrás para checks que llamen pubspec_name."""
    return project_name(root)


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return ""


def source_files(root: Path, relative: str | None = None) -> list[Path]:
    """Devuelve archivos de código fuente según el stack del proyecto.
    
    Excluye estrictamente herramientas del arnés (.ai-harness, .agents, .clinerules)
    para no confundir el tooling de gobernanza con el código fuente del producto.
    """
    if relative:
        base = root / relative
        if not base.exists():
            return []
    else:
        found_code_dir = False
        for alt in ("lib", "src", "app"):
            candidate = root / alt
            if candidate.exists() and candidate.is_dir():
                base = candidate
                found_code_dir = True
                break
        if not found_code_dir:
            return []

    stack = get_project_stack(root)
    extensions: set[str]
    if stack in ("flutter", "dart"):
        extensions = {".dart"}
    elif stack == "node":
        extensions = {".ts", ".tsx", ".js", ".jsx"}
    elif stack == "python":
        extensions = {".py"}
    elif stack == "go":
        extensions = {".go"}
    else:
        extensions = {".dart", ".ts", ".tsx", ".js", ".jsx", ".py", ".go"}

    ignored_dirs = {
        ".dart_tool", "build", ".git", "node_modules", "dist",
        ".next", ".expo", ".venv", "venv", "__pycache__", ".pytest_cache",
        ".ai-harness", ".agents", ".clinerules", ".gemini", "tests", "test"
    }

    files: list[Path] = []
    for path in base.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in extensions:
            continue
        parts = set(path.parts)
        if ignored_dirs.intersection(parts):
            continue
        files.append(path)
    return sorted(files)


def dart_files(root: Path, relative: str | None = None) -> list[Path]:
    """Compatibilidad: llama a source_files."""
    return source_files(root, relative)


def feature_of(path: Path, root: Path) -> str | None:
    try:
        relative = path.relative_to(root).as_posix()
    except ValueError:
        return None
    # Soporta lib/features/<f>/, src/features/<f>/, features/<f>/, src/<f>/
    match = re.match(r"(?:lib|src|app)?/?features/([a-z0-9_]+)/", relative)
    if match:
        return match.group(1)
    match_direct = re.match(r"(?:lib|src|app)/([a-z0-9_]+)/", relative)
    if match_direct and match_direct.group(1) not in ("core", "app", "theme", "common", "utils"):
        return match_direct.group(1)
    return None


def import_paths(content: str) -> list[tuple[int, str]]:
    """Extrae rutas de import para Dart, TypeScript/JavaScript y Python."""
    imports: list[tuple[int, str]] = []

    # 1. Dart y JS/TS: import ... from 'path' o import 'path' o require('path')
    js_dart_pattern = re.compile(
        r"""(?:import\s+(?:[\w*\s{},]+\s+from\s+)?['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\))""",
        re.MULTILINE,
    )
    for match in js_dart_pattern.finditer(content):
        path = match.group(1) or match.group(2)
        if path:
            line = content[: match.start()].count("\n") + 1
            imports.append((line, path))

    # 2. Python: from path import ... o import path
    py_pattern = re.compile(
        r"""^\s*(?:from\s+([a-zA-Z0-9_\.]+)\s+import|import\s+([a-zA-Z0-9_\.]+))""",
        re.MULTILINE,
    )
    for match in py_pattern.finditer(content):
        mod = match.group(1) or match.group(2)
        if mod:
            line = content[: match.start()].count("\n") + 1
            imports.append((line, mod))

    return imports
