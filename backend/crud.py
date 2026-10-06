from sqlalchemy.orm import Session
import models, schemas


def get_zones(db:Session):
    return db.query(models.HostedZone).all()
def get_zone(db:Session,zone_id:int):
    return db.query(models.HostedZone).filter(models.HostedZone.id==zone_id).first()
def create_zone(db: Session, zone: schemas.HostedZoneCreate):
    db_zone = models.HostedZone(name=zone.name, comment=zone.comment)
    db.add(db_zone)
    db.commit()
    db.refresh(db_zone)
    return db_zone
def update_zone(db: Session, zone_id: int, zone: schemas.HostedZoneUpdate):
    db_zone = get_zone(db, zone_id)
    for key, value in zone.model_dump(exclude_unset=True).items():
        setattr(db_zone, key, value)
    db.commit()
    db.refresh(db_zone)
    return db_zone

def delete_zone(db: Session, zone_id: int):
    db_zone = get_zone(db, zone_id)
    db.delete(db_zone)
    db.commit()
def get_records(db: Session, zone_id: int):
    return db.query(models.Record).filter(models.Record.zone_id == zone_id).all()

def create_record(db: Session, zone_id: int, record: schemas.RecordCreate):
    db_record = models.Record(zone_id=zone_id, **record.model_dump())
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record
def update_record(db: Session, record_id: int, record: schemas.RecordUpdate):
    db_record = db.query(models.Record).filter(models.Record.id == record_id).first()
    for key, value in record.model_dump(exclude_unset=True).items():
        setattr(db_record, key, value)
    db.commit()
    db.refresh(db_record)
    return db_record
def delete_record(db: Session, record_id: int):
    db_record = db.query(models.Record).filter(models.Record.id == record_id).first()
    db.delete(db_record)
    db.commit()