"""Check Skills: registro de skills, manifiestos y documentación."""

from __future__ import annotations

import ast
import re
import time
from pathlib import Path
from typing import Any

try:
    from harness_config import harness_dir_of, load_config
    from models import SubCheckResult, ValidationStatus, ValidationViolation
except ImportError:
    from .models import SubCheckResult, ValidationStatus, ValidationViolation

REQUIRED_FILES = ["skill.yaml", "runner.py"]
REQUIRED_FIELDS = ["name", "version", "description", "command"]
IGNORED_DIRS = {"__pycache__", "checks"}


def _parse_yaml(content: str) -> dict[str, Any]:
    try:
        import yaml

        data = yaml.safe_load(content)
        if isinstance(data, dict):
            return data
    except Exception:
        pass
    data: dict[str, Any] = {}
    for line in content.splitlines():
        if ":" in line and not line.strip().startswith("#"):
            key, value = line.split(":", 1)
            data[key.strip()] = value.strip().strip("\"'")
    return data


def run(harness_root: Path, strict: bool = False, fix: bool = False) -> SubCheckResult:
    start = time.perf_counter()
    violations: list[ValidationViolation] = []

    harness_dir = harness_dir_of(harness_root)
    workspace = harness_dir.parent
    skills_dir = harness_dir / "skills"
    registry_path = skills_dir / "registry.yaml"
    docs_root = str(load_config(harness_root)["skills"].get("docs_root", ".agents/skills"))

    if not skills_dir.exists():
        return SubCheckResult(
            check_name="check_skills",
            status=ValidationStatus.FAILED,
            violations=[
                ValidationViolation(
                    component="skills",
                    file_path=skills_dir,
                    rule_id="SKILL-MISSING-ROOT",
                    message=".ai-harness/skills does not exist.",
                    severity="ERROR",
                )
            ],
            execution_time_ms=(time.perf_counter() - start) * 1000.0,
        )

    registered: set[str] = set()
    if not registry_path.exists():
        violations.append(
            ValidationViolation(
                component="skills",
                file_path=registry_path,
                rule_id="SKILL-MISSING-REGISTRY",
                message="skills/registry.yaml does not exist.",
                severity="ERROR",
            )
        )
    else:
        registry = _parse_yaml(registry_path.read_text(encoding="utf-8", errors="ignore"))
        for entry in registry.get("skills", []) or []:
            if isinstance(entry, dict) and entry.get("name"):
                registered.add(str(entry["name"]))

    skill_dirs = [
        d for d in skills_dir.iterdir() if d.is_dir() and d.name not in IGNORED_DIRS
    ]
    seen: set[str] = set()

    for skill_dir in skill_dirs:
        for filename in REQUIRED_FILES:
            path = skill_dir / filename
            if not path.exists():
                violations.append(
                    ValidationViolation(
                        component="skills",
                        file_path=path,
                        rule_id="SKILL-MISSING-FILE",
                        message=f"Skill '{skill_dir.name}' is missing {filename}.",
                        severity="ERROR",
                    )
                )

        manifest_path = skill_dir / "skill.yaml"
        name = skill_dir.name
        if manifest_path.exists():
            manifest = _parse_yaml(manifest_path.read_text(encoding="utf-8", errors="ignore"))
            missing = [field for field in REQUIRED_FIELDS if not manifest.get(field)]
            if missing:
                violations.append(
                    ValidationViolation(
                        component="skills",
                        file_path=manifest_path,
                        rule_id="SKILL-INVALID-MANIFEST",
                        message=f"Missing manifest fields: {', '.join(missing)}.",
                        severity="ERROR",
                    )
                )
            name = str(manifest.get("name") or skill_dir.name)
            if name in seen:
                violations.append(
                    ValidationViolation(
                        component="skills",
                        file_path=manifest_path,
                        rule_id="SKILL-DUPLICATE-NAME",
                        message=f"Duplicate skill name '{name}'.",
                        severity="ERROR",
                    )
                )
            seen.add(name)

            command = str(manifest.get("command") or "")
            for token in command.split():
                if token.endswith(".py"):
                    command_path = workspace / token
                    if not command_path.exists():
                        violations.append(
                            ValidationViolation(
                                component="skills",
                                file_path=manifest_path,
                                rule_id="SKILL-COMMAND-MISSING",
                                message=f"Command target does not exist: {token}.",
                                severity="ERROR",
                            )
                        )

        if name not in registered:
            violations.append(
                ValidationViolation(
                    component="skills",
                    file_path=skill_dir,
                    rule_id="SKILL-UNREGISTERED",
                    message=f"Skill '{name}' is not present in skills/registry.yaml.",
                    severity="ERROR",
                )
            )

        doc_path = workspace / docs_root / name / "SKILL.md"
        if not doc_path.exists():
            violations.append(
                ValidationViolation(
                    component="skills",
                    file_path=doc_path,
                    rule_id="SKILL-MISSING-DOC",
                    message=f"Documentation missing for skill '{name}'.",
                    severity="ERROR",
                )
            )
        else:
            doc_content = doc_path.read_text(encoding="utf-8", errors="ignore").strip()
            if not doc_content.startswith("---"):
                violations.append(
                    ValidationViolation(
                        component="skills",
                        file_path=doc_path,
                        rule_id="SKILL-DOC-NO-FRONTMATTER",
                        message=f"Documentation for '{name}' must start with '---' YAML frontmatter.",
                        severity="ERROR",
                    )
                )
            else:
                parts = doc_content.split("---", 2)
                if len(parts) < 3:
                    violations.append(
                        ValidationViolation(
                            component="skills",
                            file_path=doc_path,
                            rule_id="SKILL-DOC-INVALID-FRONTMATTER",
                            message=f"Documentation for '{name}' has unclosed YAML frontmatter.",
                            severity="ERROR",
                        )
                    )
                else:
                    fm = _parse_yaml(parts[1])
                    if not fm.get("name") or not fm.get("description"):
                        violations.append(
                            ValidationViolation(
                                component="skills",
                                file_path=doc_path,
                                rule_id="SKILL-DOC-MISSING-FIELDS",
                                message=f"Documentation frontmatter for '{name}' requires 'name' and 'description'.",
                                severity="ERROR",
                            )
                        )

        runner = skill_dir / "runner.py"
        if runner.exists():
            try:
                content = runner.read_text(encoding="utf-8", errors="ignore")
                tree = ast.parse(content)
                has_entry = any(
                    isinstance(node, ast.FunctionDef) and node.name == "main"
                    for node in ast.walk(tree)
                ) or bool(re.search(r'if\s+__name__\s*==\s*["\']__main__["\']\s*:', content))
                if not has_entry:
                    violations.append(
                        ValidationViolation(
                            component="skills",
                            file_path=runner,
                            rule_id="SKILL-RUNNER-NO-ENTRYPOINT",
                            message=f"Runner for '{name}' has no main() or __main__ entrypoint.",
                            severity="ERROR",
                        )
                    )
            except SyntaxError as exc:
                violations.append(
                    ValidationViolation(
                        component="skills",
                        file_path=runner,
                        rule_id="SKILL-RUNNER-SYNTAX",
                        message=f"Syntax error in runner: {exc}",
                        severity="ERROR",
                    )
                )

    for registered_name in sorted(registered - seen):
        violations.append(
            ValidationViolation(
                component="skills",
                file_path=registry_path,
                rule_id="SKILL-REGISTRY-ORPHAN",
                message=f"Registry entry '{registered_name}' has no skill directory.",
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
        check_name="check_skills",
        status=status,
        violations=violations,
        execution_time_ms=(time.perf_counter() - start) * 1000.0,
    )
