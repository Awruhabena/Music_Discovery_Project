from sqlalchemy import Column , String , Integer , Boolean
from sqlalchemy.orm import relationship
from typing import Optional # for some fields they are allowed to be null
from pydantic import BaseModel # A validator that checks data to and from APIs
'''
BaseModel checks:
Are all required fields present?
Are the types correct? 
Is anything missing that shouldn't be?
'''
from utils.uuid_generator import generate_uuid
from models.base import Base

class Artist(Base):
    __tablename__ = 'artists'
    id = Column(String, primary_key=True, default = generate_uuid)
    spotify_id = Column(String, unique=True, index=True)
    name = Column(String, nullable=False)
    genres = Column(String)
    popularity = Column(Integer)
    followers = Column(Integer) 
    image_url = Column(String)
    spotify_url = Column(String)
   

    tracks = relationship("Track", back_populates="artist")

class ArtistResponse(BaseModel):
    id: str
    name: str
    spotify_id: str
    genres: Optional[str]
    popularity: Optional[int]
    followers: Optional[int]
    image_url: Optional[str]
    spotify_url: Optional[str]

    class Config:
        from_attributes = True # Since we're using SQLAlchemy models, we need to tell Pydantic to read data from attributes instead of dicts and convert to Json.