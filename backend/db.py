import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

BASE_DIR = os.path.dirname(__file__)
DEFAULT_SQLITE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'mockup.db')}"


def database_url() -> str:
    url = os.getenv("DATABASE_URL")
    if url:
        # Allow shorthand postgres:// to work with SQLAlchemy 2+
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg://", 1)
        return url
    return DEFAULT_SQLITE_URL


engine = create_engine(database_url(), future=True, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
Base = declarative_base()


def get_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
