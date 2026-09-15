from datetime import datetime
from typing import Literal, Optional

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel

Platform = Literal["PC", "PS4", "X1", "SWITCH"]


class AccountBase(SQLModel):
    platform: str
    player_name: str
    tag: Optional[str] = None
    note: Optional[str] = None


class Account(AccountBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    owned_legends: list[str] = Field(default_factory=list, sa_column=Column(JSON))

    # cached from last /sync call
    level: Optional[int] = None
    prestige: Optional[int] = None
    rank_name: Optional[str] = None
    rank_score: Optional[int] = None
    rank_div: Optional[int] = None
    rank_display: Optional[str] = None
    rank_img: Optional[str] = None
    selected_legend: Optional[str] = None
    selected_legend_skin: Optional[str] = None
    kd: Optional[str] = None
    total_kills: Optional[int] = None
    total_damage: Optional[int] = None
    legends_raw: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    total_raw: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    last_synced_at: Optional[datetime] = None


class AccountCreate(AccountBase):
    platform: Platform
    owned_legends: list[str] = []


class AccountUpdate(SQLModel):
    platform: Optional[Platform] = None
    tag: Optional[str] = None
    note: Optional[str] = None
    owned_legends: Optional[list[str]] = None
