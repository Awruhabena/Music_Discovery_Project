

const API = "https://canvasandchords.onrender.com";

// Spotify note names — converts numeric key (0-11) to letter name
const KEY_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

// Track which track is currently selected (for toggle behaviour)
let selectedTrackId = null;

// Read the artist ID from the URL — profile.html?artist_id=abc123
const params   = new URLSearchParams(window.location.search);
const artistId = params.get("artist_id");


// ── ON PAGE LOAD ──────────────────────────────────────────────────────

window.onload = async function () {
    if (!artistId) {
        // No artist ID in URL — redirect home
        window.location.href = "index.html";
        return;
    }

    // Load all sections in parallel for speed
    await Promise.all([
        loadArtist(),
        loadBio(),
        loadTracks()
    ]);
};




async function loadArtist() {
    try {
        const res    = await fetch(`${API}/artists/${artistId}`);
        if (!res.ok) {
            document.getElementById("artistName").textContent = "Artist not found";
            return;
        }
        const artist = await res.json();

        // Set page title
        document.title = `${artist.name} | CANVAS & CHORD`;

        // Banner — set background image using the artist's Spotify photo
        if (artist.image_url) {
            document.getElementById("profileBanner").style.backgroundImage =
                `url(${artist.image_url})`;
        }

        // Artist name
        document.getElementById("artistName").textContent = artist.name;

        // Genres — stored as comma-separated string
        if (artist.genres) {
            document.getElementById("artistGenres").textContent = artist.genres;
        }

        // Spotify link — opens the artist's Spotify page
        if (artist.spotify_url) {
            const link    = document.getElementById("spotifyLink");
            link.href     = artist.spotify_url;
            link.style.display = "inline-flex";
        }

        // Update the tracks section title
        document.getElementById("tracksTitle").textContent = `${artist.name}'s Tracks`;

    } catch {
        document.getElementById("artistName").textContent = "Could not load artist";
    }
}




async function loadBio() {
    const bioText   = document.getElementById("bioText");
    const bioSource = document.getElementById("bioSource");

    try {
        const res  = await fetch(`${API}/artists/${artistId}/bio`);
        const data = await res.json();

        // Display the bio text
        bioText.innerHTML = `<p>${data.bio}</p>`;

        // Show the source attribution
        if (data.source === "wikipedia") {
            bioSource.innerHTML = data.wiki_url
                ? `Source: <a href="${data.wiki_url}" target="_blank">Wikipedia ↗</a>`
                : "Source: Wikipedia";
        } else {
            bioSource.textContent = "Bio generated from available data";
        }

    } catch {
        bioText.innerHTML = `<p style="color:#aaa">Could not load biography.</p>`;
    }
}




async function loadTracks() {
    const tracksList = document.getElementById("tracksList");

    try {
        const res    = await fetch(`${API}/tracks?artist_id=${artistId}`);
        const tracks = await res.json();

        if (!tracks.length) {
            // No tracks saved yet — prompt user to fetch them
            tracksList.innerHTML = `
                <div class="tracks-empty">
                    <p>No tracks saved yet for this artist.<br>
                    Click "Fetch Tracks from Spotify" above to load them.</p>
                </div>`;
            return;
        }

        // Build a row for each track
        tracksList.innerHTML = tracks.map((t, i) => `
            <div class="track-row" id="track-${t.id}"
                 onclick="selectTrack('${t.id}', '${t.name.replace(/'/g, "\\'")}')">

                <div class="track-number">${String(i + 1).padStart(2, "0")}</div>

                <div class="track-info">
                    <p>
                        ${t.name}
                        ${t.is_explicit ? '<span class="explicit-badge">E</span>' : ""}
                    </p>
                    <small>${t.album_name || "Unknown Album"}</small>
                </div>

                <div class="track-duration">${formatDuration(t.duration_ms)}</div>

                ${t.spotify_url
                    ? `<a class="listen-btn"
                          href="${t.spotify_url}"
                          target="_blank"
                          onclick="event.stopPropagation()">
                           <i class="fa fa-spotify"></i> Listen
                       </a>`
                    : ""}

                <div class="track-hint">
                    <i class="fa fa-bar-chart"></i> Analyse
                </div>
            </div>`).join("");

    } catch {
        tracksList.innerHTML = `<p style="color:var(--muted);padding:20px">Could not load tracks.</p>`;
    }
}




async function fetchTracks() {
    const btn        = document.getElementById("fetchBtn");
    const tracksList = document.getElementById("tracksList");

    btn.disabled    = true;
    btn.textContent = "Fetching...";
    tracksList.innerHTML = `<div class="loading">Fetching from Spotify</div>`;

    // Close any open audio panel
    closeAudioPanel();

    try {
        const res = await fetch(`${API}/artists/${artistId}/tracks`, { method: "POST" });

        if (res.ok) {
            showNotification("Tracks saved! 🎧");
            await loadTracks();   // Reload the track list
        } else {
            showNotification("Could not fetch tracks from Spotify.", true);
            tracksList.innerHTML = `<div class="tracks-empty"><p>Could not fetch tracks.</p></div>`;
        }
    } catch {
        showNotification("API connection failed.", true);
        tracksList.innerHTML = `<div class="tracks-empty"><p>Connection error.</p></div>`;
    } finally {
        btn.disabled    = false;
        btn.innerHTML   = `<i class="fa fa-refresh"></i>&nbsp; Fetch Tracks from Spotify`;
    }
}




async function selectTrack(trackId, trackName) {

    // Toggle: clicking the active track closes the panel
    if (selectedTrackId === trackId) {
        closeAudioPanel();
        return;
    }

    selectedTrackId = trackId;

    // Highlight the selected row, deselect all others
    document.querySelectorAll(".track-row").forEach(r => r.classList.remove("active"));
    document.getElementById(`track-${trackId}`).classList.add("active");

    // Show the panel with loading state
    document.getElementById("selectedTrackName").textContent = trackName;
    document.getElementById("featuresContent").innerHTML =
        `<div class="audio-loading">Fetching audio analysis from Spotify...</div>`;

    const panel = document.getElementById("audioPanel");
    panel.classList.add("open");
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });

    try {
        // Step 1 — POST: fetch from Spotify and save (cached if already saved)
        await fetch(`${API}/audio-features/${trackId}`, { method: "POST" });

        // Step 2 — GET: retrieve the saved features
        const res = await fetch(`${API}/audio-features/${trackId}`);

        if (!res.ok) {
            document.getElementById("featuresContent").innerHTML = `
                <p style="color:var(--muted);text-align:center;padding:20px">
                    Audio features are not available for this track.<br>
                    <small>Spotify restricts this on the free developer tier.</small>
                </p>`;
            return;
        }

        renderAudioFeatures(await res.json());

    } catch {
        document.getElementById("featuresContent").innerHTML =
            `<p style="color:var(--muted);text-align:center;padding:20px">Could not load audio features.</p>`;
    }
}




function renderAudioFeatures(f) {
    const bars = [
        { name: "Danceability", val: f.danceability, cls: "dance"    },
        { name: "Energy",       val: f.energy,       cls: "energy"   },
        { name: "Happiness",    val: f.valence,      cls: "valence"  },
        { name: "Acousticness", val: f.acousticness, cls: "acoustic" },
        { name: "Speechiness",  val: f.speechiness,  cls: "speech"   },
        { name: "Liveness",     val: f.liveness,     cls: "live"     },
    ];

    // Build bar HTML — bars start at 0% width, then animate via setTimeout
    const barsHTML = bars.map(b => {
        const pct = b.val != null ? Math.round(b.val * 100) : null;
        return `
        <div class="feature-item">
            <div class="feature-label">
                <span class="feature-name">${b.name}</span>
                <span class="feature-value">${pct != null ? pct + "%" : "—"}</span>
            </div>
            <div class="feature-bar-bg">
                <div class="feature-bar-fill ${b.cls}"
                     style="width:0%"
                     data-target="${pct ?? 0}">
                </div>
            </div>
        </div>`;
    }).join("");

    // Metadata row
    const metaHTML = `
        <div class="features-meta">
            <div class="meta-item">
                <div class="meta-value">${f.tempo ? Math.round(f.tempo) : "—"}</div>
                <div class="meta-label">BPM</div>
            </div>
            <div class="meta-item">
                <div class="meta-value">${f.key != null ? KEY_NAMES[f.key] : "—"}</div>
                <div class="meta-label">Key</div>
            </div>
            <div class="meta-item">
                <div class="meta-value">${f.time_signature ? f.time_signature + "/4" : "—"}</div>
                <div class="meta-label">Time Sig</div>
            </div>
            <div class="meta-item">
                <div class="meta-value">${f.loudness ? f.loudness.toFixed(1) + " dB" : "—"}</div>
                <div class="meta-label">Loudness</div>
            </div>
        </div>`;

    document.getElementById("featuresContent").innerHTML =
        `<div class="features-grid">${barsHTML}</div>${metaHTML}`;

   
    setTimeout(() => {
        document.querySelectorAll(".feature-bar-fill").forEach(bar => {
            bar.style.width = bar.dataset.target + "%";
        });
    }, 50);
}


// ── CLOSE AUDIO PANEL ────────────────────────────────────────────────

function closeAudioPanel() {
    selectedTrackId = null;
    document.getElementById("audioPanel").classList.remove("open");
    document.querySelectorAll(".track-row").forEach(r => r.classList.remove("active"));
}


// ── HELPERS ──────────────────────────────────────────────────────────

function formatDuration(ms) {
    if (!ms) return "--:--";
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Show a toast notification at the bottom-right of the screen
function showNotification(msg, isError = false) {
    const n         = document.getElementById("notification");
    n.textContent   = msg;
    n.className     = "notification" + (isError ? " error" : "");
    n.style.display = "block";
    setTimeout(() => { n.style.display = "none"; }, 3000);
}