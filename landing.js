const letterVariantCounts = {
  P: 21,
  T: 25,
  R: 33,
  J: 21,
  S: 50,
  N: 32,
};

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


const letterButtons = Array.from(document.querySelectorAll(".lettermark__letter"));

function randomizeStacking() {
  const shuffledButtons = [...letterButtons];

  for (let index = shuffledButtons.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffledButtons[index], shuffledButtons[swapIndex]] = [shuffledButtons[swapIndex], shuffledButtons[index]];
  }

  shuffledButtons.forEach((button, index) => {
    button.style.setProperty("--letter-z", String(index + 1));
  });
}

function bringLetterToFront(button) {
  const currentMaxZ = Math.max(...letterButtons.map((letterButton) => Number(letterButton.style.getPropertyValue("--letter-z") || 0)));
  button.style.setProperty("--letter-z", String(currentMaxZ + 1));
}

letterButtons.forEach((button) => {
  const letter = button.dataset.letter;
  const initialVariant = randomVariant(letter);

  randomizeLetterPosition(button);
  setLetterVariant(button, initialVariant);

  button.addEventListener("click", () => {
    const currentVariant = Number(button.dataset.variant);
    setLetterVariant(button, randomVariant(letter, currentVariant));
    randomizeLetterPosition(button);
    bringLetterToFront(button);
  });
});

randomizeStacking();

const neologismButton = document.querySelector("[data-neologism-open]");
const neologismDialog = document.querySelector(".neologism-dialog");
const neologismCloseButton = document.querySelector("[data-neologism-close]");
const neologismStatus = document.querySelector("[data-neologism-status]");
const neologismResult = document.querySelector("[data-neologism-result]");
const neologismWord = document.querySelector("[data-neologism-word]");
const neologismType = document.querySelector("[data-neologism-type]");
const neologismDefinition = document.querySelector("[data-neologism-definition]");

async function loadNeologism() {
  neologismResult.hidden = true;
  neologismStatus.hidden = false;
  neologismStatus.textContent = "Ein neues Wort entsteht …";

  try {
    const response = await fetch("/api/neologism");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Das neue Wort konnte nicht geladen werden.");
    }

    const article = data.article ? data.article.trim() : "";
    neologismWord.textContent = article ? `${article} ${data.word}` : data.word;
    neologismType.textContent = data.wordType || "Neologismus";
    neologismDefinition.textContent = data.definition;
    neologismStatus.hidden = true;
    neologismResult.hidden = false;
  } catch (error) {
    neologismStatus.textContent = error.message || "Das neue Wort konnte nicht geladen werden.";
  }
}

neologismButton.addEventListener("click", () => {
  neologismDialog.showModal();
  loadNeologism();
});

neologismCloseButton.addEventListener("click", () => {
  neologismDialog.close();
});

neologismDialog.addEventListener("click", (event) => {
  if (event.target === neologismDialog) {
    neologismDialog.close();
  }
});
