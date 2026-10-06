from database import Base
from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
class HostedZone(Base):
    __tablename__="hosted_zones"
    id=Column(Integer,primary_key=True,index=True)
    name=Column(String,index=True)
    comment=Column(String,nullable=True)
    user_id=Column(String,index=True,nullable=True)
    records=relationship("Record",back_populates="zone",cascade="all,delete")

class Record(Base):
    __tablename__ = "records"
    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(Integer, ForeignKey("hosted_zones.id"))
    name = Column(String)
    type = Column(String)
    value = Column(String)
    ttl = Column(Integer, default=300)
    zone = relationship("HostedZone", back_populates="records")
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)
