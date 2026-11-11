"""consolidate-change: consolida una propuesta OpenSpec aprobada, archivándola en archive/."""

from __future__ import annotations

import argparse
import re
import shutil
import sys
from datetime import datetime
from pathlib import Path

current_dir = Path(__file__).resolve().parent
harness_dir = current_dir.parent.parent
workspace_root = harness_dir.parent


def main() -> None:
    parser = argparse.ArgumentParser(description="Consolida y archiva una propuesta OpenSpec")
    parser.add_argument("change_id", nargs="?", default="", help="Nombre de la carpeta en changes/ (ej. 2026-11-add-oauth)")
    args = parser.parse_args()

    sdd_dir = harness_dir / "sdd"
    changes_dir = sdd_dir / "changes"
    archive_dir = sdd_dir / "archive"

    archive_dir.mkdir(parents=True, exist_ok=True)

    target_change = None
    if args.change_id:
        clean_id = Path(args.change_id).name
        candidate = changes_dir / clean_id
        if candidate.is_dir():
            target_change = candidate
    else:
        # Si no se indica, buscar la primera propuesta disponible
        folders = [f for f in changes_dir.iterdir() if f.is_dir() and not f.name.startswith(".")]
        if len(folders) == 1:
            target_change = folders[0]
        elif len(folders) > 1:
            print("Hay múltiples propuestas activas. Especifica cuál consolidar:", file=sys.stderr)
            for f in folders:
                print(f"  - {f.name}", file=sys.stderr)
            sys.exit(1)

    if not target_change or not target_change.exists():
        print(f"No se encontró ninguna propuesta activa en '{changes_dir}'.", file=sys.stderr)
        sys.exit(1)

    proposal_path = target_change / "proposal.md"
    if proposal_path.exists():
        content = proposal_path.read_text(encoding="utf-8")
        # Actualizar status a CONSOLIDATED
        updated = re.sub(r"^status:\s*.+$", "status: CONSOLIDATED", content, flags=re.MULTILINE)
        today = datetime.now().strftime("%Y-%m-%d")
        if "consolidated_at:" not in updated:
            updated = re.sub(r"^(status:\s*CONSOLIDATED)$", f"\\1\nconsolidated_at: \"{today}\"", updated, flags=re.MULTILINE)
        proposal_path.write_text(updated, encoding="utf-8")

    dest_folder = archive_dir / target_change.name
    if dest_folder.exists():
        print(f"Aviso: La carpeta '{dest_folder.name}' ya existía en archive/. Se sobrescribe.", file=sys.stderr)
        shutil.rmtree(dest_folder)

    shutil.move(str(target_change), str(dest_folder))

    print(f"Propuesta consolidada y archivada con éxito:")
    print(f"  Origen:  .ai-harness/sdd/changes/{target_change.name}")
    print(f"  Destino: .ai-harness/sdd/archive/{target_change.name}")
    print(f"\nEl estado es ahora CONSOLIDATED. Puedes proceder a implementar las tareas de código.")


if __name__ == "__main__":
    main()

