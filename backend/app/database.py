from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

settings.database_path.parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(
    f"sqlite:///{settings.database_path}",
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def reset_database() -> None:
    """Drop and recreate all tables. Called on app startup so each container
    boots with a clean database, per project requirements."""
    import app.models  # noqa: F401  (ensure models are registered on Base)

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
