from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, UploadFile, File
from sqlalchemy.orm import Session

import crud, schemas
from database import get_db
from dependencies import get_current_user

router = APIRouter()


@router.get("/hosted-zones", response_model=list[schemas.HostedZone])
def list_zones(
    response: Response,
    q: str = "",
    limit: Optional[int] = Query(default=None, ge=1),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    zones, total = crud.get_zones(db, user_id, q=q, limit=limit, offset=offset)
    response.headers["X-Total-Count"] = str(total)
    return zones


@router.post("/hosted-zones", response_model=schemas.HostedZone)
def create_zone(zone: schemas.HostedZoneCreate, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    z = crud.create_zone(db, zone, user_id)
    if not z:
        raise HTTPException(409, "A hosted zone with this name already exists")
    return z


@router.get("/hosted-zones/{zone_id}", response_model=schemas.HostedZone)
def get_zone(zone_id: int, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    zone = crud.get_zone(db, zone_id, user_id)
    if not zone:
        raise HTTPException(404, "Zone not found")
    return zone


@router.put("/hosted-zones/{zone_id}", response_model=schemas.HostedZone)
def update_zone(zone_id: int, zone: schemas.HostedZoneUpdate, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    z = crud.update_zone(db, zone_id, zone, user_id)
    if not z:
        raise HTTPException(404, "Zone not found")
    return z


@router.delete("/hosted-zones/{zone_id}")
def delete_zone(zone_id: int, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    deleted = crud.delete_zone(db, zone_id, user_id)
    if not deleted:
        raise HTTPException(404, "Zone not found")
    return {"ok": True}


@router.get("/hosted-zones/{zone_id}/export")
def export_zone(zone_id: int, format: str = Query(default="json", pattern="^(json|bind)$"), db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    zone = crud.get_zone(db, zone_id, user_id)
    if not zone:
        raise HTTPException(404, "Zone not found")
    if format == "json":
        return crud.zone_to_json(db, zone)
    bind_text = crud.zone_to_bind(db, zone)
    return Response(content=bind_text, media_type="text/plain")


@router.post("/hosted-zones/{zone_id}/import")
async def import_zone(zone_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    zone = crud.get_zone(db, zone_id, user_id)
    if not zone:
        raise HTTPException(404, "Zone not found")
    content = await file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(400, "File must be UTF-8 encoded text")
    result = crud.import_records(db, zone_id, user_id, text)
    return result
