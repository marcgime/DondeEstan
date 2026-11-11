"""Check Context: integridad del contexto normativo, los scopes y el enrutador.

Los nombres de archivo, las rutas autorizadas, las rutas prohibidas y los
términos heredados se leen de `harness.config.yaml`. Este check no conoce
ningún proyecto concreto: aplica el contrato declarado en la configuración.
"""

from __future__ import annotations

import re
import time
from pathlib import Path

try:
    from harness_config import harness_dir_of, load_config
    from models import SubCheckResult, ValidationStatus, ValidationViolation
except ImportError:
    from .models import SubCheckResult, ValidationStatus, ValidationViolation

PENDING_MARKERS = re.compile(r"\b(TODO|TBD|FIXME)\b")
MIN_CONTENT_CHARS = 200


def _check_file(
    path: Path,
    component: str,
    violations: list[ValidationViolation],
    *,
    legacy_terms: list[str],
) -> str | None:
    """Valida existencia, contenido mínimo, marcadores y términos heredados."""
    if not path.exists():
        violations.append(
            ValidationViolation(
                component=component,
                file_path=path,
                rule_id=f"{component.upper()}-MISSING-FILE",
                message=f"Mandatory file '{path.name}' does not exist.",
                severity="ERROR",
            )
        )
        return None

    try:
        content = path.read_text(encoding="utf-8", errors="ignore")
    except (OSError, ValueError) as exc:
        violations.append(
            ValidationViolation(
                component=component,
                file_path=path,
                rule_id=f"{component.upper()}-READ-ERROR",
                message=f"Failed to read file: {exc}",
                severity="ERROR",
            )
        )
        return None

    if len(content.strip()) < MIN_CONTENT_CHARS:
        violations.append(
            ValidationViolation(
                component=component,
                file_path=path,
                rule_id=f"{component.upper()}-INSUFFICIENT-CONTENT",
                message=(
                    "File is under the minimum content threshold "
                    f"({MIN_CONTENT_CHARS} chars)."
                ),
                severity="ERROR",
            )
        )

    markers = sorted({m.group(0) for m in PENDING_MARKERS.finditer(content)})
    if markers:
        violations.append(
            ValidationViolation(
                component=component,
                file_path=path,
                rule_id=f"{component.upper()}-PENDING-MARKERS",
                message=f"Pending markers found: {', '.join(markers)}.",
                severity="ERROR",
            )
        )

    lowered = content.lower()
    found = [term for term in legacy_terms if term and term.lower() in lowered]
    if found:
        violations.append(
            ValidationViolation(
                component=component,
                file_path=path,
                rule_id=f"{component.upper()}-LEGACY-TERMS",
                message=f"Legacy project terms found: {', '.join(found)}.",
                severity="ERROR",
            )
        )

    return content

def run(harness_root: Path, strict: bool = False, fix: bool = False) -> SubCheckResult:
    start = time.perf_counter()
    violations: list[ValidationViolation] = []

    config = load_config(harness_root)
    legacy_terms = [str(term) for term in config.get("legacy_terms", []) or []]
    path_roots = [str(root) for root in config["scopes"].get("path_roots", [])]
    forbidden_paths = [str(p) for p in config["scopes"].get("forbidden_paths", [])]
    agents_references = [
        str(name) for name in config["context"].get("agents_must_reference", [])
    ]

    harness_dir = harness_dir_of(harness_root)
    workspace = harness_dir.parent
    context_dir = harness_dir / "context"
    scopes_dir = harness_dir / "scopes"

    for filename in config["context"].get("required", []):
        _check_file(
            context_dir / str(filename),
            "context",
            violations,
            legacy_terms=legacy_terms,
        )

    for filename in config["scopes"].get("required", []):
        path = scopes_dir / str(filename)
        content = _check_file(path, "scope", violations, legacy_terms=legacy_terms)
        if content is None:
            continue

        for forbidden in forbidden_paths:
            if forbidden and forbidden in content:
                violations.append(
                    ValidationViolation(
                        component="scope",
                        file_path=path,
                        rule_id="SCOPE-FORBIDDEN-PATH",
                        message=(
                            f"Scope references a forbidden path '{forbidden}'. "
                            f"Use one of: {', '.join(path_roots)}."
                        ),
                        severity="ERROR",
                    )
                )

        if path_roots and not any(root in content for root in path_roots):
            violations.append(
                ValidationViolation(
                    component="scope",
                    file_path=path,
                    rule_id="SCOPE-MISSING-AUTHORIZED-PATH",
                    message=(
                        "Scope must declare an authorized path under: "
                        f"{', '.join(path_roots)}."
                    ),
                    severity="ERROR",
                )
            )

    agents = workspace / "AGENTS.md"
    agents_content = _check_file(
        agents, "agents", violations, legacy_terms=legacy_terms
    )
    if agents_content is not None:
        for required in agents_references:
            if required not in agents_content:
                violations.append(
                    ValidationViolation(
                        component="agents",
                        file_path=agents,
                        rule_id="AGENTS-MISSING-REFERENCE",
                        message=f"AGENTS.md must reference {required}.",
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
        check_name="check_context",
        status=status,
        violations=violations,
        execution_time_ms=(time.perf_counter() - start) * 1000.0,
    )

