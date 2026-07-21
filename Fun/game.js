const API_URL = "https://ptrjstn-github-io.vercel.app/api/game";
const form = document.querySelector("[data-guess-form]");
const input = form.elements.guess;
const submit = form.querySelector("button");
const stage = document.querySelector("[data-stage]");
const message = document.querySelector("[data-message]");
const history = document.querySelector("[data-history]");
const result = document.querySelector("[data-result]");
const STORAGE = "wortpfad-v2-";
let game;
let timer;
let requestInFlight = false;

const normalize = (value) => value.trim().normalize("NFC").toLocaleLowerCase("de-DE");
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
function save() { try { localStorage.setItem(`${STORAGE}${game.id}`, JSON.stringify(game)); } catch {} }
function setMessage(text = "", state = "") { message.textContent = text; message.dataset.state = state; }
function renderHistory() {
  history.replaceChildren(); const line = document.createElement("div"); line.className = "history__path";
  game.path.forEach((word) => { const item = document.createElement("span"); item.textContent = word; line.append(item); }); history.append(line);
}
function renderStage() {
  stage.replaceChildren(); const center = document.createElement("div"); center.className = "orb orb--center"; center.textContent = game.current; stage.append(center);
  game.neighbors.forEach((word, index) => { const orb = document.createElement("div"); orb.className = "orb orb--neighbor"; orb.dataset.word = word; orb.textContent = game.revealed ? word : "?"; if (game.revealed) orb.classList.add("orb--revealed"); if (normalize(word) === normalize(game.lastHit || "")) orb.classList.add("orb--hit"); stage.append(orb); });
}
function render() {
  document.querySelector("[data-goal]").textContent = game.goal;
  document.querySelector("[data-date]").textContent = game.dateLabel;
  document.querySelector("[data-steps]").textContent = Math.max(0, game.path.length - 1);
  document.querySelector("[data-misses]").textContent = game.misses.length;
  document.querySelector("[data-time]").textContent = formatTime(game.elapsed || 0);
  renderStage(); renderHistory(); form.hidden = game.finished; result.hidden = !game.finished;
  if (game.finished) { document.querySelector("[data-final-steps]").textContent = game.path.length - 1; document.querySelector("[data-final-misses]").textContent = game.misses.length; document.querySelector("[data-final-time]").textContent = formatTime(game.elapsed); }
}
function startTimer() { clearInterval(timer); if (game.finished) return; game.startedAt ||= Date.now(); save(); timer = setInterval(() => { game.elapsed = Math.floor((Date.now() - game.startedAt) / 1000); document.querySelector("[data-time]").textContent = formatTime(game.elapsed); }, 1000); }
async function initialize() {
  const response = await fetch(`${API_URL}?date=${today()}`); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Das Rätsel konnte nicht geladen werden.");
  let saved; try { saved = JSON.parse(localStorage.getItem(`${STORAGE}${data.id}`)); } catch {}
  game = saved?.id === data.id ? saved : { id: data.id, dateLabel: data.dateLabel, start: data.start, goal: data.goal, current: data.start, neighbors: data.neighbors, path: [data.start], misses: [], revealed: false, elapsed: 0, finished: false };
  render(); startTimer(); if (!game.finished) input.focus();
}
form.addEventListener("submit", async (event) => {
  event.preventDefault(); const raw = input.value.trim(); if (!raw || !game || game.finished || requestInFlight) return; const guess = normalize(raw);
  if (game.misses.some((word) => normalize(word) === guess) || game.path.some((word) => normalize(word) === guess)) { setMessage("Schon versucht", "invalid"); input.select(); return; }
  requestInFlight = true; submit.disabled = true; setMessage("", "");
  try {
    const response = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ puzzleId: game.id, current: game.current, guess: raw, attemptNumber: game.path.length - 1 + game.misses.length + 1, durationSeconds: Math.floor((Date.now() - game.startedAt) / 1000) }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || "Nicht dabei");
    game.revealed = true; game.lastHit = data.word; input.value = ""; setMessage("Dabei", "valid"); render();
    await new Promise((resolve) => setTimeout(resolve, 620));
    game.current = data.word; game.path.push(data.word); game.neighbors = data.neighbors || []; game.revealed = false; game.lastHit = "";
    if (data.solved) { game.finished = true; game.percentile = data.percentile; clearInterval(timer); }
    save(); render(); if (!game.finished) input.focus();
  } catch (error) { if (error.message === "Nicht dabei" || error.message === "Ungültig") { game.misses.push(raw); save(); render(); setMessage("Nicht dabei", "invalid"); } else setMessage(error.message, "invalid"); input.select(); }
  finally { requestInFlight = false; submit.disabled = false; }
});
document.querySelector("[data-share]").addEventListener("click", async () => { const text = `Wortpfad: ${game.path.length - 1} Schritte, ${game.misses.length} Fehlversuche.`; try { if (navigator.share) await navigator.share({ title: "Wortpfad", text }); else await navigator.clipboard.writeText(text); setMessage("Ergebnis kopiert", "valid"); } catch {} });
initialize().catch((error) => setMessage(error.message, "invalid"));
