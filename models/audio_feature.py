from sqlalchemy import Column, String, Integer, ForeignKey, Float
from sqlalchemy.orm import relationship
from typing import Optional
from pydantic import BaseModel, ConfigDict

from utils.uuid_generator import generate_uuid
from models.base import Base


class AudioFeature(Base):
    __tablename__ = "audiofeatures"

    id             = Column(String, primary_key=True, default=generate_uuid)
    track_id       = Column(String, ForeignKey("tracks.id"), nullable=False)
    tempo          = Column(Float)
    danceability   = Column(Float)
    energy         = Column(Float)
    valence        = Column(Float)
    acousticness   = Column(Float)
    speechiness    = Column(Float)
    liveness       = Column(Float)
    loudness       = Column(Float)
    key            = Column(Integer)
    time_signature = Column(Integer)

    track = relationship("Track", back_populates="audio_features")


class AudioFeatureResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:             str
    track_id:       str
    tempo:          Optional[float]
    danceability:   Optional[float]
    energy:         Optional[float]
    valence:        Optional[float]
    acousticness:   Optional[float]
    speechiness:    Optional[float]
    liveness:       Optional[float]
    loudness:       Optional[float]
    key:            Optional[int]
    time_signature: Optional[int]