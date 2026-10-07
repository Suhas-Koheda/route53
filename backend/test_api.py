import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from database import Base, get_db

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
    r = client.get("/hosted-zones", headers=headers(token))
    assert len(r.json()) == 1
    r = client.put(f"/hosted-zones/{zone['id']}", json={"comment": "updated"}, headers=headers(token))
    assert r.status_code == 200 and r.json()["comment"] == "updated"
    r = client.delete(f"/hosted-zones/{zone['id']}", headers=headers(token))
    assert r.status_code == 200
    r = client.get("/hosted-zones", headers=headers(token))
    assert len(r.json()) == 0

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
    assert r.status_code == 200
    r = client.get(f"/hosted-zones/{zid}", headers=headers(ta))
    assert r.status_code == 200

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
