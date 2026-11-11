"""Check 02: Immutability and error-handling hygiene across Flutter, Node, and Python."""

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
from models import CheckResult, CheckStatus, CheckViolation

VAR_FIELD = re.compile(r"^\s*var\s+[A-Za-z_]\w*\s*;", re.MULTILINE)
DYNAMIC = re.compile(r"\b(?:dynamic|any)\b")
EMPTY_CATCH = re.compile(r"catch\s*(?:\([^)]*\))?\s*\{\s*\}", re.DOTALL)
PRINT_LOG = re.compile(r"(?<![\w.])(?:print|console\.log)\s*\(")


def run(scope_path: Path, strict: bool = False) -> CheckResult:
    start = time.perf_counter()
    violations: list[CheckViolation] = []
    root = find_project_root(scope_path)

    if root is None:
        return CheckResult(
            check_name="02_contracts",
            status=CheckStatus.WARNING,
            violations=[
                CheckViolation(
                    file_path=scope_path,
                    rule_id="PROJECT-MISSING",
                    message="No project manifest found. Contract checks were skipped.",
                )
            ],
            execution_time_ms=(time.perf_counter() - start) * 1000.0,
        )

    for path in source_files(root):
        content = read_text(path)
        relative = path.relative_to(root).as_posix()

        # Chequear inmutabilidad en capas de datos y dominio
        if "/domain/" in relative or "/data/" in relative:
            for match in VAR_FIELD.finditer(content):
                line = content[: match.start()].count("\n") + 1
                violations.append(
                    CheckViolation(
                        file_path=path,
                        line=line,
                        rule_id="MUTABLE-FIELD",
                        message="Mutable field declaration in domain/data layer. Fields must be final / const.",
                    )
                )

            for match in DYNAMIC.finditer(content):
                line = content[: match.start()].count("\n") + 1
                violations.append(
                    CheckViolation(
                        file_path=path,
                        line=line,
                        rule_id="FORBIDDEN-DYNAMIC-ANY",
                        message="Forbidden 'dynamic' or 'any' type in domain/data contract. Use strict typed models.",
                    )
                )

        # Chequear print / console.log en código de producción
        if not path.name.endswith(("_test.dart", ".test.ts", ".spec.ts", "_test.py")):
            for match in PRINT_LOG.finditer(content):
                line = content[: match.start()].count("\n") + 1
                violations.append(
                    CheckViolation(
                        file_path=path,
                        line=line,
                        rule_id="RAW-PRINT-LOG",
                        message=f"Raw '{match.group(0).strip()}' found in production code. Use the centralized structured logger.",
                    )
                )

        # Chequear catch vacío
        for match in EMPTY_CATCH.finditer(content):
            line = content[: match.start()].count("\n") + 1
            violations.append(
                CheckViolation(
                    file_path=path,
                    line=line,
                    rule_id="EMPTY-CATCH",
                    message="Empty catch block hides failures silently. Log or rethrow with contextual Failure.",
                )
            )

    return CheckResult(
        check_name="02_contracts",
        status=CheckStatus.FAILED if violations else CheckStatus.PASSED,
        violations=violations,
        execution_time_ms=(time.perf_counter() - start) * 1000.0,
    )
