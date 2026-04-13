from typing import Optional, List, Dict , Any
from fastapi import params
from fastapi import params
import requests
from dotenv import load_dotenv 
import os 
import time

load_dotenv()

class SpotifyClient:
    TOKEN_URL = "https://accounts.spotify.com/api/token"
    BASE_URL = "https://api.spotify.com/v1"
    
    def __init__(self):
        self.client_id = os.getenv("SPOTIFY_CLIENT_ID")
        self.client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
        self._access_token = None
        self.token_expiry = 0
        self._authenticate() # Authenticate immediately to get the access token when the client is initialized

    def _authenticate(self): # the single underscore means it's for internal use only
        response = requests.post(
           self.TOKEN_URL,
           data  = {"grant_type": "client_credentials"}, # Type of authentication in which a device proves it's identity to a server.
           auth = (self.client_id, self.client_secret)
        )
        response.raise_for_status()
        token_data = response.json()
        self._access_token = token_data["access_token"]
        self._token_expires_at = time.time() + token_data["expires_in"] # this adds the time the token was given and the time it is available(here is 3600 seconds) to give the expiring time

    def _get_headers(self):
        if time.time() >= self._token_expires_at:
            self._authenticate()
        return {"Authorization": f"Bearer {self._access_token}"} # Provides the token in a HTTP format which Spotify uses
     
    def search_artist(self, query: str, limit: int = 10):
     url = f"{self.BASE_URL}/search"
     params = {
        "q": query,
        "type": "artist",
        "limit": limit,
        "market": "GH"
     }
     response = requests.get(url, headers=self._get_headers(), params=params)
     response.raise_for_status()
     data = response.json()
     return data.get("artists", {}).get("items", [])
    '''
     This line is used to extract the list of artists from the API response.
      The API response is a JSON object that contains various fields, including an "artists" field that contains information about the artists that match the search query. 
      By using data.get("artists", {}) we are trying to access the "artists" field in the response. 
      If it exists, we get its value; if it doesn't exist, we get an empty dictionary {}. 
      Then, we use .get("items", []) to access the "items" field within the "artists" field, which contains the actual list of artist objects.
      If "items" doesn't exist, we return an empty list [].
     This way, we ensure that our function returns a list of artists even if the expected fields are missing in the API response.
    '''

    def get_artist(self, spotify_artist_id: str):
     url = f"{self.BASE_URL}/artists/{spotify_artist_id}"
     response = requests.get(url, headers=self._get_headers())
     response.raise_for_status()
     return response.json()
    
    def get_artist_top_tracks(self, artist_name: str):
     url = f"{self.BASE_URL}/search"
     params = {
        "q": f"artist:{artist_name}",
        "type": "track",
        "limit": 10
     }
     response = requests.get(url, headers=self._get_headers(), params=params)
     response.raise_for_status()
     return response.json().get("tracks", {}).get("items", [])
    
    def get_audio_features(self, spotify_track_id: str):
     url = f"{self.BASE_URL}/audio-features/{spotify_track_id}"
     response = requests.get(url, headers=self._get_headers())
    
     
     if response.status_code in [403, 404]:
        return None
    
     response.raise_for_status()
     return response.json()