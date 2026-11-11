"""
Bootstrap Harness Data Models (Pydantic V2).
Diseñado para admitir personalización asistida por IA y plantillas basadas en .ai-harness/*.md.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Any
from pydantic import BaseModel, ConfigDict, Field


class ProductArchetype(StrEnum):
    GUI_APP = "gui_app"          # Aplicaciones con interfaz gráfica (Móvil, Web, Desktop, TV)
    BACKEND_API = "backend_api"  # Servicios web, REST, GraphQL, microservicios
    CLI_TOOL = "cli_tool"        # Herramientas de terminal y automatización
    LIBRARY = "library"          # SDKs, paquetes y librerías reutilizables
    GENERIC = "generic"          # Arquetipo agnóstico


class StackType(StrEnum):
    GENERIC = "generic"
    FLUTTER = "flutter"
    DART = "dart"
    PYTHON = "python"
    NODE = "node"
    GO = "go"
    RUST = "rust"


class GitProvider(StrEnum):
    GITLAB = "gitlab"
    GITHUB = "github"
    BITBUCKET = "bitbucket"
    OTHER = "other"
    NONE = "none"


class GitRemoteConfig(BaseModel):
    model_config = ConfigDict(frozen=True)

    url: str = Field(default="", description="URL del repositorio remoto Git")
    provider: GitProvider = Field(default=GitProvider.NONE, description="Proveedor Git detectado")
    auth_protocol: str = Field(default="ssh", description="Protocolo de autenticación: ssh | https")
    setup_ci: bool = Field(default=True, description="Generar pipeline de CI (.gitlab-ci.yml o GitHub Actions)")


class ProjectIdentity(BaseModel):
    model_config = ConfigDict(frozen=True)

    name: str = Field(..., description="Nombre comercial del producto")
    slug: str = Field(..., description="Identificador corto en minúsculas y guiones")
    description: str = Field(..., description="Propuesta de valor en una o dos frases")
    target_audience: str = Field(
        default="Usuarios finales y desarrolladores",
        description="Público objetivo o tipo de usuario principal",
    )
    archetype: ProductArchetype = Field(
        default=ProductArchetype.GUI_APP,
        description="Arquetipo del producto (gui_app, backend_api, cli_tool, library)",
    )


class TechStack(BaseModel):
    model_config = ConfigDict(frozen=True)

    stack_type: StackType = Field(default=StackType.GENERIC, description="Tipo de stack base")
    language: str = Field(..., description="Lenguaje de programación principal")
    framework: str = Field(default="", description="Framework de desarrollo (ej. Flutter, FastAPI, Express)")
    package_manager: str = Field(default="", description="Gestor de paquetes (pub, poetry, pip, pnpm, npm)")
    min_runtime_version: str = Field(default="", description="Versión mínima del runtime")
    launch_command: str = Field(default="", description="Comando para arrancar la aplicación")
    test_command: str = Field(default="", description="Comando para ejecutar tests")


class ArchitectureConfig(BaseModel):
    model_config = ConfigDict(frozen=True)

    style: str = Field(default="Clean Architecture", description="Estilo arquitectónico")
    layers: list[str] = Field(
        default_factory=lambda: ["domain", "application", "infrastructure", "presentation"],
        description="Capas ordenadas del sistema",
    )
    persistence: str = Field(default="none", description="Motor de persistencia (sqlite, postgres, in_memory, none)")
    forbidden_packages: list[str] = Field(
        default_factory=list,
        description="Paquetes cuya importación está formalmente vetada",
    )
    forbidden_imports: list[str] = Field(
        default_factory=list,
        description="Reglas de importación prohibidas entre capas",
    )


class ScopeDefinition(BaseModel):
    model_config = ConfigDict(frozen=True)

    name: str = Field(..., description="Nombre del módulo (ej. auth, catalog, billing)")
    title: str = Field(..., description="Título legible del scope")
    description: str = Field(..., description="Responsabilidad del bloque funcional")
    path_roots: list[str] = Field(default_factory=list, description="Directorios autorizados")
    forbidden_paths: list[str] = Field(default_factory=list, description="Directorios prohibidos")


class PlatformConfig(BaseModel):
    model_config = ConfigDict(frozen=True)

    platforms: list[str] = Field(
        default_factory=lambda: ["Web", "Linux", "Windows"],
        description="Plataformas objetivo",
    )
    privacy_policy: str = Field(
        default="zero_telemetry",
        description="Política de telemetría (zero_telemetry, anonymous_crash_only)",
    )
    secrets_management: str = Field(
        default="env_vars",
        description="Estrategia de gestión de secretos",
    )


class UIConfig(BaseModel):
    model_config = ConfigDict(frozen=True)

    has_ui: bool = Field(default=True, description="Indica si el sistema incluye interfaz gráfica")
    theme_preference: str = Field(default="dark", description="Preferencia de tema (dark, light, adaptive)")
    css_framework: str = Field(default="tailwind", description="Framework de diseño o estilos (tailwind, flutter_theme, css_modules, vanilla)")
    focus_navigation_required: bool = Field(
        default=False,
        description="Exigir navegación estricta por foco / D-Pad (solo TV / consolas)",
    )
    custom_tokens: dict[str, Any] | None = Field(
        default=None,
        description="Tokens de diseño recuperados del brief/PRD (colores de marca, tipografías reales)",
    )
    key_components: list[str] = Field(
        default_factory=list,
        description="Componentes visuales clave requeridos por el producto",
    )


class FailureModeItem(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: str = Field(..., description="Identificador FM-NN")
    title: str = Field(..., description="Título del modo de fallo")
    symptom: str = Field(..., description="Cómo se manifiesta el fallo")
    root_cause: str = Field(..., description="Causa raíz técnica o asunción incorrecta de la IA")
    mitigation: str = Field(..., description="Regla preventiva y verificación")
    bad_code: str = Field(default="", description="Ejemplo de código erróneo típico de IA")
    good_code: str = Field(default="", description="Ejemplo de código canónico correcto")


class AuthorInfo(BaseModel):
    model_config = ConfigDict(frozen=True)

    name: str = Field(default="", description="Nombre completo del autor o mantenedor")
    bio: str = Field(default="", description="Breve biografía o rol profesional")
    book: str = Field(default="", description="Libro publicado o publicación relevante")
    book_url: str = Field(default="", description="Enlace a la publicación o tienda")
    amazon_url: str = Field(default="", description="Enlace al perfil de autor en Amazon")
    linkedin: str = Field(default="", description="URL del perfil de LinkedIn")
    twitter: str = Field(default="", description="URL del perfil de X/Twitter")


class ADRItem(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: str = Field(default="ADR-0001", description="Identificador de la decisión")
    title: str = Field(..., description="Título de la decisión arquitectónica")
    status: str = Field(default="Aceptada", description="Estado de la decisión")
    context: str = Field(..., description="Contexto técnico y fuerzas en juego")
    decision: str = Field(..., description="Decisión adoptada")
    consequences: str = Field(..., description="Consecuencias positivas y negativas")


class BootstrapManifest(BaseModel):
    model_config = ConfigDict(frozen=True)

    identity: ProjectIdentity
    stack: TechStack
    architecture: ArchitectureConfig
    scopes: list[ScopeDefinition]
    platform: PlatformConfig
    ui: UIConfig
    failure_modes: list[FailureModeItem]
    adr_0001: ADRItem
    author: AuthorInfo = Field(default_factory=AuthorInfo, description="Datos biográficos y profesionales del autor")
    git_remote: GitRemoteConfig = Field(default_factory=GitRemoteConfig)
    referenced_documents: list[str] = Field(
        default_factory=list,
        description="Documentos de .ai-harness/input analizados para alimentar el arnés",
    )
    custom_context_overrides: dict[str, str] = Field(
        default_factory=dict,
        description="Contenido textual enriquecido generado por la IA para cada documento de context/",
    )

    @property
    def project(self) -> ProjectIdentity:
        return self.identity
