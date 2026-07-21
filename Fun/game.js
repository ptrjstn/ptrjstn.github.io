const API_URL = "https://ptrjstn-github-io.vercel.app/api/game";
const form = document.querySelector("[data-guess-form]");
const input = form.elements.guess;
const submit = form.querySelector("button");
const path = document.querySelector("[data-path]");
const message = document.querySelector("[data-message]");
const result = document.querySelector("[data-result]");
const steps = document.querySelector("[data-steps]");
const time = document.querySelector("[data-time]");
const date = document.querySelector("[data-date]");
const STORAGE = "wortpfad-";
let game;
let timer;

const normalize = (value) => value.trim().normalize("NFC").toLocaleLowerCase("de-DE");
const day = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

function setMessage(text = "", state = "") { message.textContent = text; message.dataset.state = state; }
function save() { try { localStorage.setItem(`${STORAGE}${game.id}`, JSON.stringify(game)); } catch {} }
function render() {
  path.replaceChildren();
  const visibleWords = game.finished ? [game.start, ...game.words] : [game.start, ...game.words, game.goal];
  visibleWords.forEach((word, index, words) => {
    const item = document.createElement("div"); item.className = "path__word";
    if (index === 0 || index === words.length - 1) item.classList.add("path__word--endpoint");
    item.textContent = word; path.append(item);
    if (index < words.length - 1) { const connector = document.createElement("div"); connector.className = "path__connector"; path.append(connector); }
  });
  const empty = document.createElement("div"); empty.className = "path__empty"; path.append(empty);
  steps.textContent = game.words.length;
  time.textContent = formatTime(game.elapsed || 0);
  form.hidden = game.finished; result.hidden = !game.finished;
  if (game.finished) {
    document.querySelector("[data-final-steps]").textContent = game.words.length;
    document.querySelector("[data-final-time]").textContent = formatTime(game.elapsed);
    document.querySelector("[data-percentile]").textContent = `${game.percentile}%`;
  }
}
function startTimer() {
  clearInterval(timer); if (game.finished) return;
  game.startedAt ||= Date.now(); save();
  timer = setInterval(() => { game.elapsed = Math.floor((Date.now() - game.startedAt) / 1000); time.textContent = formatTime(game.elapsed); }, 1000);
}
async function initialize() {
  const response = await fetch(`${API_URL}?date=${day()}`); const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Das Rätsel konnte nicht geladen werden.");
  let saved = null; try { saved = JSON.parse(localStorage.getItem(`${STORAGE}${data.id}`)); } catch {}
  game = saved?.id === data.id ? saved : { id: data.id, start: data.start, goal: data.goal, words: [], elapsed: 0, finished: false };
  date.textContent = data.dateLabel; render(); startTimer(); if (!game.finished) input.focus();
}
form.addEventListener("submit", async (event) => {
  event.preventDefault(); const raw = input.value.trim(); if (!raw || !game || game.finished) return;
  submit.disabled = true; setMessage("", "");
  try {
    const response = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ puzzleId: game.id, current: game.words.at(-1) || game.start, guess: raw, attemptNumber: game.words.length + 1, durationSeconds: Math.floor((Date.now() - game.startedAt) / 1000) }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || "Ungültig");
    input.value = ""; game.words.push(data.word); game.elapsed = Math.floor((Date.now() - game.startedAt) / 1000); setMessage("Gültig", "valid");
    if (data.solved) { game.finished = true; game.percentile = data.percentile; clearInterval(timer); }
    save(); render();
  } catch (error) { setMessage(error.message === "Ungültig" ? "Ungültig" : error.message, "invalid"); input.select(); }
  finally { submit.disabled = false; }
});
initialize().catch((error) => setMessage(error.message, "invalid"));
