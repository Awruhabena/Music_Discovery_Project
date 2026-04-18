from sqlalchemy import Column, String, Integer
from sqlalchemy.orm import relationship
from typing import Optional
from pydantic import BaseModel, ConfigDict

from utils.uuid_generator import generate_uuid
from models.base import Base


class Artist(Base):
    __tablename__ = 'artists'

    id          = Column(String, primary_key=True, default=generate_uuid)
    spotify_id  = Column(String, unique=True, index=True)
    name        = Column(String, nullable=False)
    genres      = Column(String)
    popularity  = Column(Integer)
    followers   = Column(Integer)
    image_url   = Column(String)
    spotify_url = Column(String)

    tracks = relationship("Track", back_populates="artist")


class ArtistResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:          str
    name:        str
    spotify_id:  str
    genres:      Optional[str]
    popularity:  Optional[int]
    followers:   Optional[int]
    image_url:   Optional[str]
    spotify_url: Optional[str]