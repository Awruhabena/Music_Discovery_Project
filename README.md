# 🎵 Underground Music Discovery API

> *Discover artists before they blow up.*

A full-stack music discovery application built on the **Spotify Web API**. The backend is a REST API that fetches, stores and serves artist and track data. The frontend is a custom-designed web interface called **Canvas & Chord** that lets users search, save and explore underground artists.

**Built as the final project for the [Tech4Girls Backend Programme](https://tech4girls.africa)** 🇬🇭

---

## 🎬 Demo

🎥 **[Watch the Demo Video →](#)** *(replace with your YouTube or Loom link)*

| Canvas & Chord Home | Track List | API Docs |
|---|---|---|
| *(add screenshot)* | *(add screenshot)* | *(add /docs screenshot)* |

---

## 🌍 The Problem

Music discovery platforms surface the same mainstream artists to everyone. Emerging and underground artists — especially from Africa — get buried under algorithmic bias. There is no easy way for a music lover to **search, save and analyse** artists they discover before they become mainstream.

This API gives any application a proper backend for underground music discovery — with real Spotify data, persistent storage, and audio analysis.

---

## ✨ Features

- 🔍 **Live Spotify Search** — search any artist directly through your own API
- 💾 **Save to Database** — store artists and tracks in a local SQLite database
- 🎧 **Track Lists** — fetch and browse an artist's tracks
- 📊 **Audio Analysis** — view danceability, energy, valence, tempo and more
- 📈 **Discovery Stats** — see your collection grow in real time
- 📖 **Interactive `/docs`** — Swagger UI generated automatically by FastAPI
- 🌐 **Full-Stack** — Python backend + HTML/CSS/JS frontend

---

## 🗂️ Project Structure

```
Music_Discovery_Project/
│
├── 📄 main.py                  # FastAPI app — all routes and endpoint logic
├── 📄 requirements.txt         # Python dependencies
├── 📄 README.md                # You are here
├── 🔒 .env                     # Secret credentials (never committed to Git)
├── 🚫 .gitignore               # Files Git ignores
│
├── 📁 models/
│   ├── __init__.py             # Package exports
│   ├── base.py                 # Shared SQLAlchemy Base class
│   ├── artist.py               # Artist table + ArtistResponse Pydantic schema
│   ├── track.py                # Track table + TrackResponse Pydantic schema
│   └── audio_feature.py        # AudioFeature table
│
├── 📁 utils/
│   ├── __init__.py             # Package exports
│   ├── connection.py           # Database engine, SessionLocal, get_db()
│   ├── spotify_client.py       # Spotify API authentication and methods
│   └── uuid_generator.py       # UUID primary key generator
│
└── 📁 frontend/
    ├── index.html              # Canvas & Chord — the full UI
    └── style.css               # Stylesheet
    └── script.js               # JavaScript

```

---

## ⚙️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Language** | Python 3.12 | Core language |
| **Web Framework** | FastAPI 0.111 | REST API, routing, auto /docs |
| **Server** | Uvicorn | ASGI server that runs FastAPI |
| **ORM** | SQLAlchemy 2.0 | Python ↔ database mapping |
| **Database** | SQLite | Local file-based database |
| **Validation** | Pydantic 2.7 | Request/response data validation |
| **HTTP Client** | requests | Calls to the Spotify API |
| **Secrets** | python-dotenv | Loads credentials from .env |
| **External API** | Spotify Web API | Artist, track and audio feature data |
| **Frontend** | HTML + CSS + JavaScript | Canvas & Chord UI |

---

## 🛠️ How to Run It Locally

### Prerequisites

- Python 3.10 or higher
- A free Spotify Developer account

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/underground-music-discovery.git
cd underground-music-discovery
```

### 2. Create and activate a virtual environment

```bash
# Create
python3 -m venv venv

# Activate — Mac/Linux
source venv/bin/activate

# Activate — Windows
venv\Scripts\activate
```

> You will know it is active when you see `(venv)` at the start of your terminal prompt.

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Get your Spotify credentials

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Log in and click **Create App**
3. Name it **Underground Music Discovery**
4. Set Redirect URI to `http://localhost:8000`
5. Click **Settings** → copy your **Client ID** and **Client Secret**

### 5. Set up your `.env` file

```bash
cp .env.example .env
```

Open `.env` and fill in your credentials:

```env
SPOTIFY_CLIENT_ID=paste_your_client_id_here
SPOTIFY_CLIENT_SECRET=paste_your_client_secret_here
DATABASE_URL=sqlite:///./music_discovery.db
```

> ⚠️ Never commit your `.env` file. It is protected by `.gitignore`.

### 6. Start the API

```bash
uvicorn main:app --reload
```

You should see:

```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### 7. Open the interactive docs

Visit **http://127.0.0.1:8000/docs** in your browser.

### 8. Open the frontend

Open `frontend/index.html` in your browser.

---

## 📡 API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Welcome message |
| `GET` | `/health` | API and database health check |
| `GET` | `/artists` | List all saved artists |
| `POST` | `/artists?spotify_id=...` | Fetch artist from Spotify and save |
| `GET` | `/artists/{id}` | Get one artist by database ID |
| `DELETE` | `/artists/{id}` | Delete an artist |
| `GET` | `/tracks` | List all tracks (filter by `?artist_id=`) |
| `POST` | `/artists/{id}/tracks` | Fetch and save tracks for an artist |
| `POST` | `/audio-features/{track_id}` | Fetch and save audio features |
| `GET` | `/audio-features/{track_id}` | Get stored audio features |
| `GET` | `/spotify/search?q=...` | Search Spotify live for artists |
| `GET` | `/discover/stats` | Total artists and tracks in database |

---

## 🧪 How to Test It

The easiest way is to visit **http://127.0.0.1:8000/docs** — FastAPI generates an interactive page where you can click any endpoint, fill in values, and see the live response. No extra tools needed.

Alternatively, here are example `curl` commands you can paste into your terminal:

---

### Spotify IDs for Test Artists

**Burna Boy:** `3wcj11K77LjEY1PkEOPZTP`
**Tems:** `0Y6dVaC9DZtPNH4591M42W`


### Search for an artist on Spotify

**Request:**
```bash
curl -X GET "http://127.0.0.1:8000/spotify/search?q=Amaarae"
```

**Response:**
```json
[
  {
    "id": "21UPYSRWFKwtqvSAnFnSvS",
    "name": "Amaarae",
    "images": [{"url": "https://i.scdn.co/image/ab6761610000e5eb82d2f8ad2b13647357e18582"}],
    "external_urls": {"spotify": "https://open.spotify.com/artist/21UPYSRWFKwtqvSAnFnSvS"}
  }
]
```

---

### Save an artist to your database

**Request:**
```bash
curl -X POST "http://127.0.0.1:8000/artists?spotify_id=21UPYSRWFKwtqvSAnFnSvS"
```

**Response:**
```json
{
  "id": "e75081f8-81e9-42e7-9f50-507afc93216a",
  "name": "Amaarae",
  "spotify_id": "21UPYSRWFKwtqvSAnFnSvS",
  "genres": null,
  "popularity": null,
  "followers": null,
  "image_url": "https://i.scdn.co/image/ab6761610000e5eb82d2f8ad2b13647357e18582",
  "spotify_url": "https://open.spotify.com/artist/21UPYSRWFKwtqvSAnFnSvS"
}
```

---

### Get all saved artists

**Request:**
```bash
curl -X GET "http://127.0.0.1:8000/artists"
```

**Response:**
```json
[
  {
    "id": "e75081f8-81e9-42e7-9f50-507afc93216a",
    "name": "Amaarae",
    "spotify_id": "21UPYSRWFKwtqvSAnFnSvS",
    "image_url": "https://i.scdn.co/image/ab6761610000e5eb82d2f8ad2b13647357e18582",
    "spotify_url": "https://open.spotify.com/artist/21UPYSRWFKwtqvSAnFnSvS"
  }
]
```

---

### Fetch and save tracks for an artist

**Request:**
```bash
curl -X POST "http://127.0.0.1:8000/artists/artist_ID/tracks"
```

**Response:**
```json
[
  {
    "id": "5a9e1a20-aa2b-49cd-960c-785eba562a84",
    "name": "Angels in Tibet",
    "spotify_id": "23uUytja1B1mUOOIoygf6u",
    "artist_id": "e75081f8-81e9-42e7-9f50-507afc93216a",
    "album_name": "Fountain Baby",
    "duration_ms": 142613,
    "is_explicit": true
  }
]
```

---

### Get database stats

**Request:**
```bash
curl -X GET "http://127.0.0.1:8000/discover/stats"
```

**Response:**
```json
{
  "total_artists": 3,
  "total_tracks": 16
}
```

---

### Error response example — artist not found

**Request:**
```bash
curl -X GET "http://127.0.0.1:8000/artists/invalid-id"
```

**Response:**
```json
{
  "detail": "Artist not found"
}
```

> HTTP Status: `404 Not Found`

---

## 🗄️ Database Schema

```
artists ──────────────── tracks ──────────────── audiofeatures
  id (PK, UUID)           id (PK, UUID)           id (PK, UUID)
  spotify_id              spotify_id              track_id (FK)
  name                    artist_id (FK)          danceability
  genres                  name                    energy
  popularity              album_name              valence
  followers               duration_ms             tempo
  image_url               is_explicit             key
  spotify_url                                     loudness
                                                  acousticness
                                                  speechiness
                                                  liveness
                                                  time_signature
```

**Relationships:**
- `Artist → Tracks` — one-to-many (one artist, many tracks)
- `Track → AudioFeature` — one-to-one (one track, one set of audio features)

---

## ⚠️ Known Limitations

- **Audio Features** — Spotify restricted the `/audio-features` endpoint for free-tier developer apps in 2024. The endpoint is fully built and returns a graceful error. It would work with Extended Quota Mode enabled.
- **Top Tracks** — The Spotify top-tracks endpoint is also restricted on free tier. Tracks are fetched via the search endpoint instead.
- **Popularity & Followers** — Spotify's free tier returns limited artist data. These fields may be `null`.

---

## 🧠 Key Concepts Demonstrated

| Concept | Where |
|---|---|
| REST API design | All endpoints in `main.py` |
| ORM relationships | One-to-many (Artist → Tracks), One-to-one (Track → AudioFeature) |
| UUID primary keys | `utils/uuid_generator.py` |
| Foreign keys | `artist_id` in Track, `track_id` in AudioFeature |
| Dependency injection | `Depends(get_db)` in every route |
| Pydantic validation | `ArtistResponse`, `TrackResponse` schemas |
| Environment variables | `.env` + `python-dotenv` |
| OAuth2 authentication | Client Credentials Flow in `SpotifyClient` |
| Error handling | `try/except` + `HTTPException` throughout |
| CORS middleware | Allows frontend ↔ backend communication |



---

## 👩🏾‍💻 Author

**Lily Bampoe**
Tech4Girls Backend Programme — Cohort 2026

- 🔗 LinkedIn: [linkedin.com/in/yourprofile](#) *(update this)*
- 💻 GitHub: [github.com/yourusername](#) *(update this)*

---

## 🙏 Acknowledgements

- [Tech4Girls](https://tech4girls.africa) — for the programme and mentorship
- [Spotify Web API](https://developer.spotify.com/documentation/web-api) — for the music data
- [FastAPI](https://fastapi.tiangolo.com) — for the framework
- [SQLAlchemy](https://www.sqlalchemy.org) — for the ORM
