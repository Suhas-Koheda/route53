from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import models, schemas, crud
from database import engine, Base, get_db

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Route53 Clone API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_user_id(authorization: str = Header(default=""), db: Session = Depends(get_db)):
    token = authorization.replace("Bearer ", "")
    sess = crud.get_session(db, token)
    if not sess:
        raise HTTPException(401, "Invalid or expired session")
    return sess.user_email

@app.get("/hosted-zones", response_model=list[schemas.HostedZone])
def list_zones(db: Session = Depends(get_db), user_id: str = Depends(get_user_id)):
    return crud.get_zones(db, user_id)

@app.post("/hosted-zones", response_model=schemas.HostedZone)
def create_zone(zone: schemas.HostedZoneCreate, db: Session = Depends(get_db), user_id: str = Depends(get_user_id)):
    z = crud.create_zone(db, zone, user_id)
    if not z:
        raise HTTPException(409, "A hosted zone with this name already exists")
    return z

@app.get("/hosted-zones/{zone_id}", response_model=schemas.HostedZone)
def get_zone(zone_id: int, db: Session = Depends(get_db), user_id: str = Depends(get_user_id)):
    zone = crud.get_zone(db, zone_id, user_id)
    if not zone:
        raise HTTPException(404, "Zone not found")
    return zone

@app.put("/hosted-zones/{zone_id}", response_model=schemas.HostedZone)
def update_zone(zone_id: int, zone: schemas.HostedZoneUpdate, db: Session = Depends(get_db), user_id: str = Depends(get_user_id)):
    z = crud.update_zone(db, zone_id, zone, user_id)
    if not z:
        raise HTTPException(404, "Zone not found")
    return z

@app.delete("/hosted-zones/{zone_id}")
def delete_zone(zone_id: int, db: Session = Depends(get_db), user_id: str = Depends(get_user_id)):
    crud.delete_zone(db, zone_id, user_id)
    return {"ok": True}

@app.get("/hosted-zones/{zone_id}/records", response_model=list[schemas.Record])
def list_records(zone_id: int, db: Session = Depends(get_db), user_id: str = Depends(get_user_id)):
    recs = crud.get_records(db, zone_id, user_id)
    if recs is None:
        raise HTTPException(404, "Zone not found")
    return recs

@app.post("/hosted-zones/{zone_id}/records", response_model=schemas.Record)
def create_record(zone_id: int, record: schemas.RecordCreate, db: Session = Depends(get_db), user_id: str = Depends(get_user_id)):
    r = crud.create_record(db, zone_id, record, user_id)
    if not r:
        raise HTTPException(404, "Zone not found")
    return r

@app.put("/records/{record_id}", response_model=schemas.Record)
def update_record(record_id: int, record: schemas.RecordUpdate, db: Session = Depends(get_db), user_id: str = Depends(get_user_id)):
    r = crud.update_record(db, record_id, record, user_id)
    if not r:
        raise HTTPException(404, "Record not found")
    return r

@app.delete("/records/{record_id}")
def delete_record(record_id: int, db: Session = Depends(get_db), user_id: str = Depends(get_user_id)):
    crud.delete_record(db, record_id, user_id)
    return {"ok": True}

@app.post("/auth/signup")
def signup(data: schemas.UserCreate, db: Session = Depends(get_db)):
    if crud.get_user_by_email(db, data.email):
        raise HTTPException(400, "Email already registered")
    u = crud.create_user(db, data.email, data.password)
    sess = crud.create_session(db, data.email)
    return {"email": u.email, "token": sess.token}

@app.post("/auth/login")
def login(data: schemas.UserLogin, db: Session = Depends(get_db)):
    u = crud.verify_user(db, data.email, data.password)
    if not u:
        raise HTTPException(401, "Invalid credentials")
    sess = crud.create_session(db, data.email)
    return {"email": u.email, "token": sess.token}

@app.post("/auth/logout")
def logout(authorization: str = Header(default=""), db: Session = Depends(get_db)):
    crud.delete_session(db, authorization.replace("Bearer ", ""))
    return {"ok": True}

@app.get("/auth/me")
def me(authorization: str = Header(default=""), db: Session = Depends(get_db)):
    token = authorization.replace("Bearer ", "")
    sess = crud.get_session(db, token)
    if not sess:
        raise HTTPException(401, "Invalid or expired session")
    return {"email": sess.user_email}
