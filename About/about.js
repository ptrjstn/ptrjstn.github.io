const aboutText = document.querySelector("[data-about-text]");
const reloadButton = document.querySelector("[data-about-reload]");
const fallbackText = "Peter lebt in Tübingen und arbeitet als Copywriter und Konzeptioner. Manchmal baut er kleine Dinge mit KI.";

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

async function loadAboutText() {
  showTextLoader();
  reloadButton.disabled = true;

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
  } catch (error) {
    console.error("Fehler beim Laden des About-Texts:", error);
    renderAboutText(fallbackText);
  } finally {
    reloadButton.disabled = false;
  }
}

reloadButton.addEventListener("click", loadAboutText);

loadAboutText();
