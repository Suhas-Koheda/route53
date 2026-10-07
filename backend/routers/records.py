from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

import crud, schemas
from crud import DuplicateRecordError
from database import get_db
from dependencies import get_current_user

router = APIRouter()


@router.get("/hosted-zones/{zone_id}/records", response_model=list[schemas.Record])
def list_records(
    zone_id: int,
    response: Response,
    q: str = "",
    type: Optional[str] = None,
    routing_policy: Optional[str] = None,
    limit: Optional[int] = Query(default=None, ge=1),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    recs, total = crud.get_records(db, zone_id, user_id, q=q, record_type=type, routing_policy=routing_policy, limit=limit, offset=offset)
    if recs is None:
        raise HTTPException(404, "Zone not found")
    response.headers["X-Total-Count"] = str(total)
    return recs


@router.post("/hosted-zones/{zone_id}/records", response_model=schemas.Record)
def create_record(zone_id: int, record: schemas.RecordCreate, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    try:
        r, err = crud.create_record(db, zone_id, record, user_id)
    except DuplicateRecordError:
        raise HTTPException(409, "A record with this name, type and set_identifier already exists")
    if err == "Zone not found":
        raise HTTPException(404, "Zone not found")
    if err:
        raise HTTPException(400, err)
    return r


@router.put("/records/{record_id}", response_model=schemas.Record)
def update_record(record_id: int, record: schemas.RecordUpdate, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    try:
        r, err = crud.update_record(db, record_id, record, user_id)
    except DuplicateRecordError:
        raise HTTPException(409, "A record with this name, type and set_identifier already exists")
    if err == "Record not found":
        raise HTTPException(404, "Record not found")
    if err:
        raise HTTPException(400, err)
    return r


@router.delete("/records/{record_id}")
def delete_record(record_id: int, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    ok, err = crud.delete_record(db, record_id, user_id)
    if err == "Record not found":
        raise HTTPException(404, "Record not found")
    if err:
        raise HTTPException(400, err)
    return {"ok": True}
