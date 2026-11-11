"""
Preflight Runner.

Validates Flutter/Dart code, feature boundaries, contracts, P2P invariants,
design tokens and dependencies. It never validates Python product code.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from pathlib import Path
from typing import Any

current_dir = Path(__file__).resolve().parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

skills_dir = current_dir.parent
if str(skills_dir) not in sys.path:
    sys.path.insert(0, str(skills_dir))

from harness_config import invariant_profile, load_config, require_dependencies

require_dependencies()

from models import CheckResult, CheckStatus, PreflightSummary

# (nombre, archivo, perfil que lo activa; None = siempre)
CHECK_CATALOG: list[tuple[str, str, str | None]] = [
    ("00_code_quality", "00_code_quality.py", None),
    ("01_architecture", "01_architecture.py", None),
    ("02_contracts", "02_contracts.py", None),
    ("03_streaming_invariants", "streaming_invariants.py", "streaming"),
    ("04_ui_tokens", "04_ui_tokens.py", None),
    ("05_dependencies", "05_dependencies.py", None),
]



def _load_check_module(filename: str, profile_check: bool = False) -> Any:
    checks_dir = current_dir / "checks"
    file_path = (checks_dir / "profiles" / filename) if profile_check else (checks_dir / filename)
    spec = importlib.util.spec_from_file_location(file_path.stem, file_path)
    if spec and spec.loader:
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    raise ImportError(f"Cannot load preflight check: {file_path}")


def _find_project_root(target: Path) -> Path | None:
    start = target if target.is_dir() else target.parent
    for candidate in (start, *start.parents):
        if (candidate / "pubspec.yaml").exists():
            return candidate
    return None


def _save_failure(project_root: Path, results: list[CheckResult]) -> None:
    failures = [r for r in results if r.status == CheckStatus.FAILED]
    if not failures:
        return

    memory_dir = project_root / ".ai-harness" / "memory" / "ephemeral_feedback"
    memory_dir.mkdir(parents=True, exist_ok=True)
    latest = memory_dir / "last_failure.md"

    for index in range(4, 0, -1):
        previous = memory_dir / f"last_failure_{index - 1}.md"
        if previous.exists():
            previous.replace(memory_dir / f"last_failure_{index}.md")
    if latest.exists():
        latest.replace(memory_dir / "last_failure_0.md")

    lines = ["# Preflight failure", ""]
    for result in failures:
        lines.append(f"## {result.check_name}")
        for violation in result.violations:
            location = (
                f"{violation.file_path}:{violation.line_number}"
                if violation.line_number
                else str(violation.file_path)
            )
            lines.append(f"- [{violation.rule_id}] {location} -> {violation.message}")
        lines.append("")
    latest.write_text("\n".join(lines), encoding="utf-8")


def _render_console(summary: PreflightSummary) -> str:
    lines = ["PREFLIGHT", "=" * 72]
    for result in summary.results:
        lines.append(f"[{result.status.value}] {result.check_name} ({result.execution_time_ms:.1f} ms)")
        for violation in result.violations:
            location = (
                f"{violation.file_path}:{violation.line_number}"
                if violation.line_number
                else str(violation.file_path)
            )
            lines.append(f"  - [{violation.rule_id}] {location} -> {violation.message}")
    lines.append("=" * 72)
    lines.append(
        f"Checks: {summary.total_checks} | "
        f"Result: {'PASSED' if summary.is_successful else 'FAILED'}"
    )
    return "\n".join(lines)


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    parser = argparse.ArgumentParser(description="Preflight: código, arquitectura y diseño")
    parser.add_argument("target", nargs="?", default=".", help="File or directory to validate")
    parser.add_argument("--scope", default=None, help="Alias for target")
    parser.add_argument("--strict", action="store_true", help="Treat warnings as failures")
    parser.add_argument("--json", action="store_true", help="Emit JSON summary")
    args = parser.parse_args()

    target = Path(args.scope or args.target).resolve()
    if not target.exists():
        print(f"Target does not exist: {target}", file=sys.stderr)
        sys.exit(1)

    project_root = _find_project_root(target) or target
    config = load_config(project_root)
    profile = invariant_profile(config)

    results: list[CheckResult] = []
    for _name, filename, required_profile in CHECK_CATALOG:
        if required_profile is not None and required_profile != profile:
            continue
        module = _load_check_module(filename, profile_check=required_profile is not None)
        results.append(module.run(target, strict=args.strict))

    has_failure = any(r.status == CheckStatus.FAILED for r in results)
    has_warning = any(r.status == CheckStatus.WARNING for r in results)
    is_successful = not has_failure and not (args.strict and has_warning)

    summary = PreflightSummary(
        total_checks=len(results),
        results=results,
        is_successful=is_successful,
    )

    _save_failure(project_root, results)

    if args.json:
        print(summary.to_json())
    else:
        print(_render_console(summary))

    sys.exit(0 if is_successful else 1)


if __name__ == "__main__":
    main()
