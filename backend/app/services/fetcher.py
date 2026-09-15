import os
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv

# In a packaged .exe there's no .env next to the source — instead one is
# bundled into the build at build time (see build_exe.bat) so a shared key
# ships inside the .exe without ever being committed to the repo.
if getattr(sys, "frozen", False):
    load_dotenv(Path(sys._MEIPASS) / ".env")
else:
    load_dotenv()

API_KEY = os.environ["APEX_API_KEY"]
BASE_URL = "https://api.mozambiquehe.re/bridge"


def get_player_stats(player: str, platform: str = "PC") -> dict:
    resp = httpx.get(
        BASE_URL,
        params={"player": player, "platform": platform, "auth": API_KEY},
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()


# RP floor for the start of each (tier, division) — division 4 is the tier's
# entry point, division 1 is right before the next tier. Source: community
# rank guides for the current RP-based ranked system; Respawn tweaks these
# occasionally between seasons, so treat the % as an estimate, not gospel.
RANK_THRESHOLDS = [
    ("Bronze", 4, 1000), ("Bronze", 3, 1500), ("Bronze", 2, 2000), ("Bronze", 1, 2500),
    ("Silver", 4, 3000), ("Silver", 3, 3500), ("Silver", 2, 4000), ("Silver", 1, 4500),
    ("Gold", 4, 5250), ("Gold", 3, 6000), ("Gold", 2, 6750), ("Gold", 1, 7500),
    ("Platinum", 4, 8250), ("Platinum", 3, 9250), ("Platinum", 2, 10250), ("Platinum", 1, 11000),
    ("Diamond", 4, 12000), ("Diamond", 3, 13000), ("Diamond", 2, 14000), ("Diamond", 1, 15000),
    ("Master", None, 16000),
]

TIER_ZH = {
    "Rookie": "新手",
    "Bronze": "青銅",
    "Silver": "白銀",
    "Gold": "黃金",
    "Platinum": "鉑金",
    "Diamond": "鑽石",
    "Master": "大師",
    "Apex Predator": "獵殺者",
}

DIV_ZH = {1: "一", 2: "二", 3: "三", 4: "四"}


def format_rank(rank_name: str, rank_div: int | None, rank_score: int) -> str:
    """'鑽石二 - 68%' style label: tier + division in Chinese, plus progress
    toward the next division based on RANK_THRESHOLDS. Falls back to a plain
    RP readout for tiers without a fixed ceiling (Master/Predator) or an
    unrecognized tier name."""
    tier_zh = TIER_ZH.get(rank_name, rank_name)

    if rank_name in ("Master", "Apex Predator"):
        return f"{tier_zh} - {rank_score} RP"

    floor = ceiling = None
    for i, (tier, div, rp) in enumerate(RANK_THRESHOLDS):
        if tier == rank_name and div == rank_div:
            floor = rp
            ceiling = RANK_THRESHOLDS[i + 1][2] if i + 1 < len(RANK_THRESHOLDS) else None
            break

    if floor is None or ceiling is None or rank_div is None:
        return f"{tier_zh}{DIV_ZH.get(rank_div, '')} - {rank_score} RP"

    pct = max(0, min(100, round((rank_score - floor) / (ceiling - floor) * 100)))
    return f"{tier_zh}{DIV_ZH.get(rank_div, '')} - {pct}%"


def total_stat_max(data: dict, stat_name: str) -> int | None:
    """Best available reading for a named stat (e.g. 'BR Damage') when no
    single dedicated key exists for it. The API's `total` block carries the
    same display name under more than one key (e.g. both `kills` and
    `specialEvent_kills` are labeled 'BR Kills') — take the max of whichever
    entries match by name. Verified against the in-game stats screen this is
    NOT the true lifetime total (it undercounts, likely only accumulating
    since that particular tracker was introduced) — it's an approximation,
    used where the API exposes no proper career_* counter for the stat."""
    best = None
    for entry in data.get("total", {}).values():
        value = entry.get("value") if isinstance(entry, dict) else None
        if isinstance(entry, dict) and entry.get("name") == stat_name and isinstance(value, (int, float)):
            if best is None or value > best:
                best = value
    return best


def total_stat_by_key(data: dict, key: str) -> int | None:
    """Direct lookup of a `total` block entry by its own key, e.g.
    'career_kills' — for the handful of stats where the API does expose a
    real dedicated lifetime counter, this is authoritative (verified against
    the in-game stats screen), unlike the name-matching in total_stat_max."""
    entry = data.get("total", {}).get(key)
    value = entry.get("value") if isinstance(entry, dict) else None
    return value if isinstance(value, (int, float)) else None


def played_legends(legends_all: dict) -> set[str]:
    """Legends with any recorded stat data — proof of ownership, since Apex
    won't let you play a legend you haven't unlocked. This is a lower bound:
    a legend bought but never played won't show up here, so it's meant to
    be merged into (not replace) a manually-maintained owned list."""
    return {
        legend_name
        for legend_name, legend_data in (legends_all or {}).items()
        if legend_name != "Global" and legend_data.get("data")
    }


def parse_legend_stats(legends_all: dict) -> list[dict]:
    """Per-legend stat breakdown for every legend this account has actually
    played (legends with no recorded data are skipped — never played, so
    nothing to show). Each stat entry keeps its name/value and, when the API
    has calculated it, the global percentile rank. `legends_all` is the raw
    `data["legends"]["all"]` block, stored verbatim at sync time so this can
    run later without re-hitting the third-party API."""
    out = []
    for legend_name, legend_data in (legends_all or {}).items():
        entries = legend_data.get("data") or []
        if not entries:
            continue
        stats = []
        for entry in entries:
            top_percent = None
            rank = entry.get("rank") or {}
            if isinstance(rank.get("topPercent"), (int, float)):
                top_percent = rank["topPercent"]
            stats.append({
                "name": entry.get("name"),
                "value": entry.get("value"),
                "top_percent": top_percent,
            })
        out.append({"legend": legend_name, "stats": stats})
    return out


if __name__ == "__main__":
    import sys

    player = sys.argv[1]
    platform = sys.argv[2] if len(sys.argv) > 2 else "PC"
    data = get_player_stats(player, platform)
    print(data)
