"""
Git Publish Data Models (Pydantic V2).
"""

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class GitAction(StrEnum):
    PUSH = "push"
    PULL = "pull"
    SYNC = "sync"
    STATUS = "status"


class GitPublishConfig(BaseModel):
    model_config = ConfigDict(frozen=True)

    action: GitAction = Field(default=GitAction.PUSH, description="Acción de Git a realizar")
    message: str | None = Field(
        default=None, description="Mensaje de commit (requerido para push/sync)"
    )
    branch: str | None = Field(
        default=None, description="Nombre de la rama objetivo (por defecto la actual)"
    )
    remote: str = Field(default="origin", description="Nombre del remoto (default: origin)")
    skip_verify: bool = Field(
        default=False, description="Saltar comprobaciones preflight (NO RECOMENDADO)"
    )
    rebase: bool = Field(default=True, description="Usar --rebase en operaciones de pull")


class GitPublishResult(BaseModel):
    model_config = ConfigDict(frozen=True)

    success: bool
    action: GitAction
    branch: str
    message: str
    preflight_passed: bool
    stdout: str
    stderr: str
