"""sync-sdd: audita el estado de sincronización de módulos vivos y propuestas OpenSpec."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

current_dir = Path(__file__).resolve().parent
harness_dir = current_dir.parent.parent
workspace_root = harness_dir.parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

skills_dir = current_dir.parent
if str(skills_dir) not in sys.path:
    sys.path.insert(0, str(skills_dir))

from harness_config import require_dependencies

require_dependencies()

from models import SddSyncItem, SddSyncReport

STATE_PATH = harness_dir / "memory" / "sync-state.json"


def _value(content: str, key: str) -> str | None:
    match = re.search(rf"^{re.escape(key)}:\s*(.+)$", content, re.MULTILINE)
    if not match:
        return None
    return match.group(1).strip().strip("\"'")


def _hash_file(path: Path) -> str:
    if not path.exists():
        return ""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _load_state() -> dict:
    if not STATE_PATH.exists():
        return {"version": 2, "modules": {}}
    try:
        state = json.loads(STATE_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"version": 2, "modules": {}}
    if not isinstance(state, dict):
        return {"version": 2, "modules": {}}
    return state


def _save_state(state: dict) -> None:
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(
        json.dumps(state, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def count_tasks(tasks_content: str) -> tuple[int, int]:
    """Devuelve (pendientes, completadas)."""
    pending = len(re.findall(r"-\s*\[\s*\]", tasks_content))
    completed = len(re.findall(r"-\s*\[[xX]\]", tasks_content))
    return pending, completed


def main() -> None:
    parser = argparse.ArgumentParser(description="OpenSpec SDD sync auditor")
    parser.add_argument("--json", action="store_true", help="Emitir informe JSON")
    parser.add_argument(
        "--baseline",
        action="store_true",
        help="Registrar hashes actuales de módulos como línea base",
    )
    parser.add_argument(
        "--tier",
        choices=["fast", "standard", "core"],
        default="standard",
        help="Nivel de rigurosidad del cambio",
    )
    args = parser.parse_args()

    sdd_dir = harness_dir / "sdd"
    modules_dir = sdd_dir / "modules"
    changes_dir = sdd_dir / "changes"

    previous_state = _load_state()
    next_state = {"version": 2, "modules": dict(previous_state.get("modules", {}))}

    items: list[SddSyncItem] = []

    # 1. Auditar Módulos Vivos en modules/
    if modules_dir.is_dir():
        for mod_path in sorted(modules_dir.glob("*.md")):
            if mod_path.name in {"README.md", "INDEX.md"} or mod_path.name.startswith("."):
                continue

            content = mod_path.read_text(encoding="utf-8", errors="ignore")
            mod_id = _value(content, "module_id") or mod_path.stem
            target_str = _value(content, "target_path") or ""
            version = _value(content, "version") or "1.0.0"

            target_path = workspace_root / target_str if target_str else None
            has_target = target_path.exists() if target_path else False

            mod_hash = _hash_file(mod_path)
            target_hash = _hash_file(target_path) if (has_target and target_path.is_file()) else ""
            prev = previous_state.get("modules", {}).get(mod_id)

            if not target_str:
                state = "N/A"
                details = "Módulo sin target_path declarado"
            elif not has_target:
                state = "MISSING"
                details = f"El target '{target_str}' no existe en disco"
            elif args.baseline or prev is None:
                state = "PRESENT"
                details = "Línea base registrada" if args.baseline else "Target existe sin línea base previa"
            elif prev.get("mod_hash") != mod_hash:
                state = "DIVERGED"
                details = "El módulo ha cambiado desde la última línea base"
            else:
                state = "PRESENT"
                details = "Módulo sincronizado con código y línea base"

            if state == "PRESENT" or args.baseline:
                next_state["modules"][mod_id] = {
                    "mod_hash": mod_hash,
                    "target_hash": target_hash,
                    "version": version,
                    "recorded_at": datetime.now(timezone.utc).isoformat(),
                }

            items.append(
                SddSyncItem(
                    item_type="module",
                    item_id=mod_id,
                    path=str(mod_path.relative_to(workspace_root)),
                    target=target_str,
                    status="ACTIVE",
                    sync_state=state,
                    details=details,
                )
            )

    # 2. Auditar Cambios Activos en changes/
    if changes_dir.is_dir():
        for change_dir in sorted(changes_dir.iterdir()):
            if not change_dir.is_dir() or change_dir.name.startswith("."):
                continue

            prop_path = change_dir / "proposal.md"
            tasks_path = change_dir / "tasks.md"

            status = "PROPOSED"
            if prop_path.exists():
                prop_content = prop_path.read_text(encoding="utf-8", errors="ignore")
                status = _value(prop_content, "status") or "PROPOSED"

            pending, completed = 0, 0
            if tasks_path.exists():
                tasks_content = tasks_path.read_text(encoding="utf-8", errors="ignore")
                pending, completed = count_tasks(tasks_content)

            if pending > 0:
                state = "PENDING_TASKS"
                details = f"{pending} tareas pendientes ([ ]), {completed} completadas"
            elif completed > 0 and pending == 0:
                state = "READY_TO_CONSOLIDATE"
                details = f"Todas las tareas ({completed}) completadas. Listo para /consolidate-change"
            else:
                state = "N/A"
                details = "Sin tareas ejecutables registradas"

            items.append(
                SddSyncItem(
                    item_type="change",
                    item_id=change_dir.name,
                    path=str(change_dir.relative_to(workspace_root)),
                    status=status,
                    sync_state=state,
                    details=details,
                    pending_tasks=pending,
                    completed_tasks=completed,
                )
            )

    _save_state(next_state)

    total_modules = sum(1 for i in items if i.item_type == "module")
    total_changes = sum(1 for i in items if i.item_type == "change")
    present_cnt = sum(1 for i in items if i.sync_state == "PRESENT")
    pending_cnt = sum(1 for i in items if i.sync_state == "PENDING_TASKS")
    diverged_cnt = sum(1 for i in items if i.sync_state == "DIVERGED")

    # Si hay tareas pendientes en standard/core, o divergencias, no es exitoso
    is_success = diverged_cnt == 0
    if args.tier != "fast" and any(i.sync_state == "PENDING_TASKS" and i.status == "IMPLEMENTING" for i in items):
        is_success = False

    report = SddSyncReport(
        total_modules=total_modules,
        total_changes=total_changes,
        present=present_cnt,
        pending=pending_cnt,
        diverged=diverged_cnt,
        items=items,
        is_successful=is_success,
    )

    if args.json:
        print(report.model_dump_json(indent=2))
    else:
        print("OPENSPEC SDD SYNC REPORT")
        print("=" * 72)
        for item in items:
            prefix = "[MOD]" if item.item_type == "module" else "[CHG]"
            print(f"{prefix} [{item.sync_state}] {item.item_id}")
            if item.details:
                print(f"      {item.details}")
        print("=" * 72)
        print(
            f"Módulos: {total_modules} | Cambios activos: {total_changes} | "
            f"Sincronizados: {present_cnt} | Pendientes: {pending_cnt} | Divergencias: {diverged_cnt}"
        )

    sys.exit(0 if report.is_successful else 1)


if __name__ == "__main__":
    main()
