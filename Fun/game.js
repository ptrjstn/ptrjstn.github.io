const API_URL = "https://ptrjstn-github-io.vercel.app/api/game";
const form = document.querySelector("[data-guess-form]");
const input = form.elements.guess;
const submitButton = form.querySelector("button");
const message = document.querySelector("[data-message]");
const list = document.querySelector("[data-attempts]");
const empty = document.querySelector("[data-empty]");
const result = document.querySelector("[data-result]");
const solution = document.querySelector("[data-solution]");
const summary = document.querySelector("[data-summary]");
const newGameButton = document.querySelector("[data-new-game]");
const sortButtons = [...document.querySelectorAll("[data-sort]")];
let game = null;
let sortKey = "rank";
let sortDirection = "asc";

const storageKey = (id) => `ptrjstn-neuronym-${id}`;
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
  list.replaceChildren();
  empty.hidden = game.attempts.length > 0;
  const ranks = game.attempts.filter((item) => !item.solved).map((item) => item.rank);
  const bestRank = ranks.length ? Math.min(...ranks) : null;

  const attempts = game.attempts.map((attempt, index) => ({
    ...attempt,
    attemptNumber: index + 1,
    sortRank: attempt.solved ? 1 : Number(attempt.rank),
  }));
  attempts.sort((left, right) => {
    const primaryDifference = sortKey === "rank"
      ? left.sortRank - right.sortRank
      : left.attemptNumber - right.attemptNumber;
    const difference = Number.isNaN(primaryDifference)
      ? right.attemptNumber - left.attemptNumber
      : primaryDifference || right.attemptNumber - left.attemptNumber;
    return sortDirection === "asc" ? difference : -difference;
  });

  sortButtons.forEach((button) => {
    const active = button.dataset.sort === sortKey;
    const label = button.dataset.sort === "attempt" ? "Versuch" : "Rang";
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute(
      "aria-label",
      active
        ? `${label}, ${sortDirection === "asc" ? "aufsteigend" : "absteigend"} sortiert`
        : `Nach ${label} sortieren`,
    );
    button.querySelector("span").textContent = active
      ? (sortDirection === "asc" ? "↑" : "↓")
      : "";
  });

  attempts.forEach((attempt) => {
    const item = document.createElement("li");
    item.className = "attempt";
    if (attempt.rank === bestRank) item.classList.add("attempt--best");
    if (attempt.solved) item.classList.add("attempt--solution");
    const number = document.createElement("span");
    number.className = "attempt__number";
    number.textContent = String(attempt.attemptNumber).padStart(2, "0");
    const word = document.createElement("span");
    word.className = "attempt__word";
    word.textContent = attempt.word;
    const rank = document.createElement("strong");
    rank.className = "attempt__rank";
    rank.textContent = attempt.solved ? "Treffer" : `#${attempt.rank}`;
    item.append(number, word, rank);
    list.append(item);
  });

  result.hidden = !game.solved;
  form.hidden = game.solved;
  if (game.solved) {
    solution.textContent = game.solution;
    summary.textContent = `Gelöst in ${game.attempts.length} ${game.attempts.length === 1 ? "Versuch" : "Versuchen"}.`;
  }
}

async function initialize(loadNext = false) {
  newGameButton.disabled = true;
  try {
    const params = new URLSearchParams({ request: Date.now() });
    if (loadNext && game?.id) params.set("after", game.id);
    const response = await fetch(`${API_URL}?${params}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Das Neuronym konnte nicht geladen werden.");
    game = { id: data.id, ...readProgress(data.id) };
    sortKey = "rank";
    sortDirection = "asc";
    setMessage();
    render();
    if (!game.solved) input.focus();
  } catch (error) {
    setMessage(error.message, true);
    if (!game) form.hidden = true;
  } finally {
    newGameButton.disabled = false;
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
    const previousRanks = game.attempts.filter((item) => !item.solved).map((item) => item.rank);
    const previousBest = previousRanks.length ? Math.min(...previousRanks) : null;
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        puzzleId: game.id,
        guess,
        attemptNumber: game.attempts.length + 1,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Das Wort konnte nicht geprüft werden.");
    game.attempts.push({ word: data.word, rank: data.rank, solved: data.solved });
    game.solved = data.solved;
    if (data.solved) game.solution = data.word;
    saveProgress();
    input.value = "";
    const progress = previousBest !== null && data.rank < previousBest
      ? "Neue beste Spur. "
      : previousBest !== null && data.rank > previousBest
        ? "Dein bisher bestes Wort liegt näher. "
        : "";
    const hint = data.hint || data.temperature || "Probiere eine andere Assoziation.";
    setMessage(data.solved ? "Genau das ist das Neuronym." : `${progress}${hint}`);
    render();
  } catch (error) {
    setMessage(error.message, true);
    input.select();
  } finally {
    submitButton.disabled = false;
  }
});

sortButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const nextKey = button.dataset.sort;
    if (nextKey === sortKey) sortDirection = sortDirection === "asc" ? "desc" : "asc";
    else {
      sortKey = nextKey;
      sortDirection = nextKey === "rank" ? "asc" : "desc";
    }
    render();
  });
});

newGameButton.addEventListener("click", () => initialize(true));

initialize();
