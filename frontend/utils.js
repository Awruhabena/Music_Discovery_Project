const API = "https://127.0.0.1:8000";

function showNotification(msg, isError = false) {
    const n = document.getElementById("notification");
    n.textContent = msg;
    n.className = "notification" + (isError ? " error" : "");
    n.style.display = "block";
    setTimeout(() => { n.style.display = "none"; }, 3000);
}

function formatDuration(ms) {
    if (!ms) return "--:--";
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

