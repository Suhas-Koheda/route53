import hashlib
import os
import string

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./route53.db")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

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


def generate_zone_id_str(zone_id: int) -> str:
    """Deterministic 'Z' + 13 uppercase alphanumerics derived from the zone id."""
    digest = hashlib.sha256(f"zone-{zone_id}".encode()).hexdigest()
    alphabet = string.ascii_uppercase + string.digits
    chars = [alphabet[int(digest[i * 2 : i * 2 + 2], 16) % len(alphabet)] for i in range(13)]
    return "Z" + "".join(chars)
