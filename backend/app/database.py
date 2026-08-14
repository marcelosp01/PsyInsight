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


def init_database() -> None:
    """Create any missing tables without touching existing data. Called on
    app startup so usuarios e laudos salvos sobrevivem a restarts do contêiner."""
    import app.models  # noqa: F401  (ensure models are registered on Base)

    Base.metadata.create_all(bind=engine)
    _ensure_user_local_atendimento_column()
    _ensure_user_chat_preferences_columns()
    _ensure_user_logo_columns()


def _ensure_user_local_atendimento_column() -> None:
    """`create_all` só cria tabelas que ainda não existem — não adiciona colunas
    novas a tabelas já existentes. Sem isso, um banco criado antes do PSYIN-4
    nunca ganharia a coluna `local_atendimento` sem apagar os dados."""
    with engine.connect() as connection:
        columns = {row[1] for row in connection.exec_driver_sql("PRAGMA table_info(users)")}
        if "local_atendimento" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE users ADD COLUMN local_atendimento VARCHAR(255) NOT NULL DEFAULT ''"
            )
            connection.commit()


def _ensure_user_chat_preferences_columns() -> None:
    """Mesmo motivo de `_ensure_user_local_atendimento_column`, para as colunas
    de preferência de layout do chat adicionadas no PSYIN-6."""
    with engine.connect() as connection:
        columns = {row[1] for row in connection.exec_driver_sql("PRAGMA table_info(users)")}
        if "chat_input_size" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE users ADD COLUMN chat_input_size VARCHAR(20) NOT NULL DEFAULT 'medio'"
            )
        if "chat_font_size" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE users ADD COLUMN chat_font_size VARCHAR(20) NOT NULL DEFAULT 'medio'"
            )
        connection.commit()


def _ensure_user_logo_columns() -> None:
    """Mesmo motivo de `_ensure_user_local_atendimento_column`, para os metadados
    da logomarca (PSYIN-7). A imagem em si não fica no banco (ver settings.logos_dir)."""
    with engine.connect() as connection:
        columns = {row[1] for row in connection.exec_driver_sql("PRAGMA table_info(users)")}
        if "has_logo" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE users ADD COLUMN has_logo BOOLEAN NOT NULL DEFAULT 0"
            )
        if "logo_version" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE users ADD COLUMN logo_version INTEGER NOT NULL DEFAULT 0"
            )
        connection.commit()


def reset_database() -> None:
    """Drop and recreate all tables. Used to isolate each test run."""
    import app.models  # noqa: F401  (ensure models are registered on Base)

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
