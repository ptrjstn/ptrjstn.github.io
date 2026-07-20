const API_URL = "https://ptrjstn-github-io.vercel.app/api/game";
const form = document.querySelector("[data-guess-form]");
const input = form.elements.guess;
const submitButton = form.querySelector("button");
const message = document.querySelector("[data-message]");
const list = document.querySelector("[data-attempts]");
const empty = document.querySelector("[data-empty]");
const best = document.querySelector("[data-best]");
const result = document.querySelector("[data-result]");
const solution = document.querySelector("[data-solution]");
const summary = document.querySelector("[data-summary]");
const puzzleNumber = document.querySelector("[data-puzzle-number]");
const shareButton = document.querySelector("[data-share]");
let game = null;

const storageKey = (id) => `ptrjstn-tageswort-${id}`;
const normalize = (word) => word.trim().toLocaleLowerCase("de-DE");

function readProgress(id) {
  try { return JSON.parse(localStorage.getItem(storageKey(id))) || { attempts: [], solved: false }; }
  catch (error) { return { attempts: [], solved: false }; }
}
function saveProgress() {
  try { localStorage.setItem(storageKey(game.id), JSON.stringify(game)); } catch (error) {
    // Das Spiel bleibt auch ohne verfügbaren lokalen Speicher nutzbar.
  }
}
function setMessage(text = "", isError = false) {
  message.textContent = text;
  message.dataset.error = String(isError);
}
function render() {
  puzzleNumber.textContent = `#${game.number}`;
  list.replaceChildren();
  empty.hidden = game.attempts.length > 0;
  const ranked = game.attempts.filter((item) => !item.solved);
  const bestRank = ranked.length ? Math.min(...ranked.map((item) => item.rank)) : null;
  best.textContent = bestRank ? `Bester Rang: #${bestRank}` : "Bester Rang: –";

  game.attempts.forEach((attempt, index) => {
    const item = document.createElement("li");
    item.className = "attempt";
    if (attempt.rank === bestRank) item.classList.add("attempt--best");
    if (attempt.solved) item.classList.add("attempt--solution");
    const number = document.createElement("span");
    number.className = "attempt__number";
    number.textContent = String(index + 1).padStart(2, "0");
    const word = document.createElement("span");
    word.className = "attempt__word";
    word.textContent = attempt.word;
    const rank = document.createElement("strong");
    rank.className = "attempt__rank";
    rank.textContent = attempt.solved ? "Treffer" : `#${attempt.rank}`;
    item.append(number, word, rank);
    list.prepend(item);
  });

  result.hidden = !game.solved;
  form.hidden = game.solved;
  if (game.solved) {
    solution.textContent = game.solution;
    summary.textContent = `Gelöst in ${game.attempts.length} ${game.attempts.length === 1 ? "Versuch" : "Versuchen"}.`;
  }
}

async function initialize() {
  try {
    const response = await fetch(`${API_URL}?request=${Date.now()}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Das Tageswort konnte nicht geladen werden.");
    game = { id: data.id, number: data.number, ...readProgress(data.id) };
    render();
    if (!game.solved) input.focus();
  } catch (error) {
    setMessage(error.message, true);
    form.hidden = true;
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const guess = input.value.trim();
  const normalized = normalize(guess);
  if (!guess || !game) return;
  if (game.attempts.some((item) => normalize(item.word) === normalized)) {
    setMessage("Dieses Wort hast du bereits versucht.", true);
    input.select();
    return;
  }
  submitButton.disabled = true;
  setMessage("Wird geprüft …");
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ puzzleId: game.id, guess }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Das Wort konnte nicht geprüft werden.");
    game.attempts.push({ word: data.word, rank: data.rank, solved: data.solved });
    game.solved = data.solved;
    if (data.solved) game.solution = data.word;
    saveProgress();
    input.value = "";
    setMessage(data.solved ? "Genau das ist das Tageswort." : data.temperature);
    render();
  } catch (error) {
    setMessage(error.message, true);
    input.select();
  } finally {
    submitButton.disabled = false;
  }
});

shareButton.addEventListener("click", async () => {
  const ranks = game.attempts.map((item) => item.solved ? "🎯" : item.rank).join(" → ");
  const text = `Tageswort #${game.number}\nGelöst in ${game.attempts.length} Versuchen\n${ranks}`;
  try {
    if (navigator.share) await navigator.share({ text, url: location.href });
    else { await navigator.clipboard.writeText(`${text}\n${location.href}`); setMessage("Ergebnis kopiert."); }
  } catch (error) {
    if (error.name !== "AbortError") setMessage("Das Ergebnis konnte nicht geteilt werden.", true);
  }
});

initialize();
