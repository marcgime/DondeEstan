"""propose-change: inicializa una propuesta de cambio OpenSpec en .ai-harness/sdd/changes/."""

from __future__ import annotations

import argparse
import sys
from datetime import datetime
from pathlib import Path

current_dir = Path(__file__).resolve().parent
harness_dir = current_dir.parent.parent
workspace_root = harness_dir.parent


def main() -> None:
    parser = argparse.ArgumentParser(description="Inicializa una propuesta de cambio OpenSpec")
    parser.add_argument("slug", help="Slug descriptivo del cambio (ej. add-oauth-login)")
    parser.add_argument("--title", default="", help="Título legible del cambio")
    parser.add_argument("--module", default="MOD-core", help="ID del módulo afectado (ej. MOD-auth)")
    parser.add_argument(
        "--tier",
        choices=["fast_path", "standard", "core"],
        default="standard",
        help="Nivel de rigurosidad",
    )
    args = parser.parse_args()

    sdd_dir = harness_dir / "sdd"
    templates_dir = sdd_dir / "templates"
    changes_dir = sdd_dir / "changes"

    import re
    date_prefix = datetime.now().strftime("%Y-%m")
    clean_slug = re.sub(r"[^a-zA-Z0-9_-]", "-", args.slug.strip().lower()).strip("-")
    change_folder_name = f"{date_prefix}-{clean_slug}"
    target_change_dir = changes_dir / change_folder_name

    if target_change_dir.exists():
        print(f"Error: Ya existe la propuesta '{change_folder_name}' en changes/", file=sys.stderr)
        sys.exit(1)

    target_change_dir.mkdir(parents=True, exist_ok=True)

    # Leer templates
    proposal_template = (templates_dir / "proposal.template.md").read_text(encoding="utf-8")
    tasks_template = (templates_dir / "tasks.template.md").read_text(encoding="utf-8")

    title = args.title or clean_slug.replace("-", " ").capitalize()
    today_str = datetime.now().strftime("%Y-%m-%d")

    # Personalizar propuesta
    proposal_content = (
        proposal_template.replace("[Título Breve del Cambio]", title)
        .replace("[YYYY-MM]-[slug-del-cambio]", change_folder_name)
        .replace("[Título del cambio]", title)
        .replace("MOD-[slug]", args.module)
        .replace("YYYY-MM-DD", today_str)
        .replace("tier: standard", f"tier: {args.tier}")
    )

    # Personalizar tasks
    tasks_content = tasks_template.replace("[Título del Cambio]", title).replace(
        "[slug-del-cambio]", change_folder_name
    )

    (target_change_dir / "proposal.md").write_text(proposal_content, encoding="utf-8")
    (target_change_dir / "tasks.md").write_text(tasks_content, encoding="utf-8")

    print(f"Propuesta OpenSpec creada con éxito en:")
    print(f"  {target_change_dir.relative_to(workspace_root)}/")
    print(f"  - proposal.md (Delta de especificación)")
    print(f"  - tasks.md    (Checklist de implementación)")
    print(f"\nSiguiente paso: Completa el delta en proposal.md y revísalo con el desarrollador.")


if __name__ == "__main__":
    main()

