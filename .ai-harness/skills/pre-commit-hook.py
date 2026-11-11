#!/usr/bin/env python
"""
Git Pre-Commit Hook Guard.
Executes Preflight and Harness Integrity checks.
Prevents git commit if validation fails.
"""

import subprocess
import sys

# Fix encoding on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


def main() -> int:
    print("\n🔍 Git Pre-Commit Guard :: Validating codebase...")

    # 1. Run Harness Integrity Check
    val_res = subprocess.run(
        [sys.executable, ".ai-harness/skills/harness-validator/runner.py"],
        capture_output=False,
    )
    if val_res.returncode != 0:
        print("\n ✘ COMMIT REJECTED: Harness Integrity Validation Failed.")
        return 1

    # 2. Run Preflight Quality & Risk Suite
    pf_res = subprocess.run(
        [sys.executable, ".ai-harness/skills/preflight/runner.py"],
        capture_output=False,
    )
    if pf_res.returncode != 0:
        print("\n ✘ COMMIT REJECTED: Preflight Suite Checks Failed.")
        return 1

    print("\n ✔ COMMIT APPROVED: All pre-commit guards passed.\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
