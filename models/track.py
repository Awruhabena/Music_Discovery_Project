from sqlalchemy import Column , String , Integer , Boolean, ForeignKey
from sqlalchemy.orm import relationship
from typing import Optional
from pydantic import BaseModel # A validator that checks data to and from APIs

from utils.uuid_generator import generate_uuid
from models.base import Base

class Track(Base):
    __tablename__ = 'tracks'
    id = Column(String, primary_key=True, default = generate_uuid)
    artist_id = Column(String, ForeignKey("artists.id"), nullable=False)
    spotify_id = Column(String, unique=True, index=True)
    name = Column(String, nullable=False)
    release_date = Column(String)
    album_name = Column(String)
    duration_ms = Column(Integer)
    popularity = Column(Integer)
    preview_url = Column(String)
    spotify_url = Column(String)
    track_number = Column(Integer)
    is_explicit = Column(Boolean, default=False)
    
    artist = relationship("Artist", back_populates="tracks")
    audio_features = relationship("AudioFeature" , back_populates = "track")

class TrackResponse(BaseModel):
    id: str
    name: str
    spotify_id: str
    artist_id: str
    album_name: Optional[str]
    duration_ms: Optional[int]
    is_explicit: bool
    preview_url:  Optional[str] = None   # 30-second audio preview
    spotify_url:  Optional[str] = None   # Full Spotify link for Listen button


    class Config:
        from_attributes = True