"""
Pydantic V2 Data Models for Harness Validator Skill.
"""

import json
from enum import StrEnum
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ValidationStatus(StrEnum):
    PASSED = "PASSED"
    FAILED = "FAILED"
    WARNING = "WARNING"


class ValidationViolation(BaseModel):
    model_config = ConfigDict(frozen=True)

    component: str
    file_path: Path
    rule_id: str
    message: str
    severity: Literal["ERROR", "WARNING"] = "ERROR"


class SubCheckResult(BaseModel):
    model_config = ConfigDict(frozen=True)

    check_name: str
    status: ValidationStatus
    violations: list[ValidationViolation] = Field(default_factory=list)
    execution_time_ms: float = 0.0


class HarnessValidationReport(BaseModel):
    model_config = ConfigDict(frozen=True)

    total_checks: int
    passed_checks: int
    failed_checks: int
    results: list[SubCheckResult] = Field(default_factory=list)
    is_valid: bool

    def to_terminal(self) -> str:
        width = 86
        border_top = "┌" + "─" * (width - 2) + "┐"
        border_sec = "├" + "─" * (width - 2) + "┤"
        border_bottom = "└" + "─" * (width - 2) + "┘"

        title_text = "HARNESS INTEGRITY REPORT"
        title_line = f"│  \033[1m{title_text:<{width - 6}}\033[0m  │"

        lines: list[str] = [border_top, title_line, border_sec]

        check_titles = {
            "check_context": "Context & Scope Integrity",
            "check_memory": "Memory & Decisions",
            "check_sdd": "SDD Specifications & Specs",
            "check_skills": "Skills Registry & Manifests",
        }

        for res in self.results:
            desc = check_titles.get(res.check_name, res.check_name)
            time_str = f"{res.execution_time_ms:.2f} ms"

            if res.status == ValidationStatus.PASSED:
                status_icon = "\033[92m[✔ PASSED]\033[0m "
                status_plain = "[✔ PASSED] "
            elif res.status == ValidationStatus.WARNING:
                status_icon = "\033[93m[⚠️ WARN]  \033[0m "
                status_plain = "[⚠️ WARN]   "
            else:
                status_icon = "\033[91m[✘ FAILED]\033[0m "
                status_plain = "[✘ FAILED] "

            name_part = f"{res.check_name} ({desc})"

            # Format row inside box
            content_plain = f"  {status_plain}{name_part}"
            rem_space = (width - 2) - len(content_plain) - len(time_str) - 2
            padding = " " * max(1, rem_space)

            line_str = f"│  {status_icon}\033[1m{name_part}\033[0m{padding}{time_str}  │"
            lines.append(line_str)

            if res.violations:
                for v in res.violations:
                    v_icon = "✘" if v.severity == "ERROR" else "⚠️"
                    v_color = "\033[91m" if v.severity == "ERROR" else "\033[93m"
                    v_plain = f"      └─ {v_icon} [{v.rule_id}] {v.message}"
                    v_formatted = f"      └─ {v_color}{v_icon} [{v.rule_id}]\033[0m {v.message}"

                    if len(v_plain) > width - 4:
                        v_formatted = f"      └─ {v_color}{v_icon} [{v.rule_id}]\033[0m {v.message[: width - 30]}..."
                        pad_len = 0
                    else:
                        pad_len = (width - 2) - len(v_plain)

                    lines.append(f"│{v_formatted}{' ' * pad_len}  │")

        lines.append(border_sec)

        status_text = "✔ PASSED (VALID)" if self.is_valid else "✘ FAILED (INVALID)"
        status_color = (
            f"\033[92m{status_text}\033[0m" if self.is_valid else f"\033[91m{status_text}\033[0m"
        )

        summary_plain = f"  Status: {status_text} | Total Checks: {self.total_checks} | Passed: {self.passed_checks} | Failures: {self.failed_checks}"
        summary_color = f"  \033[1mStatus:\033[0m {status_color} | \033[1mTotal Checks:\033[0m {self.total_checks} | \033[92mPassed: {self.passed_checks}\033[0m | \033[91mFailures: {self.failed_checks}\033[0m"

        pad_summary = " " * max(1, (width - 2) - len(summary_plain))
        lines.append(f"│{summary_color}{pad_summary}│")
        lines.append(border_bottom)

        return "\n".join(lines)

    def to_json(self) -> str:
        data = self.model_dump(mode="json")
        return json.dumps(data, indent=2)
