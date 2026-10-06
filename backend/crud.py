from sqlalchemy.orm import Session
import models, schemas


def get_zones(db: Session, user_id: str):
    return db.query(models.HostedZone).filter(models.HostedZone.user_id == user_id).all()

def get_zone(db: Session, zone_id: int, user_id: str):
    return db.query(models.HostedZone).filter(models.HostedZone.id == zone_id, models.HostedZone.user_id == user_id).first()

def create_zone(db: Session, zone: schemas.HostedZoneCreate, user_id: str):
    db_zone = models.HostedZone(name=zone.name, comment=zone.comment, user_id=user_id)
    db.add(db_zone)
    db.commit()
    db.refresh(db_zone)
    return db_zone

def update_zone(db: Session, zone_id: int, zone: schemas.HostedZoneUpdate, user_id: str):
    db_zone = get_zone(db, zone_id, user_id)
    if not db_zone:
        return None
    for key, value in zone.model_dump(exclude_unset=True).items():
        setattr(db_zone, key, value)
    db.commit()
    db.refresh(db_zone)
    return db_zone

def delete_zone(db: Session, zone_id: int, user_id: str):
    db_zone = get_zone(db, zone_id, user_id)
    if db_zone:
        db.delete(db_zone)
        db.commit()

def get_records(db: Session, zone_id: int, user_id: str):
    zone = get_zone(db, zone_id, user_id)
    if not zone:
        return None
    return db.query(models.Record).filter(models.Record.zone_id == zone_id).all()

def create_record(db: Session, zone_id: int, record: schemas.RecordCreate, user_id: str):
    zone = get_zone(db, zone_id, user_id)
    if not zone:
        return None
    db_record = models.Record(zone_id=zone_id, **record.model_dump())
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record

def get_record(db: Session, record_id: int, user_id: str):
    rec = db.query(models.Record).filter(models.Record.id == record_id).first()
    if rec and get_zone(db, rec.zone_id, user_id):
        return rec
    return None

def update_record(db: Session, record_id: int, record: schemas.RecordUpdate, user_id: str):
    db_record = get_record(db, record_id, user_id)
    if not db_record:
        return None
    for key, value in record.model_dump(exclude_unset=True).items():
        setattr(db_record, key, value)
    db.commit()
    db.refresh(db_record)
    return db_record

def delete_record(db: Session, record_id: int, user_id: str):
    db_record = get_record(db, record_id, user_id)
    if db_record:
        db.delete(db_record)
        db.commit()

def create_user(db, email, password):
    u = models.User(email=email, password=password)
    db.add(u)
    db.commit()
    db.refresh(u)
    return u

def get_user_by_email(db, email):
    return db.query(models.User).filter(models.User.email == email).first()
