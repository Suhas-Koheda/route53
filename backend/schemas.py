from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
import re

def validate_domain(v: str) -> str:
    v = v.strip().lower().rstrip(".")
    if v == "@":
        return v
    if len(v) > 253:
        raise ValueError("Domain name too long (max 253 chars)")
    if ".." in v:
        raise ValueError("Domain name cannot contain empty labels")
    for label in v.split("."):
        if len(label) > 63:
            raise ValueError("Label too long (max 63 chars)")
        if label.startswith("-") or label.endswith("-"):
            raise ValueError("Labels cannot start or end with a hyphen")
        if not re.match(r"^[a-z0-9-]+$", label):
            raise ValueError("Invalid characters in domain name")
    return v

ALLOWED_TYPES = ["A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA", "SOA"]

class HostedZoneCreate(BaseModel):
    name: str
    comment: Optional[str] = None
    zone_type: Optional[str] = "public"

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        return validate_domain(v)

class HostedZoneUpdate(BaseModel):
    name: Optional[str] = None
    comment: Optional[str] = None
    zone_type: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        return validate_domain(v) if v else v

class HostedZone(HostedZoneCreate):
    id: int
    record_count: int = 0
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}

class RecordCreate(BaseModel):
    name: str
    type: str
    value: str
    ttl: int = 300
    routing_policy: str = "Simple"
    weight: Optional[int] = None
    region: Optional[str] = None
    failover_type: Optional[str] = None
    set_identifier: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        return validate_domain(v)

    @field_validator("type")
    @classmethod
    def validate_type(cls, v):
        if v.upper() not in ALLOWED_TYPES:
            raise ValueError("Invalid record type")
        return v.upper()

    @field_validator("ttl")
    @classmethod
    def validate_ttl(cls, v):
        if v < 0 or v > 2147483647:
            raise ValueError("TTL must be between 0 and 2147483647")
        return v

class RecordUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    value: Optional[str] = None
    ttl: Optional[int] = None
    routing_policy: Optional[str] = None
    weight: Optional[int] = None
    region: Optional[str] = None
    failover_type: Optional[str] = None
    set_identifier: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        return validate_domain(v) if v else v

    @field_validator("type")
    @classmethod
    def validate_type(cls, v):
        if v and v.upper() not in ALLOWED_TYPES:
            raise ValueError("Invalid record type")
        return v

    @field_validator("ttl")
    @classmethod
    def validate_ttl(cls, v):
        if v is not None and (v < 0 or v > 2147483647):
            raise ValueError("TTL must be between 0 and 2147483647")
        return v

class Record(RecordCreate):
    id: int
    zone_id: int
    model_config = {"from_attributes": True}

class UserCreate(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v):
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
            raise ValueError("Invalid email address")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain a lowercase letter")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain an uppercase letter")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain a number")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>_<>=\-+\[\]\\/`~';]", v):
            raise ValueError("Password must contain a special character")
        return v

class UserLogin(BaseModel):
    email: str
    password: str
