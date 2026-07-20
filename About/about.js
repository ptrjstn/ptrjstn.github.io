const aboutText = document.querySelector("[data-about-text]");
const aboutArt = document.querySelector("[data-about-art]");
const portraitTrigger = document.querySelector("[data-about-portrait-trigger]");
const reloadButton = document.querySelector("[data-about-reload]");
const fallbackText = "Peter ist Copywriter und Konzeptioner aus Tübingen. Er interessiert sich für KI, Text, Sprache, Kunst und Musik. In seiner Freizeit erfindet er Spiele und Kinderbücher und arbeitet an KI-Projekten wie dieser Website.";
const fallbackArt = [
  { shape: "blob", x: 5, y: 22, width: 52, height: 16, rotation: -7, color: "cyan" },
  { shape: "scribble", x: 58, y: 48, width: 34, height: 12, rotation: 8, color: "magenta" },
  { shape: "smear", x: 12, y: 74, width: 46, height: 7, rotation: -3, color: "orange" },
];

function requestId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function showTextLoader() {
  aboutText.dataset.state = "loading";
  aboutText.innerHTML = `
    <span class="loading-dot" aria-hidden="true">•</span>
    <span class="loading-dot" aria-hidden="true">•</span>
    <span class="loading-dot" aria-hidden="true">•</span>
    <span class="sr-only">Text wird von der KI geschrieben.</span>
  `;
}

function renderAboutText(text) {
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  aboutText.replaceChildren(paragraph);
  aboutText.dataset.state = "loaded";
}

function renderAboutArt(items) {
  const fragment = document.createDocumentFragment();

  items.forEach((item, index) => {
    const element = document.createElement("span");
    element.className = `about__art-element about__art-element--${item.shape} about__art-element--${item.color}`;
    element.style.setProperty("--art-x", `${item.x}%`);
    element.style.setProperty("--art-y", `${item.y}%`);
    element.style.setProperty("--art-width", `${item.width}%`);
    element.style.setProperty("--art-height", `${item.height}%`);
    element.style.setProperty("--art-rotation", `${item.rotation}deg`);
    element.style.setProperty("--art-delay", `${index * -0.37}s`);
    fragment.appendChild(element);
  });

  aboutArt.replaceChildren(fragment);
}

async function loadAboutData({ updateText, updateArt }) {
  if (updateText) {
    showTextLoader();
    reloadButton.disabled = true;
    reloadButton.dataset.loading = "true";
  }

  if (updateArt) {
    portraitTrigger.dataset.loading = "true";
  }

  try {
    const response = await fetch(
      `https://ptrjstn-github-io.vercel.app/api/about?request=${requestId()}`,
      { cache: "no-store" }
    );
    const data = await response.json();

    if (!response.ok || !data.text) {
      throw new Error(data.error || "Die About-Inhalte konnten nicht geladen werden.");
    }

    if (updateText) {
      renderAboutText(data.text);
    }

    if (updateArt) {
      renderAboutArt(Array.isArray(data.art) && data.art.length ? data.art : fallbackArt);
    }
  } catch (error) {
    console.error("Fehler beim Laden der About-Inhalte:", error);

    if (updateText) {
      renderAboutText(fallbackText);
    }

    if (updateArt && !aboutArt.children.length) {
      renderAboutArt(fallbackArt);
    }
  } finally {
    if (updateText) {
      reloadButton.disabled = false;
      delete reloadButton.dataset.loading;
    }

    if (updateArt) {
      delete portraitTrigger.dataset.loading;
    }
  }
}

reloadButton.addEventListener("click", () => {
  loadAboutData({ updateText: true, updateArt: true });
});

portraitTrigger.addEventListener("click", () => {
  loadAboutData({ updateText: false, updateArt: true });
});

portraitTrigger.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    loadAboutData({ updateText: false, updateArt: true });
  }
});

loadAboutData({ updateText: true, updateArt: true });
