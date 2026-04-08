 const API = "http://127.0.0.1:8000";
        let selectedArtistId = null;
        let selectedTrackId  = null;
 
        // Spotify returns key as 0-11 — this converts to real note names
        const KEY_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
 
        window.onload = function() {
            loadStats();
            loadArtists();
        };
 
        // ── STATS ──────────────────────────────────────────────────
        async function loadStats() {
            try {
                const res  = await fetch(`${API}/discover/stats`);
                const data = await res.json();
                document.getElementById("totalArtists").textContent = data.total_artists;
                document.getElementById("totalTracks").textContent  = data.total_tracks;
            } catch { document.getElementById("totalArtists").textContent = "—"; }
        }
 
        // ── ARTISTS ────────────────────────────────────────────────
        async function loadArtists() {
            try {
                const res     = await fetch(`${API}/artists`);
                const artists = await res.json();
                const grid    = document.getElementById("artistsGrid");
 
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
                    <div class="artist-card" onclick="selectArtist('${a.id}', '${a.name.replace(/'/g,"\\'")}')">
                        <div class="artist-image-wrap">
                            ${a.image_url
                                ? `<img src="${a.image_url}" alt="${a.name}" loading="lazy">`
                                : `<span class="artist-initial">${a.name[0]}</span>`}
                        </div>
                        <p class="artist-card-name">${a.name}</p>
                        <span class="artist-card-sub">View Tracks</span>
                    </div>`).join("");
            } catch {
                document.getElementById("artistsGrid").innerHTML =
                    `<div class="empty-state"><p>Could not connect to API.<br>Is uvicorn running?</p></div>`;
            }
        }
 
        // ── SEARCH ─────────────────────────────────────────────────
        async function searchArtists() {
            const query = document.getElementById("searchInput").value.trim();
            if (!query) { showNotification("Please enter an artist name!", true); return; }
 
            document.getElementById("searchResults").style.display = "block";
            document.getElementById("resultsGrid").innerHTML = `<div class="loading">Searching Spotify</div>`;
            document.getElementById("searchResults").scrollIntoView({ behavior: "smooth" });
 
            try {
                const res     = await fetch(`${API}/spotify/search?q=${encodeURIComponent(query)}`);
                const results = await res.json();
 
                if (!results.length) {
                    document.getElementById("resultsGrid").innerHTML =
                        `<p style="color:var(--muted)">No results found for "${query}".</p>`;
                    return;
                }
 
                document.getElementById("resultsGrid").innerHTML = results.map(a => `
                    <div class="result-card">
                        ${a.images && a.images.length
                            ? `<img src="${a.images[0].url}" alt="${a.name}" loading="lazy">`
                            : `<div class="no-image">${a.name[0]}</div>`}
                        <div class="result-info">
                            <p>${a.name}</p>
                            <small>Artist</small>
                        </div>
                        <button class="save-btn" onclick="saveArtist('${a.id}', this)">Save</button>
                    </div>`).join("");
            } catch {
                document.getElementById("resultsGrid").innerHTML =
                    `<p style="color:var(--muted)">Could not reach Spotify. Is the API running?</p>`;
            }
        }
 
        // ── SAVE ARTIST ────────────────────────────────────────────
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
 
        // ── SELECT ARTIST ──────────────────────────────────────────
        async function selectArtist(artistId, artistName) {
            selectedArtistId = artistId;
 
            // Close any open audio panel from the previous selection
            closeAudioPanel();
 
            document.getElementById("tracksPanel").style.display = "block";
            document.getElementById("selectedArtistName").textContent = artistName;
            document.getElementById("tracksList").innerHTML = `<div class="loading">Loading tracks</div>`;
            document.getElementById("tracksPanel").scrollIntoView({ behavior: "smooth" });
 
            try {
                const res    = await fetch(`${API}/tracks?artist_id=${artistId}`);
                const tracks = await res.json();
 
                if (!tracks.length) {
                    document.getElementById("tracksList").innerHTML =
                        `<p style="color:var(--muted);padding:20px 0">
                            No tracks saved yet. Click "Fetch Latest Tracks" above!
                        </p>`;
                    return;
                }
 
                // Notice each track row calls selectTrack() on click
                // and has a .track-hint that fades in on hover
                document.getElementById("tracksList").innerHTML = tracks.map((t, i) => `
                    <div class="track-row" id="track-${t.id}"
                         onclick="selectTrack('${t.id}', '${t.name.replace(/'/g,"\\'")}')">
                        <div class="track-number">${String(i+1).padStart(2,"0")}</div>
                        <div class="track-info">
                            <p>${t.name} ${t.is_explicit ? '<span class="explicit-badge">E</span>' : ""}</p>
                            <small>${t.album_name || "Unknown Album"}</small>
                        </div>
                        <div class="track-duration">${formatDuration(t.duration_ms)}</div>
                        <div class="track-hint"><i class="fa fa-bar-chart"></i> Analyse</div>
                    </div>`).join("");
 
            } catch {
                document.getElementById("tracksList").innerHTML =
                    `<p style="color:var(--muted)">Could not load tracks.</p>`;
            }
        }
 
        // ── SELECT TRACK → fetch & show audio features ─────────────
        async function selectTrack(trackId, trackName) {
 
            // Clicking the same track again → toggle panel closed
            if (selectedTrackId === trackId) {
                closeAudioPanel();
                return;
            }
 
            selectedTrackId = trackId;
 
            // Highlight selected row
            document.querySelectorAll(".track-row").forEach(r => r.classList.remove("active"));
            document.getElementById(`track-${trackId}`).classList.add("active");
 
            // Update header and show loading
            document.getElementById("selectedTrackName").textContent = trackName;
            document.getElementById("featuresContent").innerHTML =
                `<div class="audio-loading">Fetching audio analysis from Spotify...</div>`;
 
            // Open the panel with CSS animation
            document.getElementById("audioPanel").classList.add("open");
            document.getElementById("audioPanel").scrollIntoView({ behavior: "smooth", block: "nearest" });
 
            try {
                // POST first — saves features if not already saved
                await fetch(`${API}/audio-features/${trackId}`, { method: "POST" });
 
                // GET — retrieves the saved features
                const res = await fetch(`${API}/audio-features/${trackId}`);
 
                if (!res.ok) {
                    document.getElementById("featuresContent").innerHTML =
                        `<p style="color:var(--muted);text-align:center;padding:20px">
                            No audio features available for this track on Spotify.
                        </p>`;
                    return;
                }
 
                renderAudioFeatures(await res.json());
 
            } catch {
                document.getElementById("featuresContent").innerHTML =
                    `<p style="color:var(--muted);text-align:center;padding:20px">
                        Could not load audio features.
                    </p>`;
            }
        }
 
        // ── RENDER AUDIO FEATURES ──────────────────────────────────
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
                        <div class="feature-bar-fill ${b.cls}"
                             style="width:0%"
                             data-target="${pct ?? 0}">
                        </div>
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
 
            // Small delay so CSS transition animates from 0 → target
            setTimeout(() => {
                document.querySelectorAll(".feature-bar-fill").forEach(bar => {
                    bar.style.width = bar.dataset.target + "%";
                });
            }, 50);
        }
 
        // ── CLOSE AUDIO PANEL ─────────────────────────────────────
        function closeAudioPanel() {
            selectedTrackId = null;
            document.getElementById("audioPanel").classList.remove("open");
            document.querySelectorAll(".track-row").forEach(r => r.classList.remove("active"));
        }
 
        // ── FETCH & SAVE TRACKS ────────────────────────────────────
        async function fetchAndSaveTracks() {
            if (!selectedArtistId) return;
            closeAudioPanel();
            document.getElementById("tracksList").innerHTML = `<div class="loading">Fetching from Spotify</div>`;
            try {
                const res = await fetch(`${API}/artists/${selectedArtistId}/tracks`, { method: "POST" });
                if (res.ok) {
                    showNotification("Tracks fetched! 🎧");
                    selectArtist(selectedArtistId, document.getElementById("selectedArtistName").textContent);
                    loadStats();
                } else {
                    showNotification("Could not fetch tracks.", true);
                }
            } catch { showNotification("API connection failed.", true); }
        }
 
        // ── HELPERS ────────────────────────────────────────────────
        function formatDuration(ms) {
            if (!ms) return "--:--";
            const s = Math.floor(ms / 1000);
            return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
        }
 
        function showNotification(msg, isError = false) {
            const n = document.getElementById("notification");
            n.textContent   = msg;
            n.className     = "notification" + (isError ? " error" : "");
            n.style.display = "block";
            setTimeout(() => { n.style.display = "none"; }, 3000);
        }
 
        document.getElementById("searchInput").addEventListener("keypress", e => {
            if (e.key === "Enter") searchArtists();
        });