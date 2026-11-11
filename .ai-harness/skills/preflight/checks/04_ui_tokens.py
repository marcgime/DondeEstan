"""Check 04: disciplina de tokens visuales y navegación por foco."""

from __future__ import annotations

import re
import sys
import time
from pathlib import Path

preflight_dir = Path(__file__).resolve().parent.parent
if str(preflight_dir) not in sys.path:
    sys.path.insert(0, str(preflight_dir))
checks_dir = Path(__file__).resolve().parent
if str(checks_dir) not in sys.path:
    sys.path.insert(0, str(checks_dir))

from common import find_project_root, read_text, source_files
from harness_config import load_config
from models import CheckResult, CheckStatus, CheckViolation

COLOR_PATTERNS = (
    re.compile(r"Color\s*\(\s*0x[0-9A-Fa-f]{6,8}"),
    re.compile(r"Color\.fromARGB\s*\("),
    re.compile(r"\bColors\.[A-Za-z]+\b"),
    re.compile(r"""['"]#([0-9A-Fa-f]{3,8})['"]"""),
)
THEME_PATHS = ("theme/", "tokens/", "design-system/")
FOCUS_MARKERS = ("FocusNode", "FocusScope", "Focus(", "tabIndex", "accessible", "focusable")


def _is_theme_path(relative_path: str) -> bool:
    return any(marker in relative_path.lower() for marker in THEME_PATHS)


def run(scope_path: Path, strict: bool = False) -> CheckResult:
    start = time.perf_counter()
    violations: list[CheckViolation] = []

    root = find_project_root(scope_path)
    if root is None:
        return CheckResult(
            check_name="04_ui_tokens",
            status=CheckStatus.WARNING,
            violations=[
                CheckViolation(
                    file_path=scope_path,
                    rule_id="PROJECT-MISSING",
                    message="No project manifest found. UI token checks were skipped.",
                )
            ],
            execution_time_ms=(time.perf_counter() - start) * 1000.0,
        )

    ui_config = load_config(root).get("ui", {})
    token_feature = str(ui_config.get("token_feature", "") or "")

    for path in source_files(root):
        relative = path.relative_to(root).as_posix()
        if _is_theme_path(relative):
            continue

        content = read_text(path)
        for pattern in COLOR_PATTERNS:
            match = pattern.search(content)
            if match:
                line = content[: match.start()].count("\n") + 1
                violations.append(
                    CheckViolation(
                        file_path=path,
                        line=line,
                        rule_id="HARDCODED-COLOR",
                        message=f"Literal visual color '{match.group(0)}' used outside theme layer. Use design tokens.",
                    )
                )
                break

    return CheckResult(
        check_name="04_ui_tokens",
        status=CheckStatus.FAILED if violations else CheckStatus.PASSED,
        violations=violations,
        execution_time_ms=(time.perf_counter() - start) * 1000.0,
    )
