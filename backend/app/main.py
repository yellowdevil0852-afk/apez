import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .api.accounts import router as accounts_router
from .db import init_db

# PyInstaller extracts bundled data files (--add-data) under sys._MEIPASS at
# runtime instead of next to this source file.
if getattr(sys, "frozen", False):
    BUNDLE_DIR = Path(sys._MEIPASS)
else:
    BUNDLE_DIR = Path(__file__).resolve().parents[2]

FRONTEND_DIR = BUNDLE_DIR / "frontend"
LEGEND_IMG_DIR = BUNDLE_DIR / "apex_char_img"


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Apez", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(accounts_router)


@app.get("/health")
def health():
    return {"status": "ok"}


app.mount("/legend-img", StaticFiles(directory=LEGEND_IMG_DIR), name="legend-img")
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
