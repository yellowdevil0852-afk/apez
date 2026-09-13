# Apez — Multi-Account Apex Legends Dashboard

Personal dashboard for tracking stats/assets across multiple Apex Legends
accounts, plus a lightweight local agent for switching Steam accounts.

## Architecture

- `backend/` — FastAPI service: fetches stats from a third-party API,
  stores snapshots, computes derived stats (streaks, pity progress, etc.)
- `frontend/` — Web dashboard (charts, account list)
- `desktop-agent/` — Lightweight local tray app that switches the active
  Steam account on request from the dashboard (`apex-hub://switch?id=...`)

No account passwords are ever stored — only public player IDs and local
Steam session tokens (kept on-device only).

## Status

Early scaffolding — architecture and third-party data source under
validation.
