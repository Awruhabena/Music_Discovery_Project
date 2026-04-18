window.onload = function () {
    loadStats();
    loadArtists();

    document.getElementById("searchInput").addEventListener("keypress", e => {
        if (e.key === "Enter") searchArtists();
    });
};

async function loadStats() {
    try {
        const res  = await fetch(`${API}/discover/stats`);
        const data = await res.json();
        document.getElementById("totalArtists").textContent = data.total_artists;
        document.getElementById("totalTracks").textContent  = data.total_tracks;
    } catch {
        document.getElementById("totalArtists").textContent = "—";
    }
}

async function loadArtists() {
    const grid = document.getElementById("artistsGrid");

    try {
        const res     = await fetch(`${API}/artists`);
        const artists = await res.json();

        document.getElementById("artistCount").textContent =
            `${artists.length} artist${artists.length !== 1 ? "s" : ""} saved`;

        if (!artists.length) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🎵</div>
                    <p>No artists saved yet.<br>Search above and click Save to get started!</p>
                </div>`;
            return;
        }

        grid.innerHTML = artists.map(a => `
            <div class="artist-card" onclick="goToProfile('${a.id}')">
                <div class="artist-image-wrap">
                    ${a.image_url
                        ? `<img src="${a.image_url}" alt="${a.name}" loading="lazy">`
                        : `<span class="artist-initial">${a.name[0]}</span>`}
                </div>
                <p class="artist-card-name">${a.name}</p>
                <span class="artist-card-sub">View Profile →</span>
            </div>`).join("");

    } catch {
        grid.innerHTML = `
            <div class="empty-state">
                <p>Could not connect to API.<br>Is the server running?</p>
            </div>`;
    }
}

function goToProfile(artistId) {
    window.location.href = `profile.html?artist_id=${artistId}`;
}

async function searchArtists() {
    const query = document.getElementById("searchInput").value.trim();
    if (!query) {
        showNotification("Please enter an artist name!", true);
        return;
    }

    const searchResults = document.getElementById("searchResults");
    const resultsGrid   = document.getElementById("resultsGrid");

    searchResults.style.display = "block";
    resultsGrid.innerHTML       = `<div class="loading">Searching Spotify</div>`;
    searchResults.scrollIntoView({ behavior: "smooth" });

    try {
        const res     = await fetch(`${API}/spotify/search?q=${encodeURIComponent(query)}`);
        const results = await res.json();

        if (!results.length) {
            resultsGrid.innerHTML = `<p style="color:var(--muted)">No results found for "${query}".</p>`;
            return;
        }

        resultsGrid.innerHTML = results.map(a => `
            <div class="result-card">
                ${a.images && a.images.length
                    ? `<img src="${a.images[0].url}" alt="${a.name}" loading="lazy">`
                    : `<div class="no-image">${a.name[0]}</div>`}
                <div class="result-info">
                    <p>${a.name}</p>
                    <small>Artist on Spotify</small>
                </div>
                <button class="save-btn" onclick="saveArtist('${a.id}', this)">
                    Save
                </button>
            </div>`).join("");

    } catch {
        resultsGrid.innerHTML = `<p style="color:var(--muted)">Could not reach Spotify. Is the API running?</p>`;
    }
}

async function saveArtist(spotifyId, btn) {
    btn.disabled    = true;
    btn.textContent = "Saving...";

    try {
        const res = await fetch(`${API}/artists?spotify_id=${spotifyId}`, { method: "POST" });

        if (res.ok) {
            btn.textContent = "Saved ✓";
            btn.classList.add("saved");
            showNotification("Artist saved! 🎵");
            loadArtists();
            loadStats();
        } else {
            btn.textContent = "Error";
            btn.disabled    = false;
            showNotification("Could not save artist.", true);
        }
    } catch {
        btn.textContent = "Error";
        btn.disabled    = false;
        showNotification("API connection failed.", true);
    }
}