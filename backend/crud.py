from sqlalchemy.orm import Session
from sqlalchemy import func
import models, schemas, secrets, hashlib, re
import bcrypt
from datetime import datetime, timezone, timedelta

ns_sets = [
    ["ns-111.awsdns-01.com.", "ns-222.awsdns-02.net.", "ns-333.awsdns-03.org.", "ns-444.awsdns-04.co.uk."],
    ["ns-555.awsdns-05.com.", "ns-666.awsdns-06.net.", "ns-777.awsdns-07.org.", "ns-888.awsdns-08.co.uk."],
    ["ns-999.awsdns-09.com.", "ns-110.awsdns-10.net.", "ns-120.awsdns-11.org.", "ns-130.awsdns-12.co.uk."],
]

SESSION_TTL_DAYS = 7


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def get_zones(db: Session, user_id: str, q: str = "", limit: int | None = None, offset: int = 0):
    query = db.query(models.HostedZone).filter(models.HostedZone.user_id == user_id)
    if q:
        like = f"%{q.lower()}%"
        query = query.filter(
            func.lower(models.HostedZone.name).like(like) | func.lower(func.coalesce(models.HostedZone.comment, "")).like(like)
        )
    total = query.count()
    query = query.order_by(models.HostedZone.id)
    if offset:
        query = query.offset(offset)
    if limit is not None:
        query = query.limit(limit)
    zones = query.all()
    for z in zones:
        z.record_count = db.query(func.count(models.Record.id)).filter(models.Record.zone_id == z.id).scalar() or 0
    return zones, total


def get_zone(db: Session, zone_id: int, user_id: str):
    zone = db.query(models.HostedZone).filter(models.HostedZone.id == zone_id, models.HostedZone.user_id == user_id).first()
    if zone:
        zone.record_count = db.query(func.count(models.Record.id)).filter(models.Record.zone_id == zone.id).scalar() or 0
    return zone


def create_zone(db: Session, zone: schemas.HostedZoneCreate, user_id: str):
    existing = db.query(models.HostedZone).filter(models.HostedZone.user_id == user_id, models.HostedZone.name == zone.name).first()
    if existing:
        return None
    db_zone = models.HostedZone(
        name=zone.name,
        comment=zone.comment,
        zone_type=zone.zone_type or "public",
        user_id=user_id,
        created_by=user_id,
    )
    db.add(db_zone)
    db.flush()
    from database import generate_zone_id_str
    db_zone.zone_id_str = generate_zone_id_str(db_zone.id)
    idx = int(hashlib.md5(zone.name.encode()).hexdigest(), 16) % 3
    ns_list = ns_sets[idx]
    for ns in ns_list:
        db.add(models.Record(zone_id=db_zone.id, name=db_zone.name, type="NS", value=ns, ttl=172800, set_identifier=ns))
    soa = f"{ns_list[0]} awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400"
    db.add(models.Record(zone_id=db_zone.id, name=db_zone.name, type="SOA", value=soa, ttl=900, set_identifier=""))
    db.commit()
    db.refresh(db_zone)
    db_zone.record_count = 5
    return db_zone


def update_zone(db: Session, zone_id: int, zone: schemas.HostedZoneUpdate, user_id: str):
    db_zone = get_zone(db, zone_id, user_id)
    if not db_zone:
        return None
    for key, value in zone.model_dump(exclude_unset=True).items():
        setattr(db_zone, key, value)
    db.commit()
    db.refresh(db_zone)
    db_zone.record_count = db.query(func.count(models.Record.id)).filter(models.Record.zone_id == db_zone.id).scalar() or 0
    return db_zone


def delete_zone(db: Session, zone_id: int, user_id: str):
    db_zone = get_zone(db, zone_id, user_id)
    if not db_zone:
        return False
    db.delete(db_zone)
    db.commit()
    return True


def get_records(db: Session, zone_id: int, user_id: str, q: str = "", record_type: str | None = None,
                routing_policy: str | None = None, limit: int | None = None, offset: int = 0):
    zone = get_zone(db, zone_id, user_id)
    if not zone:
        return None, None
    query = db.query(models.Record).filter(models.Record.zone_id == zone_id)
    if q:
        like = f"%{q.lower()}%"
        query = query.filter(
            func.lower(models.Record.name).like(like) | func.lower(models.Record.type).like(like) | func.lower(models.Record.value).like(like)
        )
    if record_type:
        query = query.filter(models.Record.type == record_type.upper())
    if routing_policy:
        query = query.filter(models.Record.routing_policy == routing_policy)
    total = query.count()
    query = query.order_by(models.Record.id)
    if offset:
        query = query.offset(offset)
    if limit is not None:
        query = query.limit(limit)
    return query.all(), total


def _normalize_set_identifier(v: str | None) -> str:
    return v.strip() if v else ""


def _is_apex(record_name: str, zone_name: str) -> bool:
    return record_name.strip().lower().rstrip(".") == zone_name.strip().lower().rstrip(".")


def _check_ns_soa_protection(zone: models.HostedZone, record: models.Record, *, allow_apex_ns_soa: bool):
    if not _is_apex(record.name, zone.name):
        return
    if record.type in ("NS", "SOA"):
        if not allow_apex_ns_soa:
            raise ValueError(f"Cannot delete the apex {record.type} records of a hosted zone")


def create_record(db: Session, zone_id: int, record: schemas.RecordCreate, user_id: str):
    zone = get_zone(db, zone_id, user_id)
    if not zone:
        return None, "Zone not found"
    try:
        full_name = schemas.normalize_record_name(record.name, zone.name)
    except ValueError as e:
        return None, str(e)
    try:
        schemas.validate_record_value(record.type, record.value)
        schemas.validate_routing_rules(record.routing_policy, record.weight, record.region, record.failover_type, record.set_identifier)
    except ValueError as e:
        return None, str(e)
    if record.type == "SOA" and any(r.type == "SOA" for r in zone.records):
        return None, "A hosted zone can only have one SOA record"
    set_id = _normalize_set_identifier(record.set_identifier)
    dup = db.query(models.Record).filter(
        models.Record.zone_id == zone_id,
        models.Record.name == full_name,
        models.Record.type == record.type,
        models.Record.set_identifier == set_id,
    ).first()
    if dup:
        raise DuplicateRecordError()
    db_record = models.Record(
        zone_id=zone_id,
        name=full_name,
        type=record.type,
        value=record.value,
        ttl=record.ttl,
        routing_policy=record.routing_policy,
        weight=record.weight,
        region=record.region,
        failover_type=record.failover_type,
        set_identifier=set_id,
    )
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record, None


def get_record(db: Session, record_id: int, user_id: str):
    rec = db.query(models.Record).filter(models.Record.id == record_id).first()
    if rec and get_zone(db, rec.zone_id, user_id):
        return rec
    return None


def update_record(db: Session, record_id: int, record: schemas.RecordUpdate, user_id: str):
    db_record = get_record(db, record_id, user_id)
    if not db_record:
        return None, "Record not found"
    zone = get_zone(db, db_record.zone_id, user_id)
    if _is_apex(db_record.name, zone.name) and db_record.type in ("NS", "SOA"):
        return None, f"Cannot edit the apex {db_record.type} records of a hosted zone"
    updates = record.model_dump(exclude_unset=True)
    merged_type = updates.get("type", db_record.type)
    merged_value = updates.get("value", db_record.value)
    merged_routing = updates.get("routing_policy", db_record.routing_policy)
    merged_weight = updates.get("weight", db_record.weight)
    merged_region = updates.get("region", db_record.region)
    merged_failover = updates.get("failover_type", db_record.failover_type)
    merged_set_id = _normalize_set_identifier(updates.get("set_identifier", db_record.set_identifier))
    try:
        schemas.validate_record_value(merged_type, merged_value)
        schemas.validate_routing_rules(merged_routing, merged_weight, merged_region, merged_failover, merged_set_id)
    except ValueError as e:
        return None, str(e)
    if merged_type == "SOA" and db_record.type != "SOA":
        if any(r.type == "SOA" and r.id != db_record.id for r in zone.records):
            return None, "A hosted zone can only have one SOA record"
    new_name = db_record.name
    if "name" in updates and updates["name"]:
        try:
            new_name = schemas.normalize_record_name(updates["name"], zone.name)
        except ValueError as e:
            return None, str(e)
    dup = db.query(models.Record).filter(
        models.Record.zone_id == zone.id,
        models.Record.name == new_name,
        models.Record.type == merged_type,
        models.Record.set_identifier == merged_set_id,
        models.Record.id != db_record.id,
    ).first()
    if dup:
        raise DuplicateRecordError()
    for key, value in updates.items():
        if key == "set_identifier":
            setattr(db_record, key, merged_set_id)
        elif key == "name" and value:
            setattr(db_record, key, new_name)
        else:
            setattr(db_record, key, value)
    db.commit()
    db.refresh(db_record)
    return db_record, None


def delete_record(db: Session, record_id: int, user_id: str):
    db_record = get_record(db, record_id, user_id)
    if not db_record:
        return False, "Record not found"
    zone = get_zone(db, db_record.zone_id, user_id)
    if _is_apex(db_record.name, zone.name) and db_record.type in ("NS", "SOA"):
        return False, f"Cannot delete the apex {db_record.type} records of a hosted zone"
    db.delete(db_record)
    db.commit()
    return True, None


class DuplicateRecordError(Exception):
    pass


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


def get_valid_session(db, token):
    s = get_session(db, token)
    if not s:
        return None
    created = s.created_at
    if created is None:
        return s
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    if created < _utcnow() - timedelta(days=SESSION_TTL_DAYS):
        delete_session(db, token)
        return None
    return s


def delete_session(db, token):
    s = get_session(db, token)
    if s:
        db.delete(s)
        db.commit()


def zone_to_json(db: Session, zone: models.HostedZone) -> dict:
    records = db.query(models.Record).filter(models.Record.zone_id == zone.id).order_by(models.Record.id).all()
    return {
        "zone": {
            "name": zone.name,
            "zone_type": zone.zone_type,
            "comment": zone.comment,
            "created_by": zone.created_by,
            "zone_id_str": zone.zone_id_str,
            "record_count": len(records),
        },
        "records": [
            {
                "name": r.name,
                "type": r.type,
                "value": r.value,
                "ttl": r.ttl,
                "routing_policy": r.routing_policy,
                "weight": r.weight,
                "region": r.region,
                "failover_type": r.failover_type,
                "set_identifier": r.set_identifier,
            }
            for r in records
        ],
    }


def zone_to_bind(db: Session, zone: models.HostedZone) -> str:
    records = db.query(models.Record).filter(models.Record.zone_id == zone.id).order_by(models.Record.id).all()
    ttl_default = 300
    lines = [f"$ORIGIN {zone.name}.", f"$TTL {ttl_default}", ""]
    for r in records:
        name = r.name
        if name == zone.name:
            name = "@"
        else:
            name = name[: -(len(zone.name) + 1)] if name.endswith("." + zone.name) else name
        lines.append(f"{name} {r.ttl} IN {r.type} {r.value}")
    return "\n".join(lines) + "\n"


_ORIGIN_RE = re.compile(r"^\s*\$ORIGIN\s+(\S+)")
_TTL_RE = re.compile(r"^\s*\$TTL\s+(\d+)")
_RECORD_RE = re.compile(
    r"^\s*(?:(?P<name>@|[A-Za-z0-9_*.-]+)\s+)?(?:(?P<ttl>\d+)\s+)?(?:IN\s+)?(?P<type>[A-Za-z]+)\s+(?P<rdata>.+)$"
)


def parse_bind_zone(text: str, zone_name: str) -> tuple[list[dict], list[dict]]:
    """Parse a BIND zone file. Returns (imported_records, skipped).

    Each imported record is a dict with keys name/type/value/ttl.
    Each skipped item is {"name":..., "type":..., "reason":...}.
    """
    imported: list[dict] = []
    skipped: list[dict] = []
    origin = zone_name.rstrip(".")
    default_ttl = 300
    logical_lines: list[str] = []
    buffer = ""
    paren_depth = 0
    for raw in text.splitlines():
        in_quote = False
        out = []
        for ch in raw:
            if ch == '"':
                in_quote = not in_quote
            if ch == ";" and not in_quote:
                break
            out.append(ch)
        line = "".join(out)
        paren_depth += line.count("(") - line.count(")")
        buffer += " " + line if buffer else line
        if paren_depth <= 0:
            logical_lines.append(buffer.replace("(", " ").replace(")", " "))
            buffer = ""
            paren_depth = 0
    if buffer.strip():
        logical_lines.append(buffer.replace("(", " ").replace(")", " "))

    last_name: str | None = None
    for line in logical_lines:
        line = line.strip()
        if not line:
            continue
        m_origin = _ORIGIN_RE.match(line)
        if m_origin:
            origin = m_origin.group(1).rstrip(".")
            continue
        m_ttl = _TTL_RE.match(line)
        if m_ttl:
            default_ttl = int(m_ttl.group(1))
            continue
        m = _RECORD_RE.match(line)
        if not m:
            skipped.append({"name": "", "type": "", "reason": f"Unparseable line: {line}"})
            continue
        name_token = m.group("name")
        ttl_token = m.group("ttl")
        rtype = m.group("type").upper()
        rdata = m.group("rdata").strip()
        if name_token:
            last_name = name_token
        name_token = name_token or last_name or "@"
        ttl = int(ttl_token) if ttl_token else default_ttl
        if name_token == "@":
            full_name = origin
        elif name_token.endswith("."):
            full_name = name_token.rstrip(".")
        elif "." in name_token and name_token.endswith(origin):
            full_name = name_token
        else:
            full_name = f"{name_token}.{origin}"
        full_name = full_name.lower().rstrip(".")
        if rtype not in schemas.ALLOWED_TYPES:
            skipped.append({"name": full_name, "type": rtype, "reason": "Unsupported record type"})
            continue
        if full_name == origin and rtype in ("NS", "SOA"):
            skipped.append({"name": full_name, "type": rtype, "reason": "Apex NS/SOA records are managed automatically"})
            continue
        try:
            schemas.validate_record_value(rtype, rdata)
        except ValueError as e:
            skipped.append({"name": full_name, "type": rtype, "reason": str(e)})
            continue
        if full_name != origin and not (full_name == origin or full_name.endswith("." + origin)):
            skipped.append({"name": full_name, "type": rtype, "reason": "Name outside zone"})
            continue
        imported.append({"name": full_name, "type": rtype, "value": rdata, "ttl": ttl})
    return imported, skipped


def import_records(db: Session, zone_id: int, user_id: str, text: str) -> dict:
    zone = get_zone(db, zone_id, user_id)
    if not zone:
        return None
    imported, skipped = parse_bind_zone(text, zone.name)
    created = 0
    for rec in imported:
        set_id = ""
        dup = db.query(models.Record).filter(
            models.Record.zone_id == zone_id,
            models.Record.name == rec["name"],
            models.Record.type == rec["type"],
            models.Record.set_identifier == set_id,
        ).first()
        if dup:
            skipped.append({"name": rec["name"], "type": rec["type"], "reason": "Duplicate record"})
            continue
        db.add(models.Record(zone_id=zone_id, name=rec["name"], type=rec["type"], value=rec["value"], ttl=rec["ttl"], set_identifier=set_id))
        created += 1
    db.commit()
    return {"imported": created, "skipped": len(skipped), "skipped_details": skipped}
