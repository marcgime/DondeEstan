"""Data models for OpenSpec sync-sdd."""

from pydantic import BaseModel, ConfigDict, Field


class SddSyncItem(BaseModel):
    model_config = ConfigDict(frozen=True)

    item_type: str  # "module" | "change"
    item_id: str
    path: str
    target: str = ""
    status: str
    sync_state: str  # "PRESENT" | "PENDING_TASKS" | "READY_TO_CONSOLIDATE" | "DIVERGED" | "MISSING" | "N/A"
    details: str = ""
    pending_tasks: int = 0
    completed_tasks: int = 0


class SddSyncReport(BaseModel):
    model_config = ConfigDict(frozen=True)

    total_modules: int
    total_changes: int
    present: int
    pending: int
    diverged: int
    items: list[SddSyncItem] = Field(default_factory=list)
    is_successful: bool = True
