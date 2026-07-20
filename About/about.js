const aboutText = document.querySelector("[data-about-text]");
const aboutArt = document.querySelector("[data-about-art]");
const reloadButton = document.querySelector("[data-about-reload]");
const fallbackText = "Peter ist Copywriter und Konzeptioner aus Tübingen. Er interessiert sich für KI, Text, Sprache, Kunst und Musik. In seiner Freizeit erfindet er Spiele und Kinderbücher und arbeitet an KI-Projekten wie dieser Website.";
const fallbackArt = [
  { shape: "line", x: 5, y: 24, width: 72, height: 3, rotation: -4, color: "cyan" },
  { shape: "rectangle", x: 61, y: 48, width: 30, height: 8, rotation: 3, color: "magenta" },
  { shape: "circle", x: 12, y: 72, width: 18, height: 12, rotation: 0, color: "orange" },
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

async function loadAboutText(updateArt = false) {
  showTextLoader();
  reloadButton.disabled = true;
  reloadButton.dataset.loading = "true";

  try {
    const response = await fetch(
      `https://ptrjstn-github-io.vercel.app/api/about?request=${requestId()}`,
      { cache: "no-store" }
    );
    const data = await response.json();

    if (!response.ok || !data.text) {
      throw new Error(data.error || "Der About-Text konnte nicht geladen werden.");
    }

    renderAboutText(data.text);

    if (updateArt) {
      renderAboutArt(Array.isArray(data.art) && data.art.length ? data.art : fallbackArt);
    }
  } catch (error) {
    console.error("Fehler beim Laden des About-Texts:", error);
    renderAboutText(fallbackText);

    if (updateArt) {
      renderAboutArt(fallbackArt);
    }
  } finally {
    reloadButton.disabled = false;
    delete reloadButton.dataset.loading;
  }
}

reloadButton.addEventListener("click", () => loadAboutText(false));

loadAboutText(true);
