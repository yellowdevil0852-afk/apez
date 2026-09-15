from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..db import get_session
from ..models import Account, AccountCreate, AccountUpdate
from ..services.fetcher import (
    format_rank,
    get_player_stats,
    parse_legend_stats,
    played_legends,
    total_stat_by_key,
    total_stat_max,
)

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.post("", response_model=Account)
def create_account(payload: AccountCreate, session: Session = Depends(get_session)):
    account = Account.model_validate(payload)
    session.add(account)
    session.commit()
    session.refresh(account)
    return account


@router.get("", response_model=list[Account])
def list_accounts(session: Session = Depends(get_session)):
    return session.exec(select(Account)).all()


@router.get("/{account_id}", response_model=Account)
def get_account(account_id: int, session: Session = Depends(get_session)):
    account = session.get(Account, account_id)
    if not account:
        raise HTTPException(404, "Account not found")
    return account


@router.patch("/{account_id}", response_model=Account)
def update_account(
    account_id: int, payload: AccountUpdate, session: Session = Depends(get_session)
):
    account = session.get(Account, account_id)
    if not account:
        raise HTTPException(404, "Account not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(account, key, value)
    session.add(account)
    session.commit()
    session.refresh(account)
    return account


@router.delete("/{account_id}")
def delete_account(account_id: int, session: Session = Depends(get_session)):
    account = session.get(Account, account_id)
    if not account:
        raise HTTPException(404, "Account not found")
    session.delete(account)
    session.commit()
    return {"ok": True}


@router.post("/{account_id}/sync", response_model=Account)
def sync_account(account_id: int, session: Session = Depends(get_session)):
    account = session.get(Account, account_id)
    if not account:
        raise HTTPException(404, "Account not found")

    try:
        data = get_player_stats(account.player_name, account.platform)
    except httpx.HTTPError as exc:
        raise HTTPException(502, f"Stats lookup failed: {exc}") from exc

    g = data["global"]
    account.level = g["level"]
    account.prestige = g.get("levelPrestige")
    account.rank_name = g["rank"]["rankName"]
    account.rank_score = g["rank"]["rankScore"]
    account.rank_div = g["rank"]["rankDiv"]
    account.rank_display = format_rank(g["rank"]["rankName"], g["rank"]["rankDiv"], g["rank"]["rankScore"])
    account.rank_img = g["rank"].get("rankImg")
    account.selected_legend = data["realtime"]["selectedLegend"]
    account.selected_legend_skin = data["legends"]["selected"]["gameInfo"]["skin"]

    kd_value = data["total"].get("kd", {}).get("value")
    account.kd = kd_value if kd_value not in (None, "-1", -1) else None
    career_kills = total_stat_by_key(data, "career_kills")
    account.total_kills = career_kills if career_kills is not None else total_stat_max(data, "BR Kills")
    account.total_damage = total_stat_max(data, "BR Damage")
    account.legends_raw = data["legends"]["all"]
    account.total_raw = data["total"]

    # Playing a legend proves ownership (Apex won't let you pick a locked
    # one) — merge that in as a lower bound. The currently-selected legend
    # counts too, even when the API has no per-legend stat history for the
    # account (sparse accounts where only name/rank/current legend come
    # through) — you can't have a legend selected without owning it. Never
    # removes a manually-added legend, and never overwrites the list, just
    # fills gaps.
    confirmed_legends = played_legends(account.legends_raw)
    if account.selected_legend:
        confirmed_legends.add(account.selected_legend)
    existing_legends = list(account.owned_legends or [])
    newly_confirmed = sorted(confirmed_legends - set(existing_legends))
    account.owned_legends = existing_legends + newly_confirmed

    account.last_synced_at = datetime.now(timezone.utc)

    session.add(account)
    session.commit()
    session.refresh(account)
    return account


@router.get("/{account_id}/legend-stats")
def get_legend_stats(account_id: int, session: Session = Depends(get_session)):
    account = session.get(Account, account_id)
    if not account:
        raise HTTPException(404, "Account not found")
    return parse_legend_stats(account.legends_raw)
