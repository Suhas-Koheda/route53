from pydantic import BaseModel, field_validator, model_validator
from typing import Optional, Literal
from datetime import datetime
import ipaddress
import re

ALLOWED_TYPES = ["A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA", "SOA"]
ROUTING_POLICIES = ["Simple", "Weighted", "Latency", "Geolocation", "Failover"]


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


def _is_valid_domain(v: str) -> bool:
    try:
        validate_domain(v)
        return True
    except ValueError:
        return False


def _validate_txt(value: str) -> None:
    strings = re.findall(r'"([^"]*)"', value)
    if strings:
        for s in strings:
            if len(s) > 255:
                raise ValueError("Each TXT character-string must be at most 255 characters")
        return
    if len(value) > 255:
        raise ValueError("TXT value must be at most 255 characters per string")


def validate_record_value(record_type: str, value: str) -> None:
    """Validate a DNS record value matches its type. Raises ValueError."""
    t = record_type.upper()
    v = value.strip()
    if not v:
        raise ValueError("Value is required")
    if t == "A":
        try:
            ipaddress.IPv4Address(v)
        except ValueError:
            raise ValueError("A record value must be a valid IPv4 address")
    elif t == "AAAA":
        try:
            ipaddress.IPv6Address(v)
        except ValueError:
            raise ValueError("AAAA record value must be a valid IPv6 address")
    elif t in ("CNAME", "NS", "PTR"):
        if not _is_valid_domain(v):
            raise ValueError(f"{t} record value must be a valid domain name")
    elif t == "MX":
        parts = v.split()
        if len(parts) != 2 or not parts[0].isdigit():
            raise ValueError('MX record value must be "priority host" (e.g. 10 mail.example.com)')
        if not _is_valid_domain(parts[1]):
            raise ValueError("MX host must be a valid domain name")
    elif t == "SRV":
        parts = v.split()
        if len(parts) != 4 or not all(p.isdigit() for p in parts[:3]):
            raise ValueError('SRV record value must be "priority weight port target"')
        if not _is_valid_domain(parts[3]):
            raise ValueError("SRV target must be a valid domain name")
    elif t == "CAA":
        m = re.match(r'^(\d{1,3})\s+([A-Za-z0-9_-]+)\s+"([^"]*)"$', v)
        if not m:
            raise ValueError('CAA record value must be: flag tag "value" (e.g. 0 issue "amazon.com")')
        if int(m.group(1)) > 255:
            raise ValueError("CAA flag must be between 0 and 255")
    elif t == "TXT":
        _validate_txt(v)
    elif t == "SOA":
        if not v:
            raise ValueError("SOA value is required")
    else:
        raise ValueError(f"Unsupported record type {record_type}")


def validate_routing_rules(routing_policy: str, weight: Optional[int], region: Optional[str],
                           failover_type: Optional[str], set_identifier: Optional[str]) -> None:
    policy = routing_policy or "Simple"
    if policy not in ROUTING_POLICIES:
        raise ValueError(f"Invalid routing policy. Must be one of {ROUTING_POLICIES}")
    if policy != "Simple" and not (set_identifier and set_identifier.strip()):
        raise ValueError(f"{policy} routing requires a set_identifier")
    if policy == "Weighted":
        if weight is None or weight < 0 or weight > 255:
            raise ValueError("Weighted routing requires a weight between 0 and 255")
    elif policy == "Latency":
        if not (region and region.strip()):
            raise ValueError("Latency routing requires a region")
    elif policy == "Geolocation":
        if not (region and region.strip()):
            raise ValueError("Geolocation routing requires a region")
    elif policy == "Failover":
        if failover_type not in ("PRIMARY", "SECONDARY"):
            raise ValueError("Failover routing requires failover_type PRIMARY or SECONDARY")


def normalize_record_name(name: str, zone_name: str) -> str:
    """Normalize a record name to the full name within a zone.

    '@' is the apex, relative names are prefixed with the zone name,
    full names must be within the zone. Raises ValueError if outside the zone.
    """
    n = name.strip().lower().rstrip(".")
    zn = zone_name.strip().lower().rstrip(".")
    if n == "@" or n == zn:
        return zn
    if n.endswith("." + zn):
        return n
    if "." not in n:
        return f"{n}.{zn}"
    raise ValueError(f"Record name '{name}' must be within the hosted zone '{zone_name}'")


class HostedZoneCreate(BaseModel):
    name: str
    comment: Optional[str] = None
    zone_type: Optional[str] = "public"

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        return validate_domain(v)

    @field_validator("zone_type")
    @classmethod
    def validate_zone_type(cls, v):
        if v and v not in ("public", "private"):
            raise ValueError("zone_type must be 'public' or 'private'")
        return v


class HostedZoneUpdate(BaseModel):
    comment: Optional[str] = None


class HostedZone(HostedZoneCreate):
    id: int
    record_count: int = 0
    created_at: Optional[datetime] = None
    created_by: Optional[str] = None
    zone_id_str: Optional[str] = None
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
        n = v.strip().lower().rstrip(".")
        if n == "@":
            return "@"
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

    @model_validator(mode="after")
    def validate_value_and_routing(self):
        validate_record_value(self.type, self.value)
        validate_routing_rules(self.routing_policy, self.weight, self.region, self.failover_type, self.set_identifier)
        return self


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
        if v is None or v == "":
            return v
        n = v.strip().lower().rstrip(".")
        if n == "@":
            return "@"
        return validate_domain(v)

    @field_validator("type")
    @classmethod
    def validate_type(cls, v):
        if v is None or v == "":
            return v
        if v.upper() not in ALLOWED_TYPES:
            raise ValueError("Invalid record type")
        return v.upper()

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
