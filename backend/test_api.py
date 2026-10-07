import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from database import Base, get_db
from models import Session as SessionModel, Record as RecordModel
import models, crud, schemas
from datetime import datetime, timezone, timedelta

engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(bind=engine)
Base.metadata.create_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(autouse=True)
def clean():
    yield
    db = TestingSessionLocal()
    for table in reversed(Base.metadata.sorted_tables):
        db.execute(table.delete())
    db.commit()
    db.close()


def signup(email, pw="Password123!"):
    return client.post("/auth/signup", json={"email": email, "password": pw})


def login(email, pw="Password123!"):
    return client.post("/auth/login", json={"email": email, "password": pw})


def headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_signup_login_me():
    r = signup("a@test.com")
    assert r.status_code == 200
    token = r.json()["token"]
    r = client.get("/auth/me", headers=headers(token))
    assert r.status_code == 200 and r.json()["email"] == "a@test.com"


def test_invalid_token_401():
    r = client.get("/auth/me", headers=headers("badtoken"))
    assert r.status_code == 401


def test_invalid_login_401():
    signup("b@test.com")
    r = login("b@test.com", "Wrongpass1!")
    assert r.status_code == 401


def test_zone_crud():
    token = signup("c@test.com").json()["token"]
    r = client.post("/hosted-zones", json={"name": "example.com", "comment": "test"}, headers=headers(token))
    assert r.status_code == 200
    zone = r.json()
    assert zone["record_count"] == 5
    assert zone["zone_type"] == "public"
    assert zone["created_by"] == "c@test.com"
    assert zone["zone_id_str"].startswith("Z") and len(zone["zone_id_str"]) == 14
    r = client.get("/hosted-zones", headers=headers(token))
    assert len(r.json()) == 1
    r = client.put(f"/hosted-zones/{zone['id']}", json={"comment": "updated"}, headers=headers(token))
    assert r.status_code == 200 and r.json()["comment"] == "updated"
    r = client.delete(f"/hosted-zones/{zone['id']}", headers=headers(token))
    assert r.status_code == 200
    r = client.get("/hosted-zones", headers=headers(token))
    assert len(r.json()) == 0


def test_zone_rename_not_supported():
    token = signup("c2@test.com").json()["token"]
    zid = client.post("/hosted-zones", json={"name": "rename.com"}, headers=headers(token)).json()["id"]
    r = client.put(f"/hosted-zones/{zid}", json={"name": "renamed.com"}, headers=headers(token))
    assert r.status_code == 200
    assert r.json()["name"] == "rename.com"


def test_duplicate_zone_409():
    token = signup("d@test.com").json()["token"]
    client.post("/hosted-zones", json={"name": "dup.com"}, headers=headers(token))
    r = client.post("/hosted-zones", json={"name": "dup.com"}, headers=headers(token))
    assert r.status_code == 409


def test_record_crud():
    token = signup("e@test.com").json()["token"]
    zid = client.post("/hosted-zones", json={"name": "rec.com"}, headers=headers(token)).json()["id"]
    r = client.post(f"/hosted-zones/{zid}/records", json={"name": "www.rec.com", "type": "A", "value": "1.2.3.4", "ttl": 300, "routing_policy": "Simple"}, headers=headers(token))
    assert r.status_code == 200
    rid = r.json()["id"]
    r = client.get(f"/hosted-zones/{zid}/records", headers=headers(token))
    assert len(r.json()) == 6
    r = client.put(f"/records/{rid}", json={"value": "5.6.7.8"}, headers=headers(token))
    assert r.status_code == 200 and r.json()["value"] == "5.6.7.8"
    r = client.delete(f"/records/{rid}", headers=headers(token))
    assert r.status_code == 200
    r = client.get(f"/hosted-zones/{zid}/records", headers=headers(token))
    assert len(r.json()) == 5


def test_user_isolation():
    ta = signup("u1@test.com").json()["token"]
    tb = signup("u2@test.com").json()["token"]
    zid = client.post("/hosted-zones", json={"name": "private.com"}, headers=headers(ta)).json()["id"]
    r = client.get("/hosted-zones", headers=headers(tb))
    assert len(r.json()) == 0
    r = client.put(f"/hosted-zones/{zid}", json={"comment": "hack"}, headers=headers(tb))
    assert r.status_code == 404
    r = client.delete(f"/hosted-zones/{zid}", headers=headers(tb))
    assert r.status_code == 404
    r = client.get(f"/hosted-zones/{zid}", headers=headers(ta))
    assert r.status_code == 200


def test_cross_user_record_isolation():
    ta = signup("u3@test.com").json()["token"]
    tb = signup("u4@test.com").json()["token"]
    zid = client.post("/hosted-zones", json={"name": "iso.com"}, headers=headers(ta)).json()["id"]
    r = client.post(f"/hosted-zones/{zid}/records", json={"name": "www.iso.com", "type": "A", "value": "1.2.3.4"}, headers=headers(ta))
    rid = r.json()["id"]
    r = client.put(f"/records/{rid}", json={"value": "5.6.7.8"}, headers=headers(tb))
    assert r.status_code == 404
    r = client.delete(f"/records/{rid}", headers=headers(tb))
    assert r.status_code == 404
    r = client.get(f"/hosted-zones/{zid}/records", headers=headers(tb))
    assert r.status_code == 404


def test_invalid_record_type_422():
    token = signup("f@test.com").json()["token"]
    zid = client.post("/hosted-zones", json={"name": "val.com"}, headers=headers(token)).json()["id"]
    r = client.post(f"/hosted-zones/{zid}/records", json={"name": "x.val.com", "type": "BADTYPE", "value": "1.2.3.4"}, headers=headers(token))
    assert r.status_code == 422


def test_cascade_delete_records():
    token = signup("g@test.com").json()["token"]
    zid = client.post("/hosted-zones", json={"name": "cascade.com"}, headers=headers(token)).json()["id"]
    client.delete(f"/hosted-zones/{zid}", headers=headers(token))
    r = client.get(f"/hosted-zones/{zid}/records", headers=headers(token))
    assert r.status_code == 404


def test_expired_session_401():
    token = signup("exp@test.com").json()["token"]
    db = TestingSessionLocal()
    s = db.query(SessionModel).filter(SessionModel.token == token).first()
    s.created_at = datetime.now(timezone.utc) - timedelta(days=8)
    db.commit()
    db.close()
    r = client.get("/auth/me", headers=headers(token))
    assert r.status_code == 401
    r = client.get("/hosted-zones", headers=headers(token))
    assert r.status_code == 401


def test_duplicate_record_409():
    token = signup("dup@test.com").json()["token"]
    zid = client.post("/hosted-zones", json={"name": "d.com"}, headers=headers(token)).json()["id"]
    r1 = client.post(f"/hosted-zones/{zid}/records", json={"name": "www.d.com", "type": "A", "value": "1.2.3.4"}, headers=headers(token))
    assert r1.status_code == 200
    r2 = client.post(f"/hosted-zones/{zid}/records", json={"name": "www.d.com", "type": "A", "value": "5.6.7.8"}, headers=headers(token))
    assert r2.status_code == 409


def test_ns_soa_protection():
    token = signup("ns@test.com").json()["token"]
    zid = client.post("/hosted-zones", json={"name": "protected.com"}, headers=headers(token)).json()["id"]
    recs = client.get(f"/hosted-zones/{zid}/records", headers=headers(token)).json()
    ns = next(r for r in recs if r["type"] == "NS")
    soa = next(r for r in recs if r["type"] == "SOA")
    r = client.delete(f"/records/{ns['id']}", headers=headers(token))
    assert r.status_code == 400 and "apex" in r.json()["detail"].lower()
    r = client.put(f"/records/{soa['id']}", json={"value": "x"}, headers=headers(token))
    assert r.status_code == 400
    # creating another SOA must be blocked
    r = client.post(f"/hosted-zones/{zid}/records", json={"name": "protected.com", "type": "SOA", "value": "ns1 x 1 1 1 1 1"}, headers=headers(token))
    assert r.status_code == 400


def test_routing_rules():
    token = signup("rr@test.com").json()["token"]
    zid = client.post("/hosted-zones", json={"name": "rr.com"}, headers=headers(token)).json()["id"]
    # Weighted needs weight 0-255 + set_identifier
    r = client.post(f"/hosted-zones/{zid}/records", json={"name": "w.rr.com", "type": "A", "value": "1.2.3.4", "routing_policy": "Weighted", "weight": 300}, headers=headers(token))
    assert r.status_code == 422
    r = client.post(f"/hosted-zones/{zid}/records", json={"name": "w.rr.com", "type": "A", "value": "1.2.3.4", "routing_policy": "Weighted", "weight": 50}, headers=headers(token))
    assert r.status_code == 422  # missing set_identifier
    r = client.post(f"/hosted-zones/{zid}/records", json={"name": "w.rr.com", "type": "A", "value": "1.2.3.4", "routing_policy": "Weighted", "weight": 50, "set_identifier": "w1"}, headers=headers(token))
    assert r.status_code == 200
    # Latency needs region
    r = client.post(f"/hosted-zones/{zid}/records", json={"name": "l.rr.com", "type": "A", "value": "1.2.3.4", "routing_policy": "Latency", "set_identifier": "l1"}, headers=headers(token))
    assert r.status_code == 422
    r = client.post(f"/hosted-zones/{zid}/records", json={"name": "l.rr.com", "type": "A", "value": "1.2.3.4", "routing_policy": "Latency", "set_identifier": "l1", "region": "us-east-1"}, headers=headers(token))
    assert r.status_code == 200
    # Failover needs PRIMARY/SECONDARY
    r = client.post(f"/hosted-zones/{zid}/records", json={"name": "f.rr.com", "type": "A", "value": "1.2.3.4", "routing_policy": "Failover", "set_identifier": "f1", "failover_type": "BAD"}, headers=headers(token))
    assert r.status_code == 422
    r = client.post(f"/hosted-zones/{zid}/records", json={"name": "f.rr.com", "type": "A", "value": "1.2.3.4", "routing_policy": "Failover", "set_identifier": "f1", "failover_type": "PRIMARY"}, headers=headers(token))
    assert r.status_code == 200


def test_name_must_be_in_zone():
    token = signup("nz@test.com").json()["token"]
    zid = client.post("/hosted-zones", json={"name": "zone.com"}, headers=headers(token)).json()["id"]
    r = client.post(f"/hosted-zones/{zid}/records", json={"name": "other.com", "type": "A", "value": "1.2.3.4"}, headers=headers(token))
    assert r.status_code == 400
    r = client.post(f"/hosted-zones/{zid}/records", json={"name": "www", "type": "A", "value": "1.2.3.4"}, headers=headers(token))
    assert r.status_code == 200 and r.json()["name"] == "www.zone.com"
    r = client.post(f"/hosted-zones/{zid}/records", json={"name": "@", "type": "A", "value": "1.2.3.4"}, headers=headers(token))
    assert r.status_code == 200 and r.json()["name"] == "zone.com"


def test_record_value_validation():
    token = signup("vv@test.com").json()["token"]
    zid = client.post("/hosted-zones", json={"name": "v.com"}, headers=headers(token)).json()["id"]
    r = client.post(f"/hosted-zones/{zid}/records", json={"name": "a.v.com", "type": "A", "value": "999.999.999.999"}, headers=headers(token))
    assert r.status_code == 422
    r = client.post(f"/hosted-zones/{zid}/records", json={"name": "a.v.com", "type": "AAAA", "value": "not-ipv6"}, headers=headers(token))
    assert r.status_code == 422
    r = client.post(f"/hosted-zones/{zid}/records", json={"name": "m.v.com", "type": "MX", "value": "10 mail.v.com"}, headers=headers(token))
    assert r.status_code == 200
    r = client.post(f"/hosted-zones/{zid}/records", json={"name": "t.v.com", "type": "TXT", "value": '"v=spf1 include:x ~all"'}, headers=headers(token))
    assert r.status_code == 200
    r = client.post(f"/hosted-zones/{zid}/records", json={"name": "c.v.com", "type": "CAA", "value": '0 issue "amazon.com"'}, headers=headers(token))
    assert r.status_code == 200
    r = client.post(f"/hosted-zones/{zid}/records", json={"name": "c.v.com", "type": "CAA", "value": '300 issue "amazon.com"'}, headers=headers(token))
    assert r.status_code == 422


def test_record_update_merged_validation():
    token = signup("mv@test.com").json()["token"]
    zid = client.post("/hosted-zones", json={"name": "mv.com"}, headers=headers(token)).json()["id"]
    rid = client.post(f"/hosted-zones/{zid}/records", json={"name": "www.mv.com", "type": "A", "value": "1.2.3.4"}, headers=headers(token)).json()["id"]
    r = client.put(f"/records/{rid}", json={"type": "AAAA"}, headers=headers(token))
    assert r.status_code == 400
    r = client.put(f"/records/{rid}", json={"type": "AAAA", "value": "2001:db8::1"}, headers=headers(token))
    assert r.status_code == 200 and r.json()["type"] == "AAAA"


def test_pagination_header():
    token = signup("pg@test.com").json()["token"]
    client.post("/hosted-zones", json={"name": "z1.com"}, headers=headers(token))
    client.post("/hosted-zones", json={"name": "z2.com"}, headers=headers(token))
    client.post("/hosted-zones", json={"name": "z3.com"}, headers=headers(token))
    r = client.get("/hosted-zones", headers=headers(token))
    assert r.headers["X-Total-Count"] == "3"
    r = client.get("/hosted-zones?limit=2&offset=0", headers=headers(token))
    assert r.headers["X-Total-Count"] == "3"
    assert len(r.json()) == 2
    r = client.get("/hosted-zones?q=z1", headers=headers(token))
    assert r.headers["X-Total-Count"] == "1"
    zid = client.get("/hosted-zones", headers=headers(token)).json()[0]["id"]
    r = client.get(f"/hosted-zones/{zid}/records?type=NS", headers=headers(token))
    assert r.headers["X-Total-Count"] == "4"
    assert len(r.json()) == 4
    r = client.get(f"/hosted-zones/{zid}/records?routing_policy=Simple", headers=headers(token))
    assert r.headers["X-Total-Count"] == "5"


def test_export_import_roundtrip():
    token = signup("ei@test.com").json()["token"]
    zid = client.post("/hosted-zones", json={"name": "ei.com"}, headers=headers(token)).json()["id"]
    client.post(f"/hosted-zones/{zid}/records", json={"name": "www.ei.com", "type": "A", "value": "1.2.3.4", "ttl": 300}, headers=headers(token))
    client.post(f"/hosted-zones/{zid}/records", json={"name": "mail.ei.com", "type": "MX", "value": "10 mail.ei.com", "ttl": 300}, headers=headers(token))
    r = client.get(f"/hosted-zones/{zid}/export?format=bind", headers=headers(token))
    assert r.status_code == 200
    bind = r.text
    assert "$ORIGIN ei.com." in bind
    assert "www 300 IN A 1.2.3.4" in bind or "www.ei.com. 300 IN A 1.2.3.4" in bind
    # import into a new zone
    zid2 = client.post("/hosted-zones", json={"name": "ei2.com"}, headers=headers(token)).json()["id"]
    r = client.post(f"/hosted-zones/{zid2}/import", files={"file": ("ei.com.zone", bind, "text/plain")}, headers=headers(token))
    assert r.status_code == 200
    body = r.json()
    # apex NS/SOA should be skipped (managed automatically); www A and mail MX imported
    assert body["imported"] >= 2
    recs = client.get(f"/hosted-zones/{zid2}/records", headers=headers(token)).json()
    names = {(r["name"], r["type"]) for r in recs}
    assert ("www.ei2.com", "A") in names or any(n.startswith("www") for n, t in names)


def test_export_json():
    token = signup("ej@test.com").json()["token"]
    zid = client.post("/hosted-zones", json={"name": "ej.com"}, headers=headers(token)).json()["id"]
    r = client.get(f"/hosted-zones/{zid}/export?format=json", headers=headers(token))
    assert r.status_code == 200
    assert r.json()["zone"]["name"] == "ej.com"
    assert len(r.json()["records"]) == 5


def test_delete_nonexistent_zone_404():
    token = signup("dnz@test.com").json()["token"]
    r = client.delete("/hosted-zones/9999", headers=headers(token))
    assert r.status_code == 404
    r = client.delete("/records/9999", headers=headers(token))
    assert r.status_code == 404


def test_get_valid_session():
    token = signup("gvs@test.com").json()["token"]
    db = TestingSessionLocal()
    s = crud.get_valid_session(db, token)
    assert s is not None
    s.created_at = datetime.now(timezone.utc) - timedelta(days=8)
    db.commit()
    s2 = crud.get_valid_session(db, token)
    assert s2 is None
    db.close()


def test_record_update_type_uppercased():
    r = schemas.RecordUpdate(type="txt")
    assert r.type == "TXT"


def test_soa_blocked_second():
    token = signup("soa@test.com").json()["token"]
    zid = client.post("/hosted-zones", json={"name": "soa.com"}, headers=headers(token)).json()["id"]
    r = client.post(f"/hosted-zones/{zid}/records", json={"name": "soa.com", "type": "SOA", "value": "a b 1 2 3 4 5"}, headers=headers(token))
    assert r.status_code == 400
