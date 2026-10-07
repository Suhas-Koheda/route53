from database import Base
from sqlalchemy import Column, ForeignKey, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

class HostedZone(Base):
    __tablename__ = "hosted_zones"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    comment = Column(String, nullable=True)
    user_id = Column(String, index=True, nullable=True)
    zone_type = Column(String, default="public")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    record_count = Column(Integer, default=0)
    records = relationship("Record", back_populates="zone", cascade="all, delete-orphan")

class Record(Base):
    __tablename__ = "records"
    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(Integer, ForeignKey("hosted_zones.id", ondelete="CASCADE"))
    name = Column(String)
    type = Column(String)
    value = Column(String)
    ttl = Column(Integer, default=300)
    routing_policy = Column(String, default="Simple")
    weight = Column(Integer, nullable=True)
    region = Column(String, nullable=True)
    failover_type = Column(String, nullable=True)
    set_identifier = Column(String, nullable=True)
    zone = relationship("HostedZone", back_populates="records")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)

class Session(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True)
    user_email = Column(String, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
