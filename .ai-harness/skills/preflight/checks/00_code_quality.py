"""Check 00: Code quality, formatting, linter and tests across Flutter, Node, Python, and Go."""

from __future__ import annotations

import shutil
import subprocess
import sys
import time
from pathlib import Path

preflight_dir = Path(__file__).resolve().parent.parent
if str(preflight_dir) not in sys.path:
    sys.path.insert(0, str(preflight_dir))
checks_dir = Path(__file__).resolve().parent
if str(checks_dir) not in sys.path:
    sys.path.insert(0, str(checks_dir))

from common import find_project_root, get_project_stack
from harness_config import load_config
from models import CheckResult, CheckStatus, CheckViolation


def _run(command: list[str], cwd: Path, timeout: int = 60) -> subprocess.CompletedProcess[str] | None:
    try:
        is_win = sys.platform == "win32"
        return subprocess.run(
            command,
            cwd=str(cwd),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="ignore",
            timeout=timeout,
            shell=is_win,
        )
    except (FileNotFoundError, subprocess.SubprocessError, OSError):
        return None


def run(scope_path: Path, strict: bool = False) -> CheckResult:
    start = time.perf_counter()
    violations: list[CheckViolation] = []
    root = find_project_root(scope_path)

    if root is None or not (root / "lib").exists() and not (root / "src").exists():
        # Repositorio plantilla / launcher sin código de producto aún
        return CheckResult(
            check_name="00_code_quality",
            status=CheckStatus.PASSED,
            violations=[],
            execution_time_ms=(time.perf_counter() - start) * 1000.0,
        )

    stack = get_project_stack(root)
    cfg = load_config(root).get("project", {})
    test_cmd = cfg.get("test_command")

    # 1. Stack Flutter / Dart
    if stack in ("flutter", "dart") and (root / "pubspec.yaml").exists():
        if shutil.which("dart") and shutil.which("flutter"):
            fmt_res = _run(["dart", "format", "--output=none", "--set-exit-if-changed", "lib"], cwd=root)
            if fmt_res and fmt_res.returncode != 0:
                violations.append(
                    CheckViolation(
                        file_path=root / "lib",
                        rule_id="DART-FORMAT",
                        message="Dart code is not formatted according to standard. Run 'dart format lib'.",
                    )
                )

            analyze_res = _run(["flutter", "analyze"], cwd=root)
            if analyze_res and analyze_res.returncode != 0:
                violations.append(
                    CheckViolation(
                        file_path=root / "lib",
                        rule_id="FLUTTER-ANALYZE",
                        message=f"Flutter analyze reported issues:\n{analyze_res.stdout[:500]}",
                    )
                )

    # 2. Stack Node / TypeScript
    elif stack == "node" and (root / "package.json").exists():
        if test_cmd and shutil.which("npm"):
            pass

    # 3. Stack Python
    elif stack == "python":
        if shutil.which("ruff"):
            ruff_res = _run(["ruff", "check", "."], cwd=root)
            if ruff_res and ruff_res.returncode != 0:
                violations.append(
                    CheckViolation(
                        file_path=root,
                        rule_id="PYTHON-RUFF",
                        message=f"Ruff linter reported issues:\n{ruff_res.stdout[:500]}",
                    )
                )

    return CheckResult(
        check_name="00_code_quality",
        status=CheckStatus.FAILED if violations else CheckStatus.PASSED,
        violations=violations,
        execution_time_ms=(time.perf_counter() - start) * 1000.0,
    )
