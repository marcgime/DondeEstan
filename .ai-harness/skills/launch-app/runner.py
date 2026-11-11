"""launch-app: arranca la aplicación según el stack tecnológico configurado en harness.config.yaml."""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

skills_dir = Path(__file__).resolve().parent.parent
if str(skills_dir) not in sys.path:
    sys.path.insert(0, str(skills_dir))

try:
    from harness_config import load_config, workspace_of
except ImportError:
    load_config = None


def _find_project_root(start: Path) -> Path | None:
    for candidate in (start, *start.parents):
        if (candidate / "pubspec.yaml").exists() or (candidate / "package.json").exists() or (candidate / "pyproject.toml").exists():
            return candidate
    return None


def _default_device() -> str:
    if sys.platform == "win32":
        return "windows"
    if sys.platform == "darwin":
        return "macos"
    return "linux"


def main() -> None:
    parser = argparse.ArgumentParser(description="Launch the app according to configured tech stack")
    parser.add_argument("--device", default=None, help="Device ID (Flutter: windows, macos, linux, android...)")
    parser.add_argument("--emulator", default=None, help="Emulator ID to launch (Flutter)")
    parser.add_argument("--list", action="store_true", help="List available devices and exit")
    parser.add_argument("--list-emulators", action="store_true", help="List available emulators and exit")
    parser.add_argument("--command", default=None, help="Custom override launch command")
    args = parser.parse_args()

    workspace_root = Path.cwd()
    stack = "generic"
    launch_command = None

    if load_config:
        try:
            cfg = load_config(workspace_root)
            prj = cfg.get("project", {})
            stack = prj.get("stack", "generic")
            launch_command = prj.get("launch_command")
        except Exception:
            pass

    # Si se pasa un comando personalizado o está definido en harness.config.yaml para stacks no-flutter
    if args.command:
        launch_command = args.command

    # 1. Stacks no-flutter con comando definido
    if stack != "flutter" and launch_command:
        print(f"[launch-app] Arrancando aplicación ({stack}) con: '{launch_command}'...")
        is_win = sys.platform == "win32"
        res = subprocess.run(launch_command, cwd=workspace_root, shell=True, check=False)
        sys.exit(res.returncode)

    # 2. Stacks específicos sin comando explícito
    if stack == "python":
        cmd = "python main.py"
        print(f"[launch-app] Arrancando servicio Python con: '{cmd}'...")
        res = subprocess.run(cmd, cwd=workspace_root, shell=True, check=False)
        sys.exit(res.returncode)

    if stack == "node":
        cmd = "npm run dev"
        print(f"[launch-app] Arrancando entorno Node/Web con: '{cmd}'...")
        res = subprocess.run(cmd, cwd=workspace_root, shell=True, check=False)
        sys.exit(res.returncode)

    if stack == "go":
        cmd = "go run ."
        print(f"[launch-app] Arrancando binario Go con: '{cmd}'...")
        res = subprocess.run(cmd, cwd=workspace_root, shell=True, check=False)
        sys.exit(res.returncode)

    # 3. Flujo Flutter (por defecto o cuando stack == "flutter")
    if shutil.which("flutter") is None:
        print("[launch-app] Flutter SDK not found in PATH.", file=sys.stderr)
        sys.exit(1)

    root = _find_project_root(Path.cwd())
    if root is None or not (root / "pubspec.yaml").exists():
        print("[launch-app] pubspec.yaml not found. Run from the Flutter project root or configure launch_command in harness.config.yaml.", file=sys.stderr)
        sys.exit(1)

    is_win = sys.platform == "win32"
    if args.list_emulators:
        result = subprocess.run(["flutter", "emulators"], cwd=str(root), shell=is_win, check=False)
        sys.exit(result.returncode)

    if args.list:
        result = subprocess.run(["flutter", "devices"], cwd=str(root), shell=is_win, check=False)
        sys.exit(result.returncode)

    if args.emulator:
        print(f"[launch-app] Launching emulator '{args.emulator}'...")
        subprocess.run(["flutter", "emulators", "--launch", args.emulator], cwd=str(root), shell=is_win, check=False)
        print("[launch-app] Waiting for emulator to be ready...")
        import time
        for _ in range(30):
            res = subprocess.run(["adb", "devices"], capture_output=True, text=True, shell=is_win, check=False)
            lines = [l for l in res.stdout.splitlines() if "device" in l and not l.startswith("List")]
            if lines:
                break
            time.sleep(2)

    device = args.device or _default_device()
    print(f"[launch-app] Starting app on device '{device}'...")
    result = subprocess.run(["flutter", "run", "-d", device], cwd=str(root), shell=is_win, check=False)
    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
