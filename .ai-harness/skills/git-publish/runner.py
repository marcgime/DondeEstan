"""
Git Publish Skill Runner.
"""

import argparse
import subprocess
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

harness_dir = Path(__file__).resolve().parents[2]
skills_git_publish_dir = Path(__file__).resolve().parent
if str(skills_git_publish_dir) not in sys.path:
    sys.path.insert(0, str(skills_git_publish_dir))

skills_dir = Path(__file__).resolve().parent.parent
if str(skills_dir) not in sys.path:
    sys.path.insert(0, str(skills_dir))

from harness_config import require_dependencies

require_dependencies()

from models import GitAction, GitPublishConfig, GitPublishResult


def _run_cmd(cmd: list[str], cwd: Path, check: bool = True) -> subprocess.CompletedProcess[str]:
    import os

    env = os.environ.copy()
    env["GIT_TERMINAL_PROMPT"] = "0"
    return subprocess.run(
        cmd,
        cwd=cwd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="ignore",
        check=check,
        env=env,
    )


def _print_mr_pr_link(remote: str, branch: str, root: Path) -> None:
    res = _run_cmd(["git", "remote", "get-url", remote], cwd=root, check=False)
    if res.returncode != 0:
        return
    url = res.stdout.strip()
    clean = url[:-4] if url.endswith(".git") else url

    if "gitlab.com" in clean:
        parts = clean.split("gitlab.com", 1)[1].lstrip("/:")
        print(f"\n\033[1;36m[GitLab] Crear o revisar Merge Request:\033[0m")
        print(f"👉 \033[4mhttps://gitlab.com/{parts}/-/merge_requests/new?merge_request%5Bsource_branch%5D={branch}\033[0m\n")
    elif "github.com" in clean:
        parts = clean.split("github.com", 1)[1].lstrip("/:")
        print(f"\n\033[1;36m[GitHub] Crear o revisar Pull Request:\033[0m")
        print(f"👉 \033[4mhttps://github.com/{parts}/pull/new/{branch}\033[0m\n")


def _get_current_branch(root: Path) -> str:
    res = _run_cmd(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=root, check=False)
    if res.returncode == 0 and res.stdout.strip():
        return res.stdout.strip()
    return "main"


def _run_preflight_checks(root: Path) -> bool:
    print("\033[1m[Git Publish] Running Harness & Preflight Validation Gates...\033[0m")

    # 1. Run Harness Validator
    val_script = harness_dir / "skills" / "harness-validator" / "runner.py"
    if val_script.exists():
        res_val = _run_cmd([sys.executable, str(val_script)], cwd=root, check=False)
        if res_val.returncode != 0:
            print("\033[91m[ERROR] Harness Integrity Validation Failed!\033[0m\n" + res_val.stdout)
            return False

    # 2. Run Preflight
    pf_script = harness_dir / "skills" / "preflight" / "runner.py"
    if pf_script.exists():
        res_pf = _run_cmd([sys.executable, str(pf_script)], cwd=root, check=False)
        if res_pf.returncode != 0:
            print(
                "\033[91m[ERROR] Preflight Quality & Architecture Checks Failed!\033[0m\n"
                + res_pf.stdout
            )
            return False

    print("\033[92m[SUCCESS] All Harness pre-commit gates passed clean!\033[0m")
    return True


def execute_git_publish(config: GitPublishConfig, root: Path) -> GitPublishResult:
    target_branch = config.branch or _get_current_branch(root)
    preflight_passed = True

    if config.action in (GitAction.PUSH, GitAction.SYNC) and not config.skip_verify:
        preflight_passed = _run_preflight_checks(root)
        if not preflight_passed:
            return GitPublishResult(
                success=False,
                action=config.action,
                branch=target_branch,
                message="Aborted: Preflight checks failed. Fix violations before pushing.",
                preflight_passed=False,
                stdout="",
                stderr="Preflight gate check non-zero exit code.",
            )

    try:
        if config.action == GitAction.STATUS:
            res = _run_cmd(["git", "status"], cwd=root, check=False)
            return GitPublishResult(
                success=res.returncode == 0,
                action=config.action,
                branch=target_branch,
                message="Git status executed",
                preflight_passed=preflight_passed,
                stdout=res.stdout,
                stderr=res.stderr,
            )

        if config.action in (GitAction.PULL, GitAction.SYNC):
            print(
                f"\033[1m[Git Publish] Pulling latest changes from {config.remote}/{target_branch}...\033[0m"
            )
            pull_cmd = ["git", "pull"]
            if config.rebase:
                pull_cmd.append("--rebase")
            pull_cmd.extend([config.remote, target_branch])

            res_pull = _run_cmd(pull_cmd, cwd=root, check=False)
            if res_pull.returncode != 0:
                return GitPublishResult(
                    success=False,
                    action=config.action,
                    branch=target_branch,
                    message=f"Git pull failed: {res_pull.stderr}",
                    preflight_passed=preflight_passed,
                    stdout=res_pull.stdout,
                    stderr=res_pull.stderr,
                )
            print(res_pull.stdout)

        if config.action in (GitAction.PUSH, GitAction.SYNC):
            if not config.message:
                return GitPublishResult(
                    success=False,
                    action=config.action,
                    branch=target_branch,
                    message="Error: Commit message required for push/sync.",
                    preflight_passed=preflight_passed,
                    stdout="",
                    stderr="Missing --message parameter.",
                )

            # Stage changes
            print("\033[1m[Git Publish] Staging changes (git add .)...\033[0m")
            _run_cmd(["git", "add", "."], cwd=root, check=True)

            # Check if there are staged changes to commit
            status_res = _run_cmd(["git", "status", "--porcelain"], cwd=root, check=True)
            if status_res.stdout.strip():
                print(
                    f"\033[1m[Git Publish] Committing changes with message: '{config.message}'...\033[0m"
                )
                commit_res = _run_cmd(
                    ["git", "commit", "-m", config.message], cwd=root, check=False
                )
                if commit_res.returncode != 0 and "nothing to commit" not in commit_res.stdout:
                    return GitPublishResult(
                        success=False,
                        action=config.action,
                        branch=target_branch,
                        message=f"Git commit failed: {commit_res.stderr}",
                        preflight_passed=preflight_passed,
                        stdout=commit_res.stdout,
                        stderr=commit_res.stderr,
                    )
            else:
                print(
                    "\033[33m[Git Publish] No uncommitted changes found. Proceeding to push...\033[0m"
                )

            # Push to remote
            print(f"\033[1m[Git Publish] Pushing to {config.remote}/{target_branch}...\033[0m")
            push_res = _run_cmd(
                ["git", "push", "-u", config.remote, target_branch],
                cwd=root,
                check=False,
            )
            if push_res.returncode != 0:
                return GitPublishResult(
                    success=False,
                    action=config.action,
                    branch=target_branch,
                    message=f"Git push failed: {push_res.stderr}",
                    preflight_passed=preflight_passed,
                    stdout=push_res.stdout,
                    stderr=push_res.stderr,
                )

            print(
                f"\033[92m[Git Publish] Successfully published changes to {config.remote}/{target_branch}!\033[0m"
            )
            _print_mr_pr_link(config.remote, target_branch, root
            )
            return GitPublishResult(
                success=True,
                action=config.action,
                branch=target_branch,
                message=f"Successfully published to {config.remote}/{target_branch}",
                preflight_passed=preflight_passed,
                stdout=push_res.stdout,
                stderr=push_res.stderr,
            )

    except Exception as e:
        return GitPublishResult(
            success=False,
            action=config.action,
            branch=target_branch,
            message=f"Execution error: {e!s}",
            preflight_passed=preflight_passed,
            stdout="",
            stderr=str(e),
        )

    return GitPublishResult(
        success=True,
        action=config.action,
        branch=target_branch,
        message="Operation completed",
        preflight_passed=preflight_passed,
        stdout="",
        stderr="",
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Git Publish - Harness-Governed Git Automation Skill"
    )
    parser.add_argument(
        "action",
        nargs="?",
        default="push",
        choices=["push", "pull", "sync", "status"],
        help="Acción a realizar: push, pull, sync (pull + push), status",
    )
    parser.add_argument("-m", "--message", help="Mensaje de commit (requerido para push/sync)")
    parser.add_argument("-b", "--branch", help="Nombre de la rama objetivo")
    parser.add_argument(
        "-r", "--remote", default="origin", help="Remoto objetivo (default: origin)"
    )
    parser.add_argument(
        "--no-verify",
        action="store_true",
        help="Saltar comprobaciones preflight (usar con precaución)",
    )
    parser.add_argument(
        "--no-rebase",
        action="store_true",
        help="No usar --rebase al hacer pull",
    )

    args = parser.parse_args()
    workspace_root = harness_dir.parent

    config = GitPublishConfig(
        action=GitAction(args.action),
        message=args.message,
        branch=args.branch,
        remote=args.remote,
        skip_verify=args.no_verify,
        rebase=not args.no_rebase,
    )

    result = execute_git_publish(config, workspace_root)

    if not result.success:
        print(f"\n\033[91m[FAILURE] Git Publish Operation Failed:\033[0m {result.message}")
        if result.stderr:
            print(f"Details:\n{result.stderr}")
        sys.exit(1)
    else:
        if result.action == GitAction.STATUS:
            print(result.stdout)
        sys.exit(0)


if __name__ == "__main__":
    main()
