const API_URL = "https://ptrjstn-github-io.vercel.app/api/game";
const letterVariantCounts = { A: 55, B: 26, C: 28, D: 25, E: 32, F: 25, G: 31, H: 23, I: 23, J: 21, K: 22, L: 22, M: 28, N: 32, O: 26, P: 21, Q: 19, R: 33, S: 50, T: 25, U: 22, V: 20, W: 22, X: 18, Y: 24, Z: 21 };
const currentArea = document.querySelector("[data-current-area]");
const keyboard = document.querySelector("[data-keyboard]");
const draftElement = document.querySelector("[data-draft]");
const chainElement = document.querySelector("[data-chain]");
const message = document.querySelector("[data-message]");
const result = document.querySelector("[data-result]");
const STORAGE = "wortpfad-letters-";
let game;
let draft = "";
let draftVariants = [];
let requestInFlight = false;
let timer;

const normalize = (value) => String(value || "").trim().normalize("NFC").toLocaleLowerCase("de-DE");
const displayLetters = (word) => word.toLocaleUpperCase("de-DE").replace(/Ä/g, "A").replace(/Ö/g, "O").replace(/Ü/g, "U").replace(/ẞ/g, "SS").replace(/[^A-Z]/g, "");
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
function save() { try { localStorage.setItem(`${STORAGE}${game.id}`, JSON.stringify(game)); } catch {} }
function randomVariant(letter) { return Math.floor(Math.random() * letterVariantCounts[letter]) + 1; }
function createLetterImage(letter, variant, index) {
  const image = document.createElement("img"); image.className = "letter"; image.dataset.letter = letter; image.alt = letter; image.src = `../assets/letters/${letter}/${letter}_${String(variant).padStart(2, "0")}.webp`; image.style.animationDelay = `${index * 18}ms`; return image;
}
function renderLetters(container, word, extraClass = "", variants = null) {
  container.replaceChildren(); container.className = `letter-word ${extraClass}`;
  displayLetters(word).split("").forEach((letter, index) => { const previous = variants?.[index]; const variant = previous?.letter === letter ? previous.variant : randomVariant(letter); if (variants) variants[index] = { letter, variant }; container.append(createLetterImage(letter, variant, index)); });
  if (variants) variants.length = displayLetters(word).length;
}
function renderDraft() {
  const letters = displayLetters(draft).split(""); const before = new Map([...draftElement.children].map((item) => [item, item.getBoundingClientRect().left]));
  draftElement.className = "letter-word letter-word--draft";
  while (draftElement.children.length > letters.length) draftElement.lastElementChild.remove();
  letters.forEach((letter, index) => { const current = draftElement.children[index]; const previous = draftVariants[index]; const variant = previous?.letter === letter ? previous.variant : randomVariant(letter); draftVariants[index] = { letter, variant }; if (current?.dataset.letter !== letter) { const replacement = createLetterImage(letter, variant, index); current?.replaceWith(replacement); if (!current) draftElement.append(replacement); } });
  draftVariants.length = letters.length;
  const after = new Map([...draftElement.children].map((item) => [item, item.getBoundingClientRect().left]));
  draftElement.querySelectorAll(".letter").forEach((item) => { const delta = (before.get(item) ?? item.getBoundingClientRect().left) - after.get(item); if (!delta) return; item.style.transition = "none"; item.style.transform = `translateX(${delta}px)`; requestAnimationFrame(() => { item.style.transition = "transform 220ms cubic-bezier(.2,.75,.25,1)"; item.style.transform = "translateX(0)"; }); });
}
function renderChain() { chainElement.replaceChildren(); game.path.slice(1).forEach((word) => { const item = document.createElement("div"); renderLetters(item, word); item.classList.add("chain-word"); chainElement.append(item); }); }
function appendChainWord(word) { const item = document.createElement("div"); renderLetters(item, word); item.classList.add("chain-word"); chainElement.append(item); }
function renderFinalPath() {
  const finalPath = document.querySelector("[data-final-path]"); finalPath.replaceChildren();
  game.path.forEach((word, index) => { const item = document.createElement("span"); renderLetters(item, word); item.classList.add("result-word"); finalPath.append(item); if (index < game.path.length - 1) { const arrow = document.createElement("span"); arrow.className = "path-arrow"; arrow.textContent = "→"; finalPath.append(arrow); } });
}
function render() {
  document.querySelector("[data-start]").textContent = game.start; document.querySelector("[data-goal]").textContent = game.goal; renderDraft(); result.hidden = !game.finished;
  if (game.finished) { renderFinalPath(); document.querySelector("[data-final-steps]").textContent = game.path.length - 1; document.querySelector("[data-final-misses]").textContent = game.misses.length; document.querySelector("[data-final-time]").textContent = formatTime(game.elapsed); }
}
function setMessage(text = "", state = "") { message.textContent = text; message.dataset.state = state; }
function startTimer() { clearInterval(timer); if (game.finished) return; game.startedAt ||= Date.now(); save(); timer = setInterval(() => { game.elapsed = Math.floor((Date.now() - game.startedAt) / 1000); }, 1000); }
async function submitWord() {
  if (!draft || !game || game.finished || requestInFlight) return; const raw = draft; const guess = normalize(raw); if (game.path.some((word) => normalize(word) === guess) || game.misses.some((word) => normalize(word) === guess)) { setMessage("Schon versucht", "invalid"); draft = ""; draftVariants = []; renderLetters(draftElement, "", "letter-word--draft", draftVariants); return; }
  requestInFlight = true; setMessage("", "");
  try {
    const response = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ puzzleId: game.id, current: game.current, guess: raw, attemptNumber: game.path.length - 1 + game.misses.length + 1, durationSeconds: Math.floor((Date.now() - game.startedAt) / 1000) }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || "Nicht dabei");
    game.current = data.word; game.path.push(data.word); if (!data.solved) appendChainWord(data.word); game.elapsed = Math.floor((Date.now() - game.startedAt) / 1000); draft = ""; draftVariants = []; setMessage("Gültig", "valid"); if (data.solved) { game.finished = true; clearInterval(timer); } save(); render();
  } catch (error) { game.misses.push(raw); draft = ""; draftVariants = []; save(); render(); setMessage(error.message === "Nicht dabei" ? "Nicht dabei" : error.message, "invalid"); }
  finally { requestInFlight = false; focusKeyboard(); }
}
function focusKeyboard() { if (!game?.finished) keyboard.focus({ preventScroll: true }); }
keyboard.addEventListener("input", () => { draft = `${draft}${keyboard.value.replace(/[^a-zäöüß]/giu, "")}`.slice(0, 40); keyboard.value = ""; renderDraft(); });
keyboard.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); submitWord(); } if (event.key === "Backspace") { event.preventDefault(); draft = draft.slice(0, -1); renderDraft(); } });
currentArea.addEventListener("click", focusKeyboard);
document.addEventListener("keydown", (event) => { if (event.target === keyboard) return; if (event.key === "Enter") { event.preventDefault(); submitWord(); } else if (event.key === "Backspace" && draft) { draft = draft.slice(0, -1); renderDraft(); } else if (event.key.length === 1 && /[a-zäöüß]/iu.test(event.key)) { draft += event.key; renderDraft(); } focusKeyboard(); });
document.querySelector("[data-new-game]").addEventListener("click", () => { try { localStorage.removeItem(`${STORAGE}${game.id}`); } catch {} window.location.reload(); });
async function initialize() { const response = await fetch(`${API_URL}?date=${today()}`); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Das Rätsel konnte nicht geladen werden."); let saved; try { saved = JSON.parse(localStorage.getItem(`${STORAGE}${data.id}`)); } catch {} game = saved?.id === data.id ? saved : { id: data.id, dateLabel: data.dateLabel, start: data.start, goal: data.goal, current: data.start, path: [data.start], misses: [], elapsed: 0, finished: false }; renderChain(); render(); startTimer(); focusKeyboard(); }
initialize().catch((error) => setMessage(error.message, "invalid"));
