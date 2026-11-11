"""
Prompter Engine: Entrevistador interactivo accesible y guiado por la doctrina de docs/.
Ofrece opciones cerradas con recomendación, '🤖 Decidir por mí' y '✏️ Campo abierto'.
Incluye configuración remota de Git (GitLab vs GitHub) y prueba de conexión segura.
"""

from __future__ import annotations

import re
import subprocess
import sys
from typing import Any
from input_scanner import InputDigest
from models import (
    ADRItem,
    ArchitectureConfig,
    AuthorInfo,
    BootstrapManifest,
    FailureModeItem,
    GitProvider,
    GitRemoteConfig,
    PlatformConfig,
    ProjectIdentity,
    ScopeDefinition,
    StackType,
    TechStack,
    UIConfig,
)


class Prompter:
    """Gestiona el diálogo interactivo con el usuario, fundamentado en las reglas de docs/."""

    def __init__(self, digest: InputDigest | None = None) -> None:
        self.digest = digest or InputDigest()

    def _ask_choice(
        self,
        title: str,
        why_it_matters: str,
        doc_reference: str,
        options: list[tuple[str, str]],
        ai_recommendation: str,
        default_index: int = 1,
    ) -> str:
        """Presenta una pregunta estructurada citando la regla canónica de docs/."""
        print(f"\n\033[1;34m[Pregunta]\033[0m \033[1m{title}\033[0m")
        print(f"\033[36m¿Por qué importa?\033[0m {why_it_matters}")
        print(f"\033[90m📖 Fundamento canónico: {doc_reference}\033[0m\n")

        for idx, (label, desc) in enumerate(options, start=1):
            rec_tag = " \033[1;32m(Recomendado)\033[0m" if idx == default_index else ""
            print(f"  \033[1m{idx}.\033[0m {label}{rec_tag}")
            if desc:
                print(f"     \033[90m└─ {desc}\033[0m")

        ai_opt_num = len(options) + 1
        custom_opt_num = len(options) + 2

        print(f"  \033[1m{ai_opt_num}.\033[0m 🤖 \033[1mDecidir por mí\033[0m: {ai_recommendation}")
        print(f"  \033[1m{custom_opt_num}.\033[0m ✏️  \033[1mCampo abierto\033[0m (escribir respuesta personalizada)")

        while True:
            try:
                raw = input(f"\nSelecciona una opción [1-{custom_opt_num}] (Enter para opción {default_index}): ").strip()
            except (EOFError, KeyboardInterrupt):
                print("\nOperación cancelada.")
                sys.exit(1)

            if not raw:
                raw = str(default_index)

            if raw == str(ai_opt_num) or raw.lower() in ("ai", "ia", "robot"):
                print(f"\033[32m[IA]\033[0m Aplicando recomendación canónica: \033[1m{ai_recommendation}\033[0m")
                return options[default_index - 1][0]

            if raw == str(custom_opt_num) or raw.lower() in ("custom", "otro", "personalizado"):
                try:
                    custom_text = input("Escribe tu especificación: ").strip()
                    if custom_text:
                        return custom_text
                except (EOFError, KeyboardInterrupt):
                    sys.exit(1)
                continue

            try:
                choice_idx = int(raw)
                if 1 <= choice_idx <= len(options):
                    return options[choice_idx - 1][0]
            except ValueError:
                return raw

            print(f"\033[91mOpción inválida. Introduce un número entre 1 y {custom_opt_num}.\033[0m")

    def _ask_text(self, title: str, why_it_matters: str, doc_reference: str, default: str | None = None) -> str:
        """Pide texto libre con justificación doctrinal y valor por defecto."""
        print(f"\n\033[1;34m[Pregunta]\033[0m \033[1m{title}\033[0m")
        print(f"\033[36m¿Por qué importa?\033[0m {why_it_matters}")
        print(f"\033[90m📖 Fundamento canónico: {doc_reference}\033[0m")
        prompt_label = f" (Enter para '{default}')" if default else ""
        while True:
            try:
                val = input(f"Respuesta{prompt_label}: ").strip()
            except (EOFError, KeyboardInterrupt):
                print("\nOperación cancelada.")
                sys.exit(1)
            if val:
                return val
            if default:
                return default

    def _detect_git_provider(self, url: str) -> tuple[GitProvider, str, str]:
        """Detecta proveedor (GitLab, GitHub, Bitbucket), protocolo y host."""
        clean = url.strip().lower()
        protocol = "ssh" if clean.startswith("git@") else "https"

        if "gitlab" in clean:
            return GitProvider.GITLAB, protocol, "gitlab.com"
        if "github" in clean:
            return GitProvider.GITHUB, protocol, "github.com"
        if "bitbucket" in clean:
            return GitProvider.BITBUCKET, protocol, "bitbucket.org"
        if clean:
            return GitProvider.OTHER, protocol, "custom-host"
        return GitProvider.NONE, "none", ""

    def _test_ssh(self, host: str) -> bool:
        """Comprueba conectividad SSH con el host remoto en modo silencioso."""
        try:
            res = subprocess.run(
                ["ssh", "-T", "-o", "BatchMode=yes", f"git@{host}"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            out = (res.stdout + res.stderr).lower()
            return "welcome" in out or "successfully authenticated" in out or "authenticated" in out
        except Exception:
            return False

    def collect(self) -> BootstrapManifest:
        """Ejecuta el protocolo de entrevista guiada de 5 fases + Configuración Git."""
        print("\n" + "=" * 78)
        print("  \033[1;32mHARNESS LAUNCHER — ASISTENTE UNIVERSAL DE ARQUITECTURA (BOOTSTRAP)\033[0m")
        print("  \033[90mConstruye y adapta todas las piezas del arnés conforme a docs/ y context/\033[0m")
        print("=" * 78)
        if self.digest.files_found:
            print(f"\033[1m[Documentación previa detectada]\033[0m {self.digest.raw_summary}")
        else:
            print("\033[90mNo se detectó documentación previa en .ai-harness/input. Procediendo en modo paso a paso.\033[0m")

        # ---------------------------------------------------------------------
        # FASE 1: Identidad del Producto (docs/01-que-es-un-harness.md & 03-contexto.md)
        # ---------------------------------------------------------------------
        def_name = self.digest.suggested_name or "MiProducto"
        name = self._ask_text(
            "Nombre oficial del proyecto",
            "Identifica el producto, repositorios y la spec de arranque CMP-00.",
            "docs/03-contexto.md (project_overview.md)",
            default=def_name,
        )

        slug = name.lower().replace(" ", "-").replace("_", "-")
        def_desc = self.digest.suggested_description or "Aplicación construida bajo arquitectura limpia y contratos SDD."
        desc = self._ask_text(
            "Propuesta de valor / Misión del sistema",
            "Define el propósito técnico del sistema y elimina placeholders <PROYECTO> del contexto.",
            "docs/03-contexto.md §4 (prohibido dejar marcadores sin sustituir)",
            default=def_desc,
        )

        audience = self._ask_choice(
            "Público objetivo y tipo de usuario principal",
            "Determina el nivel de rigor en interfaces de usuario, logs y tolerancia a fallos.",
            "docs/01-que-es-un-harness.md (definición de expectativas)",
            [
                ("Usuarios finales (B2C / App de consumo)", "Enfoque en usabilidad visual, respuesta inmediata y resiliencia."),
                ("Empresas y equipos internos (B2B / SaaS)", "Enfoque en integridad transaccional, trazabilidad y control de acceso."),
                ("Desarrolladores y sistemas (API / CLI / Tooling)", "Enfoque en contratos estrictos, documentación stdout/stderr y zero-latency."),
            ],
            ai_recommendation="Usuarios finales (B2C) con privacidad por defecto y experiencia fluida.",
            default_index=1,
        )

        identity = ProjectIdentity(name=name, slug=slug, description=desc, target_audience=audience)

        # ---------------------------------------------------------------------
        # FASE 2: Stack Tecnológico y Universalidad de Skills (docs/08-skills-y-validadores.md)
        # ---------------------------------------------------------------------
        stack_def_idx = 1
        if self.digest.detected_stack == "flutter":
            stack_def_idx = 1
        elif self.digest.detected_stack == "python":
            stack_def_idx = 2
        elif self.digest.detected_stack == "node":
            stack_def_idx = 3

        stack_choice = self._ask_choice(
            "Stack tecnológico principal del sistema",
            "Configura preflight (linters/tests) y parametriza launch-app para arrancar el entorno correcto.",
            "docs/08-skills-y-validadores.md (launch-app y preflight polimórficos)",
            [
                ("Flutter / Dart", "Multiplataforma para móvil, escritorio y web con alto rendimiento nativo."),
                ("Python (FastAPI / Poetry / Uvicorn)", "Servicios web reactivos, microservicios, IA y tooling backend."),
                ("Node / TypeScript (Next.js / Express / PNPM)", "Aplicaciones web modernas fullstack y APIs ligeras."),
                ("Go (Golang / Gin)", "Servicios de alta concurrencia, bajo consumo de memoria y binarios únicos."),
                ("Genérico / Agnóstico", "Arnés neutro con comandos configurables libremente."),
            ],
            ai_recommendation=f"Elegir '{self.digest.detected_framework or 'Flutter / Dart'}' por portabilidad multiplataforma.",
            default_index=stack_def_idx,
        )

        if "Flutter" in stack_choice:
            stype = StackType.FLUTTER
            lang, fw, pkg_mgr = "Dart", "Flutter", "pub"
            launch_cmd = "flutter run"
            test_cmd = "flutter test"
        elif "Python" in stack_choice:
            stype = StackType.PYTHON
            lang, fw, pkg_mgr = "Python", "FastAPI", "poetry/pip"
            launch_cmd = "uvicorn src.main:app --reload"
            test_cmd = "pytest"
        elif "TypeScript" in stack_choice or "Node" in stack_choice:
            stype = StackType.NODE
            lang, fw, pkg_mgr = "TypeScript", "Node/Next.js", "pnpm"
            launch_cmd = "pnpm dev"
            test_cmd = "pnpm test"
        elif "Go" in stack_choice:
            stype = StackType.GO
            lang, fw, pkg_mgr = "Go", "Gin", "go modules"
            launch_cmd = "go run ./cmd/main.go"
            test_cmd = "go test ./..."
        else:
            stype = StackType.GENERIC
            lang, fw, pkg_mgr = "Agnóstico", "Generic", "system"
            launch_cmd = "python main.py"
            test_cmd = "python -m unittest"

        stack = TechStack(
            stack_type=stype,
            language=lang,
            framework=fw,
            package_manager=pkg_mgr,
            launch_command=launch_cmd,
            test_command=test_cmd,
        )

        platforms_choice = self._ask_choice(
            "Plataformas objetivo donde correrá el producto",
            "Genera platform_matrix.md y define las dependencias del sistema requeridas.",
            "docs/03-contexto.md (platform_matrix.md)",
            [
                ("Multiplataforma cliente (Android, iOS, Windows, Web)", "Cubre móvil, escritorio y navegadores."),
                ("Móvil nativo exclusivo (Android e iOS)", "Optimizado para smartphones y tablets."),
                ("Servidor / Cloud Backend (Linux Container / Docker)", "Servicio sin pantalla corriendo en contenedores."),
                ("Escritorio exclusivo (Windows, macOS, Linux)", "Herramienta o estación de trabajo local."),
            ],
            ai_recommendation="Multiplataforma cliente (Android, iOS, Windows, Web) para máxima portabilidad.",
            default_index=1,
        )

        platform_list = ["Android", "iOS", "Windows", "Web"]
        if "Móvil nativo" in platforms_choice:
            platform_list = ["Android", "iOS"]
        elif "Servidor" in platforms_choice:
            platform_list = ["Linux", "Docker"]
        elif "Escritorio" in platforms_choice:
            platform_list = ["Windows", "macOS", "Linux"]

        # ---------------------------------------------------------------------
        # FASE 3: Arquitectura, Scopes y Límites de Escritura (docs/04-scopes.md)
        # ---------------------------------------------------------------------
        arch_choice = self._ask_choice(
            "Estilo arquitectónico y organización de capas",
            "Establece las reglas de importación en architecture_rules.md y los checks de fronteras en preflight.",
            "docs/04-scopes.md y context/architecture_rules.md (invariantes de desacoplamiento)",
            [
                ("Clean Architecture (Domain, Application, Infrastructure, Presentation)", "Desacopla lógica de negocio pura de frameworks y bases de datos."),
                ("Modular Feature-First (Módulos autónomos por funcionalidad)", "Agrupa cada caso de uso con su UI y datos en carpetas independientes."),
                ("Hexagonal / Ports & Adapters", "Aislamiento estricto entre puertos de dominio y adaptadores de I/O."),
            ],
            ai_recommendation="Clean Architecture para poder testear el dominio sin dependencias externas.",
            default_index=1,
        )

        persistence_choice = self._ask_choice(
            "Mecanismo de persistencia y almacenamiento de datos",
            "Registra el motor en harness.config.yaml y bloquea librerías incompatibles o pesadas.",
            "docs/03-contexto.md (architecture_rules.md)",
            [
                ("Base de datos local embebida (SQLite / Drift / Floor / SQLCipher)", "Datos relacionales estructurados, offline-first y consultas SQL locales."),
                ("Persistencia remota en API / Backend externo", "La app no almacena grandes bases de datos locales, solo tokens o caché de sesión."),
                ("Almacenamiento Clave-Valor simple (Preferences / Hive / LocalStorage)", "Configuraciones, estado de interfaz y pares clave-valor."),
                ("Sin persistencia (In-Memory o Stateless)", "Toda la información se destruye al cerrar el proceso."),
            ],
            ai_recommendation="Base de datos local embebida (SQLite) para garantizar experiencia offline.",
            default_index=1,
        )

        persistence = "sqlite" if "SQLite" in persistence_choice else "api" if "remota" in persistence_choice else "none"

        # Rutas raíz según el stack
        path_prefix = "lib" if stype in (StackType.FLUTTER, StackType.DART) else "src"

        default_scopes = [
            ScopeDefinition(
                name="core",
                title="Núcleo del Sistema (Core)",
                description="Infraestructura base, inyección de dependencias y utilidades compartidas.",
                path_roots=[f"{path_prefix}/core"],
                forbidden_paths=[f"{path_prefix}/features", f"{path_prefix}/ui"],
            ),
            ScopeDefinition(
                name="domain",
                title="Capa de Dominio y Reglas de Negocio",
                description="Entidades, value objects, repositorios e invariantes puras.",
                path_roots=[f"{path_prefix}/domain"],
                forbidden_paths=[f"{path_prefix}/infrastructure", f"{path_prefix}/presentation", f"{path_prefix}/ui"],
            ),
            ScopeDefinition(
                name="ui",
                title="Capa de Presentación e Interfaz",
                description="Pantallas, componentes visuales, consumo de estado y navegación.",
                path_roots=[f"{path_prefix}/presentation", f"{path_prefix}/ui"],
                forbidden_paths=[f"{path_prefix}/data", f"{path_prefix}/infrastructure"],
            ),
        ]

        # ---------------------------------------------------------------------
        # FASE 4: UI, Tokens y Privacidad (docs/06-design-system.md & security_privacy.md)
        # ---------------------------------------------------------------------
        ui_choice = self._ask_choice(
            "¿El proyecto incluye interfaz de usuario (UI)?",
            "Define si se genera design-system con tokens visuales o si es un proyecto backend/CLI puro.",
            "docs/06-design-system.md",
            [
                ("Sí, incluye interfaz visual (Web, Móvil o Escritorio)", "Genera tokens de color, componentes, layout y mapeos de código."),
                ("No, es un backend, servicio CLI o daemon headless", "Mantiene el arnés libre de reglas visuales innecesarias."),
            ],
            ai_recommendation="Sí" if stype in (StackType.FLUTTER, StackType.NODE) else "No",
            default_index=1 if stype in (StackType.FLUTTER, StackType.NODE) else 2,
        )
        has_ui = "Sí" in ui_choice

        focus_nav = False
        css_fw = ""
        key_components = ["Header", "Sidebar", "Button", "Card", "Table", "Modal"]
        if has_ui:
            if stype == StackType.NODE or any("web" in p.lower() for p in platform_list):
                css_choice = self._ask_choice(
                    "Framework CSS o sistema de estilos preferido",
                    "Configura el mapeo de clases y utilidades en design-system/06-code-mapping.md.",
                    "docs/06-design-system.md",
                    [
                        ("Tailwind CSS", "Clases de utilidad atómicas acopladas a tokens.json."),
                        ("CSS Variables (:root)", "Variables CSS nativas desacopladas del framework."),
                        ("Component Library (Material, Radix, Shadcn, Chakra)", "Componentes prefabricados que consumen temas."),
                    ],
                    ai_recommendation="Tailwind CSS para agilidad y correspondencia directa con tokens.",
                    default_index=1,
                )
                css_fw = css_choice.split("(")[0].strip()

            dpad_choice = self._ask_choice(
                "¿Se requiere navegación estricta por D-Pad o mando?",
                "Indica si el foco espacial para Smart TVs, consolas o terminales embebidos es obligatorio.",
                "docs/06-design-system.md §Navegación espacial",
                [
                    ("No requerida (Navegación estándar por ratón, táctil y Tab accesible)", "Recomendado para web y apps móviles normales."),
                    ("Sí, obligatoria por D-Pad / Flechas direccionales", "Impone matrices de foco y checks de control remoto."),
                ],
                ai_recommendation="No requerida para aplicaciones web o móviles táctiles.",
                default_index=1,
            )
            focus_nav = "Sí" in dpad_choice

        privacy_choice = self._ask_choice(
            "Política de privacidad y telemetría de usuario",
            "Queda registrada como límite infranqueable en security_privacy.md y comprobada por preflight.",
            "docs/03-contexto.md (security_privacy.md: cero telemetría no ética)",
            [
                ("Cero Telemetría Absoluta (Zero-telemetry)", "Ningún dato de usuario ni evento de analítica sale del dispositivo."),
                ("Reporte anónimo mínimo de crashes (Opt-in)", "Solo trazas técnicas anónimas de error previa autorización del usuario."),
            ],
            ai_recommendation="Cero Telemetría Absoluta para cumplir las directrices éticas del arnés.",
            default_index=1,
        )

        privacy = "zero_telemetry" if "Cero" in privacy_choice else "anonymous_crash_only"

        # ---------------------------------------------------------------------
        # FASE 5: Memoria Preventiva y Primer ADR (docs/07-memoria.md)
        # ---------------------------------------------------------------------
        failure_modes = [
            FailureModeItem(
                id="FM-01",
                title="Pérdida de foco y accesibilidad en navegación",
                symptom="El usuario con teclado o mando no puede seleccionar controles o queda atrapado en un bucle.",
                root_cause="La IA no declara FocusNodes explícitos ni gestiona la tecla Tab.",
                mitigation="Toda vista debe incorporar pruebas de recorrido de foco y controles navegables (docs/06).",
            ),
            FailureModeItem(
                id="FM-02",
                title="Valores visuales literales fuera del sistema de tokens",
                symptom="Colores HEX, márgenes o fuentes hardcodeados directamente en widgets o componentes.",
                root_cause="La IA usa colores directos (ej. Colors.blue o #FFFFFF) en lugar de tokens.json.",
                mitigation="Preflight rechaza cualquier commit con valores visuales literales en capas UI (docs/06).",
            ),
            FailureModeItem(
                id="FM-03",
                title="Fugas de memoria en suscripciones asíncronas no canceladas",
                symptom="Consumo progresivo de RAM al cambiar repetidamente de pantalla o proceso.",
                root_cause="La IA inicializa Streams, Listeners o Controladores sin destruirlos en el dispose/cleanup.",
                mitigation="Regla obligatoria de paridad: cada suscripción en setup tiene su desuscripción en cleanup.",
            ),
            FailureModeItem(
                id="FM-04",
                title="Acoplamiento indebido de infraestructura en la capa de dominio",
                symptom="Las entidades o casos de uso importan librerías de bases de datos o frameworks visuales.",
                root_cause="La IA intenta resolver rápido un problema llamando a la BD directamente desde la lógica.",
                mitigation="El dominio solo conoce interfaces (puertos) y nunca implementaciones de infraestructura (docs/04).",
            ),
            FailureModeItem(
                id="FM-05",
                title="Inconsistencia de estado por falta de manejo de errores en llamadas I/O",
                symptom="La interfaz se congela o queda en estado de carga infinito si la red o disco fallan.",
                root_cause="La IA asume operaciones síncronas o no captura excepciones en bloques try/catch/Result.",
                mitigation="Toda operación asíncrona debe retornar un tipo Result/Either o capturar y propagar el fallo.",
            ),
        ]

        adr_0001 = ADRItem(
            id="ADR-0001",
            title=f"Elección de stack base ({stack.language} / {stack.framework}) y arquitectura {arch_choice.split('(')[0].strip()}",
            status="Aceptada",
            context=f"Inicio del desarrollo de {name}. Se requiere una base robusta para {identity.description} dirigida a {identity.target_audience}.",
            decision=f"Adoptar {stack.language} con framework {stack.framework} siguiendo {arch_choice.split('(')[0].strip()}.",
            consequences=f"Desarrollo desacoplado y verificable mediante Spec-Driven Development (docs/05); preflight validará las invariantes.",
        )

        # ---------------------------------------------------------------------
        # FASE 6: Repositorio Remoto y Vinculación Git (GitLab vs GitHub)
        # ---------------------------------------------------------------------
        print("\n" + "-" * 78)
        print("  \033[1;33mCONFIGURACIÓN DE REPOSITORIO REMOTO Y GOBERNANZA GIT (git-publish)\033[0m")
        print("  \033[90m📖 Fundamento: docs/09-workflows.md (git-publish) & security_privacy.md (cero passwords en repo)\033[0m")
        print("-" * 78)

        git_url = self._ask_text(
            "URL del repositorio Git remoto (GitLab / GitHub / Bitbucket)",
            "Permite vincular git-publish, detectar MR/PR y generar pipelines CI/CD.",
            "docs/09-workflows.md (git-publish.md)",
            default="",
        )

        git_config = GitRemoteConfig()
        if git_url:
            provider, protocol, host = self._detect_git_provider(git_url)
            print(f"\033[32m[Git]\033[0m Proveedor detectado: \033[1m{provider.value.upper()}\033[0m | Protocolo: \033[1m{protocol.upper()}\033[0m")

            if protocol == "ssh" and host:
                print(f"\033[90mComprobando autorización SSH con {host}...\033[0m")
                ssh_ok = self._test_ssh(host)
                if ssh_ok:
                    print(f"\033[92m✔ Conexión SSH con {host} verificada con éxito.\033[0m")
                else:
                    print(f"\033[33m⚠ No se pudo verificar la llave SSH silenciosamente. Asegúrate de tener tu clave configurada en {host}.\033[0m")
            elif protocol == "https":
                print("\033[36mℹ Recuerda:\033[0m Por seguridad, GitHub y GitLab requieren un Personal Access Token (PAT). Git Credential Manager gestionará la autenticación sin guardar passwords en el repo.")

            ci_choice = self._ask_choice(
                f"¿Deseas generar la canalización de CI/CD automática para {provider.value.upper()}?",
                "Ejecutará harness-validator y preflight en cada commit o Merge/Pull Request remoto.",
                "docs/08-skills-y-validadores.md §Contrato de salida",
                [
                    (f"Sí, generar pipeline para {provider.value.upper()}", "Crea .gitlab-ci.yml o GitHub Actions automáticamente."),
                    ("No por ahora", "Solo configurar el remoto de Git local."),
                ],
                ai_recommendation=f"Generar pipeline de CI para {provider.value.upper()} para garantizar calidad en remoto.",
                default_index=1,
            )
            setup_ci = "Sí" in ci_choice

            git_config = GitRemoteConfig(
                url=git_url,
                provider=provider,
                auth_protocol=protocol,
                setup_ci=setup_ci,
            )

        # ---------------------------------------------------------------------
        # FASE 7: Datos del Autor / Creador
        # ---------------------------------------------------------------------
        author_name = self._ask_text(
            "Nombre del autor o creador del proyecto",
            "Permite reflejar la autoría y canales profesionales en el README del producto.",
            "docs/02-agents-md.md",
            default="Ángel Díaz Gil",
        )

        author_info = AuthorInfo(
            name=author_name,
            bio="Product Owner, Product Manager y especialista en metodologías ágiles e ingeniería con IA.",
            book="Agile Product Owner: Gestiona productos liderando equipos ágiles: Todo lo que necesitas para convertirte en un Product Owner exitoso",
            book_url="https://www.amazon.es/stores/%C3%81ngel-D%C3%ADaz-Gil/author/B0DS2TY1BY?language=en&ref=ap_rdr&shoppingPortalEnabled=true",
            amazon_url="https://www.amazon.es/stores/%C3%81ngel-D%C3%ADaz-Gil/author/B0DS2TY1BY?language=en&ref=ap_rdr&shoppingPortalEnabled=true",
            linkedin="https://www.linkedin.com/in/angel-diaz-gil/",
            twitter="https://x.com/angel_diaz_gil",
        ) if author_name else AuthorInfo()

        return BootstrapManifest(
            identity=identity,
            stack=stack,
            architecture=ArchitectureConfig(
                style=arch_choice.split("(")[0].strip(),
                persistence=persistence,
            ),
            scopes=default_scopes,
            platform=PlatformConfig(platforms=platform_list, privacy_policy=privacy),
            ui=UIConfig(
                has_ui=has_ui,
                focus_navigation_required=focus_nav,
                css_framework=css_fw,
                key_components=key_components if has_ui else [],
            ),
            failure_modes=failure_modes,
            adr_0001=adr_0001,
            author=author_info,
            git_remote=git_config,
            referenced_documents=self.digest.files_found,
        )
