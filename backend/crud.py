from sqlalchemy.orm import Session
import models, schemas, secrets, hashlib
import bcrypt

ns_sets = [
    ["ns-111.awsdns-01.com.", "ns-222.awsdns-02.net.", "ns-333.awsdns-03.org.", "ns-444.awsdns-04.co.uk."],
    ["ns-555.awsdns-05.com.", "ns-666.awsdns-06.net.", "ns-777.awsdns-07.org.", "ns-888.awsdns-08.co.uk."],
    ["ns-999.awsdns-09.com.", "ns-110.awsdns-10.net.", "ns-120.awsdns-11.org.", "ns-130.awsdns-12.co.uk."],
]

def get_zones(db: Session, user_id: str):
    return db.query(models.HostedZone).filter(models.HostedZone.user_id == user_id).all()

def get_zone(db: Session, zone_id: int, user_id: str):
    return db.query(models.HostedZone).filter(models.HostedZone.id == zone_id, models.HostedZone.user_id == user_id).first()

def create_zone(db: Session, zone: schemas.HostedZoneCreate, user_id: str):
    existing = db.query(models.HostedZone).filter(models.HostedZone.user_id == user_id, models.HostedZone.name == zone.name).first()
    if existing:
        return None
    db_zone = models.HostedZone(name=zone.name, comment=zone.comment, zone_type=zone.zone_type or "public", user_id=user_id)
    db.add(db_zone)
    db.commit()
    db.refresh(db_zone)
    db_zone.record_count = 0
    # Deterministic NS/SOA based on zone name
    idx = int(hashlib.md5(zone.name.encode()).hexdigest(), 16) % 3
    ns_list = ns_sets[idx]
    for ns in ns_list:
        db.add(models.Record(zone_id=db_zone.id, name=zone.name, type="NS", value=ns, ttl=172800))
    soa = f"{ns_list[0]} awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400"
    db.add(models.Record(zone_id=db_zone.id, name=zone.name, type="SOA", value=soa, ttl=900))
    db_zone.record_count = 5
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
    zone.record_count = (zone.record_count or 0) + 1
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
        zone = get_zone(db, db_record.zone_id, user_id)
        if zone:
            zone.record_count = max((zone.record_count or 0) - 1, 0)
        db.delete(db_record)
        db.commit()

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def create_user(db, email, password):
    u = models.User(email=email, password=hash_password(password))
    db.add(u)
    db.commit()
    db.refresh(u)
    return u

def get_user_by_email(db, email):
    return db.query(models.User).filter(models.User.email == email).first()

def verify_user(db, email, password):
    u = get_user_by_email(db, email)
    if u and bcrypt.checkpw(password.encode(), u.password.encode()):
        return u
    return None

def create_session(db, email):
    token = secrets.token_hex(32)
    s = models.Session(token=token, user_email=email)
    db.add(s)
    db.commit()
    return s

def get_session(db, token):
    return db.query(models.Session).filter(models.Session.token == token).first()

def delete_session(db, token):
    s = get_session(db, token)
    if s:
        db.delete(s)
        db.commit()
