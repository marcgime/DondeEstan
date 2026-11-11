"""Check Memory: modos de fallo y decisiones."""

from __future__ import annotations

import re
import time
from pathlib import Path

try:
    from harness_config import harness_dir_of, load_config
    from models import SubCheckResult, ValidationStatus, ValidationViolation
except ImportError:
    from .models import SubCheckResult, ValidationStatus, ValidationViolation



def run(harness_root: Path, strict: bool = False, fix: bool = False) -> SubCheckResult:
    start = time.perf_counter()
    violations: list[ValidationViolation] = []

    config = load_config(harness_root)
    failure_prefix = str(config["memory"].get("failure_prefix", "FM"))
    min_failure_modes = int(config["memory"].get("min_failure_modes", 5))
    legacy_terms = [str(term) for term in config.get("legacy_terms", []) or []]

    harness_dir = harness_dir_of(harness_root)
    memory_dir = harness_dir / "memory"
    failure_modes = memory_dir / "failure_modes.md"
    decisions = memory_dir / "decisions"
    ephemeral = memory_dir / "ephemeral_feedback"

    if not failure_modes.exists():
        violations.append(
            ValidationViolation(
                component="memory",
                file_path=failure_modes,
                rule_id="MEM-MISSING-FAILURE-MODES",
                message="failure_modes.md does not exist.",
                severity="ERROR",
            )
        )
    else:
        content = failure_modes.read_text(encoding="utf-8", errors="ignore")
        if len(content.strip()) < 200:
            violations.append(
                ValidationViolation(
                    component="memory",
                    file_path=failure_modes,
                    rule_id="MEM-INSUFFICIENT-CONTENT",
                    message="failure_modes.md is too short to be useful.",
                    severity="ERROR",
                )
            )
        mode_count = len(re.findall(rf"{re.escape(failure_prefix)}-\d{{3}}", content))
        if mode_count < min_failure_modes:
            violations.append(
                ValidationViolation(
                    component="memory",
                    file_path=failure_modes,
                    rule_id="MEM-INSUFFICIENT-FAILURE-MODES",
                    message=(
                        f"Expected at least {min_failure_modes} '{failure_prefix}-*' "
                        f"entries, found {mode_count}."
                    ),
                    severity="ERROR",
                )
            )
        found = [term for term in legacy_terms if term.lower() in content.lower()]
        if found:
            violations.append(
                ValidationViolation(
                    component="memory",
                    file_path=failure_modes,
                    rule_id="MEM-LEGACY-TERMS",
                    message=f"Legacy terms found: {', '.join(found)}.",
                    severity="ERROR",
                )
            )

    if not decisions.exists() or not (decisions / "README.md").exists():
        violations.append(
            ValidationViolation(
                component="memory",
                file_path=decisions,
                rule_id="MEM-MISSING-DECISIONS",
                message="memory/decisions/README.md does not exist.",
                severity="ERROR",
            )
        )

    if not ephemeral.exists():
        violations.append(
            ValidationViolation(
                component="memory",
                file_path=ephemeral,
                rule_id="MEM-MISSING-EPHEMERAL",
                message="memory/ephemeral_feedback/ does not exist.",
                severity="ERROR",
            )
        )

    has_error = any(v.severity == "ERROR" for v in violations)
    has_warning = any(v.severity == "WARNING" for v in violations)
    status = (
        ValidationStatus.FAILED
        if has_error or (strict and has_warning)
        else (ValidationStatus.WARNING if has_warning else ValidationStatus.PASSED)
    )

    return SubCheckResult(
        check_name="check_memory",
        status=status,
        violations=violations,
        execution_time_ms=(time.perf_counter() - start) * 1000.0,
    )
