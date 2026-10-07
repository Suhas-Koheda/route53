from pydantic import BaseModel, field_validator
from typing import Optional
import re

def no_sql_injection(v: str) -> str:
    bad = ["'", '"', ";", "--", "/*", "*/", "\\", "\x00"]
    if any(b in v for b in bad):
        raise ValueError("Invalid characters in input")
    if re.search(r"(?i)(union|select|drop|insert|delete|update|exec|script)\s", v):
        raise ValueError("Input contains forbidden keywords")
    return v

ALLOWED_TYPES = ["A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA", "SOA"]

class HostedZoneCreate(BaseModel):
    name: str
    comment: Optional[str] = None
    zone_type: Optional[str] = "public"

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        v = no_sql_injection(v)
        if not re.match(r"^[a-zA-Z0-9]([a-zA-Z0-9\.\-]*[a-zA-Z0-9])?$", v):
            raise ValueError("Invalid domain name")
        return v

    @field_validator("comment")
    @classmethod
    def validate_comment(cls, v):
        return no_sql_injection(v) if v else v

class HostedZoneUpdate(BaseModel):
    name: Optional[str] = None
    comment: Optional[str] = None
    zone_type: Optional[str] = None

    @field_validator("name", "comment")
    @classmethod
    def validate(cls, v):
        return no_sql_injection(v) if v else v

class HostedZone(HostedZoneCreate):
    id: int
    record_count: int = 0
    created_at: Optional[str] = None
    model_config = {"from_attributes": True}

class RecordCreate(BaseModel):
    name: str
    type: str
    value: str
    ttl: int = 300
    routing_policy: str = "Simple"

    @field_validator("name", "value")
    @classmethod
    def validate(cls, v):
        return no_sql_injection(v)

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

    @field_validator("name", "value")
    @classmethod
    def validate(cls, v):
        return no_sql_injection(v) if v else v

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
        no_sql_injection(v)
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
            raise ValueError("Invalid email address")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v

class UserLogin(BaseModel):
    email: str
    password: str
