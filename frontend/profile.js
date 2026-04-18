// Converts Spotify's numeric key (0-11) to a readable note name
const KEY_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

let selectedTrackId = null;

const params   = new URLSearchParams(window.location.search);
const artistId = params.get("artist_id");

window.onload = async function () {
    if (!artistId || !/^[a-zA-Z0-9_-]+$/.test(artistId)) {
        window.location.href = "index.html";
        return;
    }
    await Promise.all([loadArtist(), loadBio(), loadTracks()]);
};

async function loadArtist() {
    try {
        const res = await fetch(`${API}/artists/${artistId}`);

        if (res.status === 404) {
            document.getElementById("artistName").textContent = "Artist not found";
            return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const artist = await res.json();

        document.title = `${artist.name} | CANVAS & CHORD`;

        if (artist.image_url) {
            document.getElementById("profileBanner").style.backgroundImage =
                `url(${artist.image_url})`;
        }

        document.getElementById("artistName").textContent = artist.name;

        if (artist.genres) {
            document.getElementById("artistGenres").textContent = artist.genres;
        }

        if (artist.spotify_url) {
            const link = document.getElementById("spotifyLink");
            link.href  = artist.spotify_url;
            link.style.display = "inline-flex";
        }

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

        bioText.innerHTML = `<p>${data.bio}</p>`;

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
            tracksList.innerHTML = `
                <div class="tracks-empty">
                    <p>No tracks saved yet for this artist.<br>
                    Click "Fetch Tracks from Spotify" above to load them.</p>
                </div>`;
            return;
        }

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
                    ? `<a class="listen-btn" href="${t.spotify_url}" target="_blank"
                          onclick="event.stopPropagation()">
                           <i class="fa fa-spotify"></i> Listen
                       </a>`
                    : ""}
                <div class="track-hint"><i class="fa fa-bar-chart"></i> Analyse</div>
            </div>`).join("");

    } catch {
        tracksList.innerHTML = `<p style="color:var(--muted);padding:20px">Could not load tracks.</p>`;
    }
}

async function fetchTracks() {
    const btn        = document.getElementById("fetchBtn");
    const tracksList = document.getElementById("tracksList");

    btn.disabled         = true;
    btn.textContent      = "Fetching...";
    tracksList.innerHTML = `<div class="loading">Fetching from Spotify</div>`;

    closeAudioPanel();

    try {
        const res = await fetch(`${API}/artists/${artistId}/tracks`, { method: "POST" });

        if (res.ok) {
            showNotification("Tracks saved! 🎧");
            await loadTracks();
        } else {
            showNotification("Could not fetch tracks from Spotify.", true);
            tracksList.innerHTML = `<div class="tracks-empty"><p>Could not fetch tracks.</p></div>`;
        }
    } catch {
        showNotification("API connection failed.", true);
        tracksList.innerHTML = `<div class="tracks-empty"><p>Connection error.</p></div>`;
    } finally {
        btn.disabled  = false;
        btn.innerHTML = `<i class="fa fa-refresh"></i>&nbsp; Fetch Tracks from Spotify`;
    }
}

async function selectTrack(trackId, trackName) {
    if (selectedTrackId === trackId) {
        closeAudioPanel();
        return;
    }

    selectedTrackId = trackId;

    document.querySelectorAll(".track-row").forEach(r => r.classList.remove("active"));
    document.getElementById(`track-${trackId}`).classList.add("active");

    document.getElementById("selectedTrackName").textContent = trackName;
    document.getElementById("featuresContent").innerHTML =
        `<div class="audio-loading">Fetching audio analysis from Spotify...</div>`;

    const panel = document.getElementById("audioPanel");
    panel.classList.add("open");
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });

    try {
        // POST saves the features if not already cached, GET retrieves them
        await fetch(`${API}/audio-features/${trackId}`, { method: "POST" });
        const res = await fetch(`${API}/audio-features/${trackId}`);

        if (!res.ok) {
            document.getElementById("featuresContent").innerHTML = `
                <p style="color:var(--muted);text-align:center;padding:20px">
                    Audio features not available for this track.<br>
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

    const barsHTML = bars.map(b => {
        const pct = b.val != null ? Math.round(b.val * 100) : null;
        return `
        <div class="feature-item">
            <div class="feature-label">
                <span class="feature-name">${b.name}</span>
                <span class="feature-value">${pct != null ? pct + "%" : "—"}</span>
            </div>
            <div class="feature-bar-bg">
                <div class="feature-bar-fill ${b.cls}" style="width:0%" data-target="${pct ?? 0}"></div>
            </div>
        </div>`;
    }).join("");

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

    // Small delay so the browser paints 0% first, making the animation visible
    setTimeout(() => {
        document.querySelectorAll(".feature-bar-fill").forEach(bar => {
            bar.style.width = bar.dataset.target + "%";
        });
    }, 50);
}

function closeAudioPanel() {
    selectedTrackId = null;
    document.getElementById("audioPanel").classList.remove("open");
    document.querySelectorAll(".track-row").forEach(r => r.classList.remove("active"));
}

