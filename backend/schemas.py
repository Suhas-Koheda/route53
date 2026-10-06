from pydantic import BaseModel
from typing import Optional

class HostedZoneCreate(BaseModel):
    name: str
    comment: Optional[str] = None

class HostedZoneUpdate(BaseModel):
    name: Optional[str] = None
    comment: Optional[str] = None

class HostedZone(HostedZoneCreate):
    id: int
    model_config = {"from_attributes": True}

class RecordCreate(BaseModel):
    name: str
    type: str
    value: str
    ttl: int = 300

class RecordUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    value: Optional[str] = None
    ttl: Optional[int] = None

class Record(RecordCreate):
    id: int
    zone_id: int
    model_config = {"from_attributes": True}