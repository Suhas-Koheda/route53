from fastapi import FastAPI, Depends, HTTPException
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

@app.get("/hosted-zones", response_model=list[schemas.HostedZone])
def list_zones(db: Session = Depends(get_db)):
    return crud.get_zones(db)

@app.post("/hosted-zones", response_model=schemas.HostedZone)
def create_zone(zone: schemas.HostedZoneCreate, db: Session = Depends(get_db)):
    return crud.create_zone(db, zone)

@app.get("/hosted-zones/{zone_id}", response_model=schemas.HostedZone)
def get_zone(zone_id: int, db: Session = Depends(get_db)):
    zone = crud.get_zone(db, zone_id)
    if not zone:
        raise HTTPException(404, "Zone not found")
    return zone

@app.put("/hosted-zones/{zone_id}", response_model=schemas.HostedZone)
def update_zone(zone_id: int, zone: schemas.HostedZoneUpdate, db: Session = Depends(get_db)):
    return crud.update_zone(db, zone_id, zone)

@app.delete("/hosted-zones/{zone_id}")
def delete_zone(zone_id: int, db: Session = Depends(get_db)):
    crud.delete_zone(db, zone_id)
    return {"ok": True}

@app.get("/hosted-zones/{zone_id}/records", response_model=list[schemas.Record])
def list_records(zone_id: int, db: Session = Depends(get_db)):
    return crud.get_records(db, zone_id)

@app.post("/hosted-zones/{zone_id}/records", response_model=schemas.Record)
def create_record(zone_id: int, record: schemas.RecordCreate, db: Session = Depends(get_db)):
    return crud.create_record(db, zone_id, record)

@app.put("/records/{record_id}", response_model=schemas.Record)
def update_record(record_id: int, record: schemas.RecordUpdate, db: Session = Depends(get_db)):
    return crud.update_record(db, record_id, record)

@app.delete("/records/{record_id}")
def delete_record(record_id: int, db: Session = Depends(get_db)):
    crud.delete_record(db, record_id)
    return {"ok": True}