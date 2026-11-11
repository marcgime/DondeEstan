"""
Pydantic V2 Data Models for Preflight Skill Verification.
"""

import json
from enum import StrEnum
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field


class CheckStatus(StrEnum):
    PASSED = "PASSED"
    FAILED = "FAILED"
    WARNING = "WARNING"


class CheckViolation(BaseModel):
    model_config = ConfigDict(frozen=True)

    file_path: Path
    line_number: int | None = None
    rule_id: str
    message: str


class CheckResult(BaseModel):
    model_config = ConfigDict(frozen=True)

    check_name: str
    status: CheckStatus
    violations: list[CheckViolation] = Field(default_factory=list)
    execution_time_ms: float = 0.0


class PreflightSummary(BaseModel):
    model_config = ConfigDict(frozen=True)

    total_checks: int
    results: list[CheckResult] = Field(default_factory=list)
    is_successful: bool

    def to_console(self) -> str:
        lines = []
        lines.append("=" * 80)
        lines.append(" PREFLIGHT HARNESS SUITE - EXECUTION SUMMARY")
        lines.append("=" * 80)

        for res in self.results:
            status_str = res.status.value
            color_prefix = (
                "\033[92m"
                if res.status == CheckStatus.PASSED
                else ("\033[93m" if res.status == CheckStatus.WARNING else "\033[91m")
            )
            color_suffix = "\033[0m"

            lines.append(
                f"[{color_prefix}{status_str}{color_suffix}] Check: {res.check_name} ({res.execution_time_ms:.2f} ms)"
            )

            if res.violations:
                lines.append("  Violations:")
                for v in res.violations:
                    loc = f"{v.file_path}:{v.line_number}" if v.line_number else str(v.file_path)
                    lines.append(f"    - [{v.rule_id}] {loc} -> {v.message}")
            lines.append("-" * 80)

        overall_status = "\033[92mPASSED\033[0m" if self.is_successful else "\033[91mFAILED\033[0m"
        lines.append(f"Total Checks Executed: {self.total_checks} | Final Result: {overall_status}")
        lines.append("=" * 80)
        return "\n".join(lines)

    def to_json(self) -> str:
        data = self.model_dump(mode="json")
        return json.dumps(data, indent=2)
