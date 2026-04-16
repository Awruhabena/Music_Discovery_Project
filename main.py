from fastapi import FastAPI,HTTPException,Depends
from sqlalchemy.orm import Session
from typing import List, Optional 
from models import Artist, Track, AudioFeature
from models.track import TrackResponse
from utils import get_db, create_tables, SpotifyClient
from models.track import TrackResponse
from models.artist import ArtistResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Underground Music Discovery API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://music-discovery-project.vercel.app"],
    allow_methods=["*"],
    allow_headers=["*"],
 )


create_tables()

spotify = SpotifyClient()

@app.get("/")
def root():
    return {"message": "Welcome to the Underground Music Discovery API! 🎵"}

@app.get("/artists")
def get_all_artists(db: Session = Depends(get_db)):
    artists = db.query(Artist).all()
    return  [ArtistResponse.model_validate(a) for a in artists]

@app.post("/artists") # Explanation
def create_artist(spotify_id: str, db: Session = Depends(get_db)):
    # Check if artist already exists
    existing = db.query(Artist).filter(Artist.spotify_id == spotify_id).first()
    if existing:
        return ArtistResponse.model_validate(existing)
    
      
    try:
        raw = spotify.get_artist(spotify_id)
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Could not reach Spotify: {str(e)}"
        )
    
    # Save to database
    new_artist = Artist(
        spotify_id=raw["id"],
        name=raw["name"],
        image_url=raw["images"][0]["url"] if raw["images"] else None,
        spotify_url=raw["external_urls"]["spotify"]
    )
    db.add(new_artist)
    db.commit()
    db.refresh(new_artist)
    return ArtistResponse.model_validate(new_artist)


@app.get("/artists/{artist_id}")
def get_artist(artist_id: str, db: Session = Depends(get_db)):
    artist = db.query(Artist).filter(Artist.id == artist_id).first()
    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")
    return ArtistResponse.model_validate(artist)


@app.delete("/artists/{artist_id}")
def delete_artist(artist_id: str, db: Session = Depends(get_db)):
    artist = db.query(Artist).filter(Artist.id == artist_id).first()
    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")
    db.delete(artist)
    db.commit()
    return {"message": "Artist deleted successfully"}


@app.get("/tracks")
def get_all_tracks(artist_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Track)
    if artist_id:
        query = query.filter(Track.artist_id == artist_id)
    tracks = query.all()
    return [TrackResponse.model_validate(t) for t in tracks]


@app.post("/artists/{artist_id}/tracks")
def save_tracks(artist_id: str, db: Session = Depends(get_db)):
    artist = db.query(Artist).filter(Artist.id == artist_id).first()
    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")
    
    raw_tracks = spotify.get_artist_top_tracks(artist.name)
    
    saved = []
    for raw in raw_tracks:
        existing = db.query(Track).filter(Track.spotify_id == raw["id"]).first()
        if existing:
          saved.append(existing)
          continue

        track = Track(
            spotify_id=raw["id"],
            name=raw["name"],
            artist_id=artist.id,
            album_name=raw["album"]["name"],
            duration_ms=raw["duration_ms"],
            is_explicit=raw["explicit"]
        )
        db.add(track)
        saved.append(track)
    
    db.commit()
    return [TrackResponse.model_validate(t) for t in saved]


@app.post("/audio-features/{track_id}")
def save_audio_features(track_id: str, db: Session = Depends(get_db)):
    # Check track exists
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    # Check if already saved
    existing = db.query(AudioFeature).filter(
        AudioFeature.track_id == track_id
    ).first()
    if existing:
        return existing

    # Fetch from Spotify
    try:
        raw = spotify.get_audio_features(track.spotify_id)
        print("Spotify response:", raw)
    except Exception as e:
        print("Spotify error:", str(e))
        raise HTTPException(status_code=503, detail=f"Could not reach Spotify: {str(e)}")

    if not raw:
        raise HTTPException(status_code=404, detail="No audio features available for this track")

    features = AudioFeature(
        track_id=track_id,
        tempo=raw.get("tempo"),
        danceability=raw.get("danceability"),
        energy=raw.get("energy"),
        valence=raw.get("valence"),
        acousticness=raw.get("acousticness"),
        speechiness=raw.get("speechiness"),
        liveness=raw.get("liveness"),
        loudness=raw.get("loudness"),
        key=raw.get("key"),
        time_signature=raw.get("time_signature")
    )
    db.add(features)
    db.commit()
    db.refresh(features)
    return features


@app.get("/audio-features/{track_id}")
def get_audio_features(track_id: str, db: Session = Depends(get_db)):
    features = db.query(AudioFeature).filter(
        AudioFeature.track_id == track_id
    ).first()
    if not features:
        raise HTTPException(
            status_code=404,
            detail="No audio features found. Click the track to fetch them first."
        )
    return features





@app.get("/discover/stats")
def get_stats(db: Session = Depends(get_db)):
    total_artists = db.query(Artist).count()
    total_tracks = db.query(Track).count()
    return {
        "total_artists": total_artists,
        "total_tracks": total_tracks
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "database": "connected",
        "spotify": "connected"
    }


@app.get("/spotify/search")
def search_spotify(q: str, db: Session = Depends(get_db)):
    try:
        results = spotify.search_artist(q)
        return results
    except Exception as e:
      raise HTTPException(
            status_code=503,
            detail=f"Could not reach Spotify: {str(e)}"
        )