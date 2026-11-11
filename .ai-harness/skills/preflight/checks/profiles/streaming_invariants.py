"""Check 03: invariantes del perfil `streaming`.

Se carga solo cuando `invariants.profile: streaming` en `harness.config.yaml`.
El host, el puerto, la ruta, las features implicadas y los tokens prohibidos se
leen de la configuración: este check no conoce ningún producto concreto.
"""

from __future__ import annotations

import re
import sys
import time
from pathlib import Path

preflight_dir = Path(__file__).resolve().parent.parent.parent
if str(preflight_dir) not in sys.path:
    sys.path.insert(0, str(preflight_dir))
checks_dir = Path(__file__).resolve().parent.parent
if str(checks_dir) not in sys.path:
    sys.path.insert(0, str(checks_dir))

from common import dart_files, feature_of, find_project_root, read_text
from harness_config import load_config, streaming_config
from models import CheckResult, CheckStatus, CheckViolation

BIND_PATTERN = re.compile(r"HttpServer\.bind\s*\(([^)]*)\)", re.DOTALL)
URL_PATTERN = re.compile(r"https?://[^\s'\"\)]+")


def _skip(scope_path: Path, start: float, rule: str, message: str) -> CheckResult:
    return CheckResult(
        check_name="03_streaming_invariants",
        status=CheckStatus.WARNING,
        violations=[
            CheckViolation(file_path=scope_path, rule_id=rule, message=message)
        ],
        execution_time_ms=(time.perf_counter() - start) * 1000.0,
    )


def run(scope_path: Path, strict: bool = False) -> CheckResult:
    start = time.perf_counter()
    violations: list[CheckViolation] = []

    root = find_project_root(scope_path)
    if root is None:
        return _skip(
            scope_path,
            start,
            "PROJECT-MISSING",
            "No manifest file found. Streaming invariants were skipped.",
        )

    stream = streaming_config(load_config(root))
    endpoint = stream.get("endpoint", {}) or {}
    host = str(endpoint.get("host", "")).strip()
    port = str(endpoint.get("port", "")).strip()
    path = str(endpoint.get("path", "")).strip()
    producer = str(stream.get("producer_feature", "")).strip()
    consumer = str(stream.get("consumer_feature", "")).strip()
    forbidden = {str(k): str(v) for k, v in (stream.get("forbidden_tokens") or {}).items()}
    producer_forbidden_imports = [
        str(x) for x in stream.get("producer_forbidden_imports", []) or []
    ]

    if not (host and port and path and producer):
        return _skip(
            scope_path,
            start,
            "STREAMING-NOT-CONFIGURED",
            "Perfil streaming sin configurar (endpoint/producer_feature). "
            "Completa 'invariants.streaming' en harness.config.yaml.",
        )

    files = dart_files(root, "lib")
    producer_has_endpoint = False

    for file_path in files:
        content = read_text(file_path)
        lowered = content.lower()
        feature = feature_of(file_path, root)

        for token, rule in forbidden.items():
            if token and token.lower() in lowered:
                violations.append(
                    CheckViolation(
                        file_path=file_path,
                        rule_id=rule,
                        message=f"Forbidden token detected: '{token}'.",
                    )
                )

        if feature == producer:
            if host in content and port in content and path in content:
                producer_has_endpoint = True
            for match in BIND_PATTERN.finditer(content):
                bind_args = match.group(1)
                if "loopbackIPv4" not in bind_args and host not in bind_args:
                    line = content[: match.start()].count("\n") + 1
                    violations.append(
                        CheckViolation(
                            file_path=file_path,
                            line_number=line,
                            rule_id="SEC-NON-LOOPBACK-BIND",
                            message=(
                                f"HttpServer must bind to {host} or "
                                "InternetAddress.loopbackIPv4."
                            ),
                        )
                    )
            for module in producer_forbidden_imports:
                if f"package:{module}" in content:
                    violations.append(
                        CheckViolation(
                            file_path=file_path,
                            rule_id="ARCH-PRODUCER-FORBIDDEN-IMPORT",
                            message=f"'{producer}' cannot depend on '{module}'.",
                        )
                    )

        if feature == consumer and ("http://" in content or "https://" in content):
            for match in URL_PATTERN.finditer(content):
                url = match.group(0)
                if host not in url and "localhost" not in url:
                    line = content[: match.start()].count("\n") + 1
                    violations.append(
                        CheckViolation(
                            file_path=file_path,
                            line_number=line,
                            rule_id="CONSUMER-REMOTE-STREAM",
                            message="The consumer must read only the local stream.",
                        )
                    )

    producer_dir = root / "lib" / "features" / producer
    producer_has_code = any(
        f.relative_to(root).as_posix().startswith(f"lib/features/{producer}/")
        for f in files
    )
    if producer_dir.exists() and producer_has_code and not producer_has_endpoint:
        violations.append(
            CheckViolation(
                file_path=producer_dir,
                rule_id="STREAMING-ENDPOINT-MISSING",
                message=f"'{producer}' must expose the endpoint {host}:{port}{path}.",
            )
        )

    status = CheckStatus.PASSED if not violations else CheckStatus.FAILED
    return CheckResult(
        check_name="03_streaming_invariants",
        status=status,
        violations=violations,
        execution_time_ms=(time.perf_counter() - start) * 1000.0,
    )

