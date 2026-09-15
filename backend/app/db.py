import sys
from pathlib import Path

from sqlmodel import Session, SQLModel, create_engine

# In a PyInstaller build, __file__ resolves inside the temp extraction dir
# (wiped and recreated every launch), so the DB has to live next to the .exe
# instead — otherwise every run would start with an empty database.
if getattr(sys, "frozen", False):
    APP_DIR = Path(sys.executable).resolve().parent
else:
    APP_DIR = Path(__file__).resolve().parents[2]

DB_PATH = APP_DIR / "data" / "apez.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)
engine = create_engine(f"sqlite:///{DB_PATH}")


def init_db():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
