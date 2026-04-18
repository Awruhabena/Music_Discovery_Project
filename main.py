from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional

from models import Artist, Track, AudioFeature
from models.artist import ArtistResponse
from models.track import TrackResponse
from models.audio_feature import AudioFeatureResponse
from utils import get_db, create_tables, SpotifyClient

app = FastAPI(
    title="Underground Music Discovery API",
    description="Discover artists before they blow up. Built with FastAPI + Spotify.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://music-discovery-project.vercel.app"],
    allow_methods=["*"],
    allow_headers=["*"],
)

create_tables()
spotify = SpotifyClient()


@app.get("/", tags=["General"])
def root():
    return {"message": "Welcome to the Underground Music Discovery API! 🎵"}


@app.get("/health", tags=["General"])
def health_check():
    return {
        "status": "healthy",
        "database": "connected",
        "spotify": "connected"
    }


@app.get("/artists", tags=["Artists"])
def get_all_artists(db: Session = Depends(get_db)):
    artists = db.query(Artist).all()
    return [ArtistResponse.model_validate(a) for a in artists]


@app.get("/artists/{artist_id}", tags=["Artists"])
def get_artist(artist_id: str, db: Session = Depends(get_db)):
    artist = db.query(Artist).filter(Artist.id == artist_id).first()
    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")
    return ArtistResponse.model_validate(artist)


@app.post("/artists", tags=["Artists"])
def create_artist(spotify_id: str, db: Session = Depends(get_db)):
    existing = db.query(Artist).filter(Artist.spotify_id == spotify_id).first()
    if existing:
        return ArtistResponse.model_validate(existing)

    try:
        raw = spotify.get_artist(spotify_id)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Could not reach Spotify: {str(e)}")

    new_artist = Artist(
        spotify_id  = raw["id"],
        name        = raw["name"],
        image_url   = raw["images"][0]["url"] if raw.get("images") else None,
        spotify_url = raw.get("external_urls", {}).get("spotify")
    )
    db.add(new_artist)
    db.commit()
    db.refresh(new_artist)
    return ArtistResponse.model_validate(new_artist)


@app.delete("/artists/{artist_id}", tags=["Artists"])
def delete_artist(artist_id: str, db: Session = Depends(get_db)):
    artist = db.query(Artist).filter(Artist.id == artist_id).first()
    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")
    db.delete(artist)
    db.commit()
    return {"message": "Artist deleted successfully"}


@app.get("/artists/{artist_id}/bio", tags=["Artists"])
def get_artist_bio(artist_id: str, db: Session = Depends(get_db)):
    artist = db.query(Artist).filter(Artist.id == artist_id).first()
    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")

    bio = (
        f"{artist.name} is an artist featured on the Canvas & Chord "
        f"Music Discovery platform. "
        f"Explore their tracks below and discover their sound "
        f"before they go mainstream."
    )

    return {
        "bio":       bio,
        "source":    "generated",
        "thumbnail": artist.image_url,
        "wiki_url":  None
    }


@app.get("/tracks", tags=["Tracks"])
def get_all_tracks(artist_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Track)
    if artist_id:
        query = query.filter(Track.artist_id == artist_id)
    return [TrackResponse.model_validate(t) for t in query.all()]


@app.post("/artists/{artist_id}/tracks", tags=["Tracks"])
def save_tracks(artist_id: str, db: Session = Depends(get_db)):
    artist = db.query(Artist).filter(Artist.id == artist_id).first()
    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")

    try:
        raw_tracks = spotify.get_artist_top_tracks(artist.name)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Could not reach Spotify: {str(e)}")

    saved = []
    for raw in raw_tracks:
        existing = db.query(Track).filter(Track.spotify_id == raw["id"]).first()
        if existing:
            saved.append(existing)
            continue

        track = Track(
            spotify_id  = raw["id"],
            name        = raw["name"],
            artist_id   = artist.id,
            album_name  = raw.get("album", {}).get("name"),
            duration_ms = raw.get("duration_ms"),
            is_explicit = raw.get("explicit", False),
            preview_url = raw.get("preview_url"),
            spotify_url = raw.get("external_urls", {}).get("spotify"),
        )
        db.add(track)
        saved.append(track)

    db.commit()
    return [TrackResponse.model_validate(t) for t in saved]


@app.post("/audio-features/{track_id}", tags=["Audio Features"])
def save_audio_features(track_id: str, db: Session = Depends(get_db)):
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    existing = db.query(AudioFeature).filter(AudioFeature.track_id == track_id).first()
    if existing:
        return AudioFeatureResponse.model_validate(existing)

    try:
        raw = spotify.get_audio_features(track.spotify_id)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Could not reach Spotify: {str(e)}")

    if not raw:
        raise HTTPException(status_code=404, detail="No audio features available for this track on Spotify.")

    features = AudioFeature(
        track_id       = track_id,
        tempo          = raw.get("tempo"),
        danceability   = raw.get("danceability"),
        energy         = raw.get("energy"),
        valence        = raw.get("valence"),
        acousticness   = raw.get("acousticness"),
        speechiness    = raw.get("speechiness"),
        liveness       = raw.get("liveness"),
        loudness       = raw.get("loudness"),
        key            = raw.get("key"),
        time_signature = raw.get("time_signature")
    )
    db.add(features)
    db.commit()
    db.refresh(features)
    return AudioFeatureResponse.model_validate(features)


@app.get("/audio-features/{track_id}", tags=["Audio Features"])
def get_audio_features(track_id: str, db: Session = Depends(get_db)):
    features = db.query(AudioFeature).filter(AudioFeature.track_id == track_id).first()
    if not features:
        raise HTTPException(
            status_code=404,
            detail="No audio features found. Fetch them first via POST /audio-features/{track_id}"
        )
    return AudioFeatureResponse.model_validate(features)


@app.get("/spotify/search", tags=["Spotify"])
def search_spotify(q: str):
    try:
        return spotify.search_artist(q)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Could not reach Spotify: {str(e)}")


@app.get("/discover/stats", tags=["Discovery"])
def get_stats(db: Session = Depends(get_db)):
    return {
        "total_artists": db.query(Artist).count(),
        "total_tracks":  db.query(Track).count()
    }