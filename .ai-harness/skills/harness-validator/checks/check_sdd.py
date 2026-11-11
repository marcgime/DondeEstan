"""Check SDD: Validación de la arquitectura OpenSpec (modules, changes, archive, templates)."""

import re
import time
from pathlib import Path

try:
    from harness_config import harness_dir_of, load_config
    from models import SubCheckResult, ValidationStatus, ValidationViolation
except ImportError:
    from .models import (  # type: ignore[no-redef]
        SubCheckResult,
        ValidationStatus,
        ValidationViolation,
    )

VALID_PROPOSAL_STATUSES = {
    "PROPOSED",
    "APPROVED",
    "IMPLEMENTING",
    "CONSOLIDATED",
}

REQUIRED_TEMPLATES = {
    "module.template.md",
    "proposal.template.md",
    "tasks.template.md",
}


def _frontmatter_value(content: str, key: str) -> str | None:
    match = re.search(rf"^{re.escape(key)}:\s*(.+)$", content, re.MULTILINE)
    if not match:
        return None
    return match.group(1).strip().strip("\"'")


def run(harness_root: Path, strict: bool = False, fix: bool = False) -> SubCheckResult:
    start_time = time.perf_counter()
    violations: list[ValidationViolation] = []

    config = load_config(harness_root)
    sdd_cfg = config.get("sdd", {})
    required_blocks = [str(name) for name in sdd_cfg.get("blocks", ["modules", "changes", "archive", "templates"])]
    map_heading = str(sdd_cfg.get("implementation_map_heading", "Mapa de implementación"))

    harness_dir = harness_dir_of(harness_root)
    sdd_dir = harness_dir / "sdd"
    workspace_root = harness_dir.parent

    if not sdd_dir.exists():
        violations.append(
            ValidationViolation(
                component="sdd",
                file_path=sdd_dir,
                rule_id="SDD-MISSING-ROOT",
                message="El directorio SDD '.ai-harness/sdd' no existe.",
                severity="ERROR",
            )
        )
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        return SubCheckResult(
            check_name="check_sdd",
            status=ValidationStatus.FAILED,
            violations=violations,
            execution_time_ms=elapsed_ms,
        )

    # 1. Verificar existencia de las carpetas canónicas OpenSpec
    for block_name in required_blocks:
        block_path = sdd_dir / block_name
        if not block_path.exists() or not block_path.is_dir():
            violations.append(
                ValidationViolation(
                    component="sdd",
                    file_path=block_path,
                    rule_id="SDD-MISSING-BLOCK-DIR",
                    message=f"Falta el directorio obligatorio de OpenSpec '{block_name}'.",
                    severity="ERROR",
                )
            )

    # 2. Verificar templates canónicos
    templates_dir = sdd_dir / "templates"
    if templates_dir.is_dir():
        for tmpl in REQUIRED_TEMPLATES:
            tmpl_path = templates_dir / tmpl
            if not tmpl_path.exists():
                violations.append(
                    ValidationViolation(
                        component="sdd",
                        file_path=tmpl_path,
                        rule_id="SDD-MISSING-TEMPLATE",
                        message=f"Falta la plantilla obligatoria '{tmpl}' en templates/.",
                        severity="ERROR",
                    )
                )

    # 3. Auditar módulos vivos en modules/
    modules_dir = sdd_dir / "modules"
    known_modules: set[str] = set()

    if modules_dir.is_dir():
        for mod_file in modules_dir.glob("*.md"):
            if mod_file.name in {"README.md", "INDEX.md"} or mod_file.name.startswith("."):
                continue

            content = mod_file.read_text(encoding="utf-8", errors="ignore")
            if not content.strip():
                violations.append(
                    ValidationViolation(
                        component="sdd",
                        file_path=mod_file,
                        rule_id="SDD-EMPTY-MODULE",
                        message=f"El módulo '{mod_file.name}' está vacío.",
                        severity="ERROR",
                    )
                )
                continue

            mod_id = _frontmatter_value(content, "module_id")
            if not mod_id:
                violations.append(
                    ValidationViolation(
                        component="sdd",
                        file_path=mod_file,
                        rule_id="SDD-MODULE-MISSING-ID",
                        message=f"El módulo '{mod_file.name}' no declara 'module_id' en su cabecera.",
                        severity="ERROR",
                    )
                )
            else:
                known_modules.add(mod_id)

            target_path_str = _frontmatter_value(content, "target_path")
            if target_path_str:
                target_p = workspace_root / target_path_str.strip().strip("\"'")
                # Si el módulo está activo, advertir si la ruta no existe
                if strict and not target_p.exists():
                    violations.append(
                        ValidationViolation(
                            component="sdd",
                            file_path=target_p,
                            rule_id="SDD-MODULE-TARGET-NOT-FOUND",
                            message=f"La ruta declarada '{target_path_str}' para el módulo '{mod_file.name}' no existe.",
                            severity="WARNING",
                        )
                    )

            if map_heading not in content:
                violations.append(
                    ValidationViolation(
                        component="sdd",
                        file_path=mod_file,
                        rule_id="SDD-MODULE-MISSING-MAP",
                        message=f"El módulo '{mod_file.name}' no contiene la sección obligatoria '{map_heading}'.",
                        severity="ERROR",
                    )
                )

    # 4. Auditar cambios activos en changes/
    changes_dir = sdd_dir / "changes"
    if changes_dir.is_dir():
        for change_folder in changes_dir.iterdir():
            if not change_folder.is_dir() or change_folder.name.startswith("."):
                continue

            proposal_file = change_folder / "proposal.md"
            tasks_file = change_folder / "tasks.md"

            if not proposal_file.exists():
                violations.append(
                    ValidationViolation(
                        component="sdd",
                        file_path=proposal_file,
                        rule_id="SDD-CHANGE-MISSING-PROPOSAL",
                        message=f"El cambio '{change_folder.name}' carece de 'proposal.md'.",
                        severity="ERROR",
                    )
                )
            else:
                prop_content = proposal_file.read_text(encoding="utf-8", errors="ignore")
                status = _frontmatter_value(prop_content, "status")
                if status and status not in VALID_PROPOSAL_STATUSES:
                    violations.append(
                        ValidationViolation(
                            component="sdd",
                            file_path=proposal_file,
                            rule_id="SDD-PROPOSAL-INVALID-STATUS",
                            message=f"Estado de propuesta '{status}' no válido. Permitidos: {', '.join(sorted(VALID_PROPOSAL_STATUSES))}.",
                            severity="ERROR",
                        )
                    )

            if not tasks_file.exists():
                violations.append(
                    ValidationViolation(
                        component="sdd",
                        file_path=tasks_file,
                        rule_id="SDD-CHANGE-MISSING-TASKS",
                        message=f"El cambio '{change_folder.name}' carece de 'tasks.md'.",
                        severity="ERROR",
                    )
                )

    has_error = any(v.severity == "ERROR" for v in violations)
    has_warning = any(v.severity == "WARNING" for v in violations)

    if has_error or (strict and has_warning):
        status = ValidationStatus.FAILED
    elif has_warning:
        status = ValidationStatus.WARNING
    else:
        status = ValidationStatus.PASSED

    elapsed_ms = (time.perf_counter() - start_time) * 1000.0
    return SubCheckResult(
        check_name="check_sdd",
        status=status,
        violations=violations,
        execution_time_ms=elapsed_ms,
    )
