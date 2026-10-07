"""Create a demo account with sample hosted zones and DNS records."""

import crud
import models
import schemas
from database import SessionLocal


DEMO_EMAIL = "demo@example.com"
DEMO_PASSWORD = "Demo@12345"

SAMPLE_ZONES = {
    "example.com": [
        ("www", "A", "192.0.2.10"),
        ("mail", "MX", "10 mail.example.com"),
    ],
    "example.net": [
        ("api", "AAAA", "2001:db8::10"),
        ("policy", "TXT", '"v=DMARC1; p=none"'),
    ],
    "example.org": [("status", "CNAME", "www.example.org")],
}


def seed_demo_data() -> None:
    db = SessionLocal()
    try:
        if crud.get_user_by_email(db, DEMO_EMAIL) is None:
            crud.create_user(db, DEMO_EMAIL, DEMO_PASSWORD)

        for zone_name, sample_records in SAMPLE_ZONES.items():
            zone = db.query(models.HostedZone).filter(
                models.HostedZone.user_id == DEMO_EMAIL,
                models.HostedZone.name == zone_name,
            ).first()
            if zone is None:
                zone = crud.create_zone(db, schemas.HostedZoneCreate(name=zone_name), DEMO_EMAIL)
            if zone is None:
                continue

            for record_name, record_type, value in sample_records:
                existing = db.query(models.Record).filter(
                    models.Record.zone_id == zone.id,
                    models.Record.name == f"{record_name}.{zone_name}",
                    models.Record.type == record_type,
                    models.Record.set_identifier == "",
                ).first()
                if existing is None:
                    crud.create_record(
                        db,
                        zone.id,
                        schemas.RecordCreate(name=record_name, type=record_type, value=value),
                        DEMO_EMAIL,
                    )
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_data()
    print(f"Demo account ready: {DEMO_EMAIL}")
