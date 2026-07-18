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
const neologismEntry = neologismWord.closest(".neologism-entry");
const neologismDetails = document.querySelector("[data-neologism-details]");
const neologismMeta = document.querySelector("[data-neologism-meta]");
const neologismDefinition = document.querySelector("[data-neologism-definition]");
let fitAnimationFrame;

function positionWordAndDetails() {
  if (neologismDetails.hidden || neologismWord.dataset.state !== "loaded") {
    return;
  }

  const letterImages = Array.from(neologismWord.querySelectorAll(".neologism-word__letter img"));
  const captionElements = [neologismMeta, neologismDefinition].filter(
    (element) => element.textContent.trim()
  );

  if (!letterImages.length || !captionElements.length) {
    return;
  }

  neologismEntry.style.setProperty("--overlap-shift", "0px");

  const deepestLetterBottom = Math.max(
    ...letterImages.map((image) => image.getBoundingClientRect().bottom)
  );
  const highestCaptionTop = Math.min(
    ...captionElements.map((element) => element.getBoundingClientRect().top)
  );
  const overlap = Math.max(0, deepestLetterBottom + 12 - highestCaptionTop);

  neologismEntry.style.setProperty("--overlap-shift", `${(overlap / 2).toFixed(2)}px`);
}

function fitWordAboveDetails() {
  window.cancelAnimationFrame(fitAnimationFrame);
  fitAnimationFrame = window.requestAnimationFrame(positionWordAndDetails);
}

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

function adjustLetterForAspectRatio(image) {
  const aspectRatio = image.naturalHeight / image.naturalWidth;
  const aspectScale = aspectRatio > 1.4
    ? Math.max(0.55, 1 - (aspectRatio - 1.4) * 0.26)
    : 1;

  image.style.setProperty("--aspect-scale", aspectScale.toFixed(3));
}

function setLetterVariant(button, variant) {
  const letter = button.dataset.letter;
  const image = button.querySelector("img");
  const number = String(variant).padStart(2, "0");

  button.dataset.variant = String(variant);
  image.src = `assets/letters/${letter}/${letter}_${number}.webp`;
}

function randomizeLetterPosition(button) {
  const isMobile = window.matchMedia("(max-width: 760px)").matches;
  const x = Math.round((Math.random() - 0.5) * (isMobile ? 6 : 10));
  const y = Math.round((Math.random() - 0.5) * (isMobile ? 4 : 12));
  const tilt = (Math.random() - 0.5) * (isMobile ? 1.6 : 2.4);
  const scale = isMobile
    ? 0.97 + Math.random() * 0.04
    : 0.96 + Math.random() * 0.06;

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

async function renderLetterWord(word) {
  const letters = normalizeWord(word);

  if (!letters) {
    throw new Error("Das Wort enthält keine darstellbaren Buchstaben.");
  }

  const fragment = document.createDocumentFragment();
  const imageReadyPromises = [];
  const buttons = Array.from(letters).map((letter) => {
    const button = document.createElement("button");
    const image = document.createElement("img");

    button.className = "neologism-word__letter";
    button.type = "button";
    button.dataset.letter = letter;
    button.setAttribute("aria-label", `Buchstabe ${letter} austauschen`);
    image.alt = "";
    image.addEventListener("load", () => {
      adjustLetterForAspectRatio(image);
      fitWordAboveDetails();
    });
    imageReadyPromises.push(new Promise((resolve, reject) => {
      image.addEventListener("load", async () => {
        try {
          await image.decode();
        } catch (error) {
          // A successful load still provides usable image dimensions.
        }
        resolve();
      }, { once: true });
      image.addEventListener("error", () => {
        reject(new Error(`Das Letter-Bild für ${letter} konnte nicht geladen werden.`));
      }, { once: true });
    }));
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

  const infoButton = document.createElement("button");
  const infoTooltip = document.createElement("span");

  infoButton.className = "neologism-info";
  infoButton.type = "button";
  infoButton.setAttribute("aria-label", "Über den Neologismus");
  infoButton.setAttribute("aria-describedby", "neologism-info-text");
  infoButton.textContent = "i";

  infoTooltip.id = "neologism-info-text";
  infoTooltip.className = "neologism-info__tooltip";
  infoTooltip.setAttribute("role", "tooltip");
  infoTooltip.textContent = "Eine kleine sprachliche Spielerei: Künstliche Intelligenz erfindet bei jedem Besuch ein neues Wort – samt Lautschrift und eigener Definition.";
  infoButton.appendChild(infoTooltip);
  fragment.appendChild(infoButton);

  await Promise.all(imageReadyPromises);

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
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const response = await fetch(
      `https://ptrjstn-github-io.vercel.app/api/neologism?request=${requestId}`,
      { cache: "no-store" }
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Der Neologismus konnte nicht geladen werden.");
    }

    if (!data.word) {
      throw new Error("Die API hat kein Wort zurückgegeben.");
    }

    await renderLetterWord(data.word);
    renderDetails(data);
    positionWordAndDetails();
  } catch (error) {
    neologismWord.textContent = error.message || "Der Neologismus konnte nicht geladen werden.";
    neologismWord.dataset.state = "error";
  }
}

window.addEventListener("resize", fitWordAboveDetails);

if (typeof ResizeObserver === "function") {
  const layoutObserver = new ResizeObserver(fitWordAboveDetails);
  layoutObserver.observe(neologismWord);
  layoutObserver.observe(neologismDetails);
}

loadNeologism();
