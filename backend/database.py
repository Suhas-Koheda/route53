import hashlib
import os
import string

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./route53.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_connection, _connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _table_columns(conn, table: str) -> set[str]:
    try:
        rows = conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
    except Exception:
        return set()
    return {row[1] for row in rows}


def generate_zone_id_str(zone_id: int) -> str:
    """Deterministic 'Z' + 13 uppercase alphanumerics derived from the zone id."""
    digest = hashlib.sha256(f"zone-{zone_id}".encode()).hexdigest()
    alphabet = string.ascii_uppercase + string.digits
    chars = [alphabet[int(digest[i * 2 : i * 2 + 2], 16) % len(alphabet)] for i in range(13)]
    return "Z" + "".join(chars)


def run_migrations(bind) -> None:
    """Safe, idempotent startup migration for existing route53.db files.

    Adds newly-required columns to ``hosted_zones`` and backfills them.
    Safe to run repeatedly: columns that already exist are left untouched.
    """
    with bind.connect() as conn:
        cols = _table_columns(conn, "hosted_zones")
        if not cols:
            return
        if "created_by" not in cols:
            conn.execute(text("ALTER TABLE hosted_zones ADD COLUMN created_by VARCHAR"))
            conn.execute(text("UPDATE hosted_zones SET created_by = user_id WHERE created_by IS NULL"))
        if "zone_id_str" not in cols:
            conn.execute(text("ALTER TABLE hosted_zones ADD COLUMN zone_id_str VARCHAR"))
            rows = conn.execute(text("SELECT id FROM hosted_zones WHERE zone_id_str IS NULL or zone_id_str = ''")).fetchall()
            for (zone_id,) in rows:
                zid = generate_zone_id_str(zone_id)
                conn.execute(
                    text("UPDATE hosted_zones SET zone_id_str = :z WHERE id = :id"),
                    {"z": zid, "id": zone_id},
                )
        # Records: backfill NULL set_identifier to '' for the unique constraint
        rec_cols = _table_columns(conn, "records")
        if rec_cols:
            conn.execute(text("UPDATE records SET set_identifier = '' WHERE set_identifier IS NULL"))
        conn.commit()
