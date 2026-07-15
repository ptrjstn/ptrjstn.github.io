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

function normalizeWord(word) {
  return word
    .toLocaleUpperCase("de-DE")
    .replace(/Ä/g, "A")
    .replace(/Ö/g, "O")
    .replace(/Ü/g, "U")
    .replace(/ẞ/g, "SS")
    .replace(/[^A-Z]/g, "");
}

function randomVariant(letter) {
  return Math.floor(Math.random() * letterVariantCounts[letter]) + 1;
}

function renderLetterWord(word) {
  const letters = normalizeWord(word);

  if (!letters) {
    throw new Error("Das Wort enthält keine darstellbaren Buchstaben.");
  }

  const fragment = document.createDocumentFragment();

  Array.from(letters).forEach((letter) => {
    const image = document.createElement("img");
    const variant = String(randomVariant(letter)).padStart(2, "0");

    image.className = "neologism-word__letter";
    image.src = `assets/letters/${letter}/${letter}_${variant}.webp`;
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    fragment.appendChild(image);
  });

  neologismWord.replaceChildren(fragment);
  neologismWord.style.setProperty("--word-max-width", `${letters.length * 78}px`);
  neologismWord.setAttribute("aria-label", word);
  neologismWord.dataset.state = "loaded";
}

async function loadNeologism() {
  neologismWord.dataset.state = "loading";

  try {
    const response = await fetch("/api/neologism");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Der Neologismus konnte nicht geladen werden.");
    }

    if (!data.word) {
      throw new Error("Die API hat kein Wort zurückgegeben.");
    }

    renderLetterWord(data.word);
  } catch (error) {
    neologismWord.textContent = error.message || "Der Neologismus konnte nicht geladen werden.";
    neologismWord.dataset.state = "error";
  }
}

loadNeologism();
