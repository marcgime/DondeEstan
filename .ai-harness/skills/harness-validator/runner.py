"""
CLI Orchestrator for Harness Validator Skill.
"""

import argparse
import importlib.util
import sys
from pathlib import Path
from typing import Any

current_dir = Path(__file__).resolve().parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

harness_root = current_dir.parent.parent.parent
if str(harness_root) not in sys.path:
    sys.path.insert(0, str(harness_root))
skills_dir = current_dir.parent
if str(skills_dir) not in sys.path:
    sys.path.insert(0, str(skills_dir))

from harness_config import require_dependencies

require_dependencies()



from models import (
    HarnessValidationReport,
    SubCheckResult,
    ValidationStatus,
)


def _load_check_module(module_filename: str) -> Any:
    file_path = current_dir / "checks" / module_filename
    mod_name = file_path.stem
    spec = importlib.util.spec_from_file_location(mod_name, file_path)
    if spec and spec.loader:
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod
    raise ImportError(f"Failed to load harness check module: {file_path}")


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    parser = argparse.ArgumentParser(description="Harness Infrastructure Validator CLI")
    parser.add_argument(
        "--scope",
        type=str,
        default=".",
        help="Target workspace root path (default: '.')",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output consolidation report in raw JSON format",
    )
    parser.add_argument(
        "--fix",
        action="store_true",
        help="Apply safe automatic fixes to repair minor infrastructure gaps",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Enforce strict mode (warnings cause validation failure)",
    )

    args = parser.parse_args()
    target_root = Path(args.scope).resolve()

    # Carga dinámica de los checks del arnés
    check_context = _load_check_module("check_context.py")
    check_memory = _load_check_module("check_memory.py")
    check_sdd = _load_check_module("check_sdd.py")
    check_skills = _load_check_module("check_skills.py")

    checks_to_run = [
        ("check_context", check_context),
        ("check_memory", check_memory),
        ("check_sdd", check_sdd),
        ("check_skills", check_skills),
    ]

    results: list[SubCheckResult] = []
    passed_count = 0
    failed_count = 0

    for _name, mod in checks_to_run:
        res: SubCheckResult = mod.run(target_root, strict=args.strict, fix=args.fix)
        results.append(res)

        if res.status == ValidationStatus.PASSED:
            passed_count += 1
        elif res.status == ValidationStatus.FAILED or (
            args.strict and res.status == ValidationStatus.WARNING
        ):
            failed_count += 1
        elif res.status == ValidationStatus.WARNING:
            passed_count += 1

    is_valid = failed_count == 0

    report = HarnessValidationReport(
        total_checks=len(results),
        passed_checks=passed_count,
        failed_checks=failed_count,
        results=results,
        is_valid=is_valid,
    )

    if args.json:
        print(report.to_json())
    else:
        print(report.to_terminal())

    sys.exit(0 if is_valid else 1)


if __name__ == "__main__":
    main()
