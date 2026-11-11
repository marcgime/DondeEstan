"""Check 05: Forbidden dependencies across Flutter, Node, Python, and Go."""

from __future__ import annotations

import json
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

from common import find_project_root, get_project_stack, read_text
from harness_config import load_config
from models import CheckResult, CheckStatus, CheckViolation


def _declared_packages(root: Path) -> set[str]:
    packages: set[str] = set()

    # 1. Node (package.json)
    pkg_json_path = root / "package.json"
    if pkg_json_path.exists():
        try:
            data = json.loads(read_text(pkg_json_path))
            for sec in ("dependencies", "devDependencies", "peerDependencies"):
                if sec in data and isinstance(data[sec], dict):
                    packages.update(data[sec].keys())
        except Exception:
            pass

    # 2. Flutter (pubspec.yaml)
    pubspec_path = root / "pubspec.yaml"
    if pubspec_path.exists():
        content = read_text(pubspec_path)
        sections = ("dependencies:", "dev_dependencies:")
        in_section = False
        for raw_line in content.splitlines():
            line = raw_line.rstrip()
            if any(line.startswith(section) for section in sections):
                in_section = True
                continue
            if in_section and line and not line.startswith((" ", "\t")):
                in_section = False
            if not in_section or ":" not in line:
                continue
            key = line.split(":", 1)[0].strip()
            if re.fullmatch(r"[a-z0-9_]+", key):
                packages.add(key)

    # 3. Python (requirements.txt y pyproject.toml)
    req_path = root / "requirements.txt"
    if req_path.exists():
        for line in read_text(req_path).splitlines():
            line = line.strip()
            if line and not line.startswith("#"):
                pkg = re.split(r"[=<>!~;]", line)[0].strip()
                if pkg:
                    packages.add(pkg.lower())

    return packages


def run(scope_path: Path, strict: bool = False) -> CheckResult:
    start = time.perf_counter()
    violations: list[CheckViolation] = []
    root = find_project_root(scope_path)

    if root is None:
        return CheckResult(
            check_name="05_dependencies",
            status=CheckStatus.WARNING,
            violations=[
                CheckViolation(
                    file_path=scope_path,
                    rule_id="PROJECT-MISSING",
                    message="No project manifest found. Dependency checks were skipped.",
                )
            ],
            execution_time_ms=(time.perf_counter() - start) * 1000.0,
        )

    rules = load_config(root)["architecture"]
    forbidden = {str(p) for p in rules.get("forbidden_packages", []) or []}

    declared = _declared_packages(root)

    for package in declared:
        if package in forbidden:
            violations.append(
                CheckViolation(
                    file_path=root,
                    rule_id="FORBIDDEN-PACKAGE",
                    message=f"Forbidden dependency '{package}' declared in project manifests.",
                )
            )

    return CheckResult(
        check_name="05_dependencies",
        status=CheckStatus.FAILED if violations else CheckStatus.PASSED,
        violations=violations,
        execution_time_ms=(time.perf_counter() - start) * 1000.0,
    )
