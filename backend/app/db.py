import os
import sys
from pathlib import Path

from sqlmodel import Session, SQLModel, create_engine

# run_app.py asks the user where to keep their data on first run and passes
# it via this env var (packaged .exe only). Falls back to next to the .exe
# (frozen with no picker run) or the project's data/ folder (dev, from
# source) — __file__ resolves inside PyInstaller's temp extraction dir,
# wiped and recreated every launch, so that alone can't be used when frozen.
if "APEZ_DATA_DIR" in os.environ:
    DB_PATH = Path(os.environ["APEZ_DATA_DIR"]) / "apez.db"
elif getattr(sys, "frozen", False):
    DB_PATH = Path(sys.executable).resolve().parent / "data" / "apez.db"
else:
    DB_PATH = Path(__file__).resolve().parents[2] / "data" / "apez.db"

DB_PATH.parent.mkdir(parents=True, exist_ok=True)
engine = create_engine(f"sqlite:///{DB_PATH}")


def init_db():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
