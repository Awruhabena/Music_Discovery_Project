

const API = "https://canvasandchords.onrender.com";

// ── ON PAGE LOAD ──────────────────────────────────────────────────────

window.onload = function () {
    loadStats();
    loadArtists();
};

// ── STATS BAR ─────────────────────────────────────────────────────────
// Calls GET /discover/stats and updates the three stat numbers

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

// ── ARTISTS GRID ──────────────────────────────────────────────────────
// Calls GET /artists and builds clickable artist cards.
// Clicking a card navigates to profile.html?artist_id=xxx

async function loadArtists() {
    const grid = document.getElementById("artistsGrid");

    try {
        const res     = await fetch(`${API}/artists`);
        const artists = await res.json();

        // Update the count label above the grid
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

        // Build one card per artist.
        // onclick navigates to the profile page, passing the artist's database ID in the URL.
        grid.innerHTML = artists.map(a => `
            <div class="artist-card"
                 onclick="goToProfile('${a.id}')">
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
                <p>Could not connect to API.<br>Is uvicorn running?</p>
            </div>`;
    }
}

// Navigate to the artist profile page
function goToProfile(artistId) {
    window.location.href = `profile.html?artist_id=${artistId}`;
}

// ── SPOTIFY SEARCH ────────────────────────────────────────────────────
// Calls GET /spotify/search?q=... and shows results with Save buttons

async function searchArtists() {
    const query = document.getElementById("searchInput").value.trim();
    if (!query) {
        showNotification("Please enter an artist name!", true);
        return;
    }

    // Show results section with loading state
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

        // Build a card for each result with a Save button
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

// ── SAVE ARTIST ───────────────────────────────────────────────────────
// Calls POST /artists?spotify_id=... to save to the database

async function saveArtist(spotifyId, btn) {
    btn.disabled    = true;
    btn.textContent = "Saving...";

    try {
        const res = await fetch(`${API}/artists?spotify_id=${spotifyId}`, { method: "POST" });

        if (res.ok) {
            btn.textContent = "Saved ✓";
            btn.classList.add("saved");
            showNotification("Artist saved! 🎵");
            loadArtists();  // Refresh the artist grid
            loadStats();    // Update the stats bar
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

// ── HELPERS ───────────────────────────────────────────────────────────

// Show a toast notification at the bottom-right of the screen
function showNotification(msg, isError = false) {
    const n        = document.getElementById("notification");
    n.textContent  = msg;
    n.className    = "notification" + (isError ? " error" : "");
    n.style.display = "block";

    // Auto-hide after 3 seconds
    setTimeout(() => { n.style.display = "none"; }, 3000);
}

// Allow pressing Enter to trigger search
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("searchInput").addEventListener("keypress", e => {
        if (e.key === "Enter") searchArtists();
    });
});