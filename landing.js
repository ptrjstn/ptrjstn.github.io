const letterVariantCounts = {
  A: 55,
  B: 26,
  C: 28,
  D: 25,
  E: 32,
  F: 25,
  G: 31,
  H: 23,
  I: 23,
  J: 21,
  K: 22,
  L: 22,
  M: 28,
  N: 32,
  O: 26,
  P: 21,
  Q: 19,
  R: 33,
  S: 50,
  T: 25,
  U: 22,
  V: 20,
  W: 22,
  X: 18,
  Y: 24,
  Z: 21,
};

const neologismWord = document.querySelector("[data-neologism-word]");
const neologismDetails = document.querySelector("[data-neologism-details]");
const neologismMeta = document.querySelector("[data-neologism-meta]");
const neologismDefinition = document.querySelector("[data-neologism-definition]");

function normalizeWord(word) {
  return word
    .toLocaleUpperCase("de-DE")
    .replace(/Ä/g, "A")
    .replace(/Ö/g, "O")
    .replace(/Ü/g, "U")
    .replace(/ẞ/g, "SS")
    .replace(/[^A-Z]/g, "");
}

function randomVariant(letter, currentVariant = 0) {
  const count = letterVariantCounts[letter];
  let nextVariant = currentVariant;

  while (nextVariant === currentVariant) {
    nextVariant = Math.floor(Math.random() * count) + 1;
  }

  return nextVariant;
}

function setLetterVariant(button, variant) {
  const letter = button.dataset.letter;
  const image = button.querySelector("img");
  const number = String(variant).padStart(2, "0");

  button.dataset.variant = String(variant);
  image.src = `assets/letters/${letter}/${letter}_${number}.webp`;
}

function randomizeLetterPosition(button) {
  const x = Math.round((Math.random() - 0.5) * 10);
  const y = Math.round((Math.random() - 0.5) * 12);
  const tilt = (Math.random() - 0.5) * 2.4;
  const scale = 0.96 + Math.random() * 0.06;

  button.style.setProperty("--letter-x", `${x}px`);
  button.style.setProperty("--letter-y", `${y}px`);
  button.style.setProperty("--letter-tilt", `${tilt}deg`);
  button.style.setProperty("--letter-scale", scale.toFixed(3));
}

function randomizeStacking(buttons) {
  const shuffledButtons = [...buttons];

  for (let index = shuffledButtons.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffledButtons[index], shuffledButtons[swapIndex]] = [shuffledButtons[swapIndex], shuffledButtons[index]];
  }

  shuffledButtons.forEach((button, index) => {
    button.style.setProperty("--letter-z", String(index + 1));
  });
}

function bringLetterToFront(button, buttons) {
  const currentMaxZ = Math.max(...buttons.map((item) => Number(item.style.getPropertyValue("--letter-z") || 0)));
  button.style.setProperty("--letter-z", String(currentMaxZ + 1));
}

function renderDetails(data) {
  const article = data.article ? `${data.article.trim()} ` : "";
  const pronunciation = data.pronunciation
    ? data.pronunciation.trim().replace(/^\[|\]$/g, "")
    : data.word;

  neologismMeta.textContent = `, ${article}[${pronunciation}]`;
  neologismDefinition.textContent = data.definition;
  neologismDetails.hidden = false;
}

function renderLetterWord(word) {
  const letters = normalizeWord(word);

  if (!letters) {
    throw new Error("Das Wort enthält keine darstellbaren Buchstaben.");
  }

  const fragment = document.createDocumentFragment();
  const buttons = Array.from(letters).map((letter) => {
    const button = document.createElement("button");
    const image = document.createElement("img");

    button.className = "neologism-word__letter";
    button.type = "button";
    button.dataset.letter = letter;
    button.setAttribute("aria-label", `Buchstabe ${letter} austauschen`);
    image.alt = "";
    button.appendChild(image);

    randomizeLetterPosition(button);
    setLetterVariant(button, randomVariant(letter));

    button.addEventListener("click", () => {
      const currentVariant = Number(button.dataset.variant);
      setLetterVariant(button, randomVariant(letter, currentVariant));
      randomizeLetterPosition(button);
      bringLetterToFront(button, buttons);
    });

    fragment.appendChild(button);
    return button;
  });

  neologismWord.replaceChildren(fragment);
  neologismWord.style.gridTemplateColumns = `repeat(${letters.length}, minmax(0, 1fr))`;
  neologismWord.style.setProperty("--word-max-width", `${letters.length * 54}px`);
  neologismWord.setAttribute("aria-label", word);
  neologismWord.dataset.state = "loaded";
  randomizeStacking(buttons);
}

async function loadNeologism() {
  neologismWord.dataset.state = "loading";

  try {
    const response = await fetch("/api/neologism", { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Der Neologismus konnte nicht geladen werden.");
    }

    if (!data.word) {
      throw new Error("Die API hat kein Wort zurückgegeben.");
    }

    renderLetterWord(data.word);
    renderDetails(data);
  } catch (error) {
    neologismWord.textContent = error.message || "Der Neologismus konnte nicht geladen werden.";
    neologismWord.dataset.state = "error";
  }
}

loadNeologism();
