"""
Bootstrap Harness Skill Runner.
Punto de entrada CLI para la inicialización y personalización gobernada del arnés.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

harness_dir = Path(__file__).resolve().parents[2]
skills_dir = Path(__file__).resolve().parent.parent
current_skill_dir = Path(__file__).resolve().parent

for p in (str(current_skill_dir), str(skills_dir)):
    if p not in sys.path:
        sys.path.insert(0, p)

from harness_config import require_dependencies, workspace_of

require_dependencies()

import yaml
from generator import HarnessGenerator
from input_scanner import InputScanner
from models import BootstrapManifest
from prompter import Prompter


def _run_validator(workspace_root: Path) -> bool:
    val_script = harness_dir / "skills" / "harness-validator" / "runner.py"
    if not val_script.exists():
        return True

    print("\n\033[1m[Bootstrap] Verificando integridad del arnés recién generado...\033[0m")
    res = subprocess.run([sys.executable, str(val_script)], cwd=workspace_root, capture_output=True, text=True)
    if res.returncode != 0:
        print("\033[91m[ERROR] La validación de integridad del arnés falló:\033[0m\n" + res.stdout)
        return False
    print(res.stdout)
    return True


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Bootstrap Harness — Inicializador y personalizador asistido del arnés"
    )
    parser.add_argument(
        "--interactive",
        action="store_true",
        default=True,
        help="Ejecuta la entrevista interactiva guiada (por defecto)",
    )
    parser.add_argument(
        "--input-dir",
        default=str(harness_dir / "input"),
        help="Directorio de documentación previa a analizar",
    )
    parser.add_argument(
        "--manifest",
        help="Ruta a un archivo YAML con el manifiesto completo del producto",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simula la generación sin modificar archivos en el disco",
    )
    parser.add_argument(
        "--no-validate",
        action="store_true",
        help="No ejecuta harness-validator al finalizar",
    )

    args = parser.parse_args()
    workspace_root = workspace_of(harness_dir)

    manifest: BootstrapManifest

    if args.manifest:
        manifest_path = Path(args.manifest)
        if not manifest_path.exists():
            print(f"\033[91m[ERROR] El archivo de manifiesto no existe: {manifest_path}\033[0m")
            sys.exit(1)
        raw_data = yaml.safe_load(manifest_path.read_text(encoding="utf-8", errors="ignore"))
        manifest = BootstrapManifest.model_validate(raw_data)
    else:
        input_p = Path(args.input_dir)
        auto_manifest = input_p / "manifest.yaml"
        if not auto_manifest.exists():
            auto_manifest = input_p / "manifest.yml"

        if auto_manifest.exists():
            print(f"\033[1m[Bootstrap] Manifiesto estructurado detectado en '{auto_manifest.name}'. Cargando...\033[0m")
            raw_data = yaml.safe_load(auto_manifest.read_text(encoding="utf-8", errors="ignore"))
            manifest = BootstrapManifest.model_validate(raw_data)
        else:
            scanner = InputScanner(input_p)
            digest = scanner.scan()
            prompter = Prompter(digest)
            manifest = prompter.collect()

    print(f"\n\033[1m[Bootstrap] Generando arnés para '{manifest.identity.name}'...\033[0m")
    if args.dry_run:
        print("\033[33m[MODO SIMULACIÓN --dry-run ACTIVO: no se escribirá en disco]\033[0m")

    generator = HarnessGenerator(manifest, workspace_root, dry_run=args.dry_run)
    files = generator.execute()

    print(f"\033[92m[ÉXITO] Se generaron/planificaron {len(files)} artefactos:\033[0m")
    for f in files:
        print(f"  - {f}")

    if not args.dry_run and not args.no_validate:
        valid = _run_validator(workspace_root)
        if not valid:
            sys.exit(1)

    print("\n\033[1;32m¡Arnés configurado y verificado con éxito!\033[0m")
    print(f"Proyecto: \033[1m{manifest.identity.name}\033[0m ({manifest.stack.language} / {manifest.stack.framework})")
    print("Siguiente paso recomendado: Revisar .ai-harness/context/ y la primera spec CMP-00.")


if __name__ == "__main__":
    main()

