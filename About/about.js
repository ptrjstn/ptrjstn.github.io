const aboutText = document.querySelector("[data-about-text]");
const fallbackText = "Peter ist Copywriter und Konzeptioner aus Tübingen. Er beschäftigt sich mit KI, Text und Sprache – und interessiert sich außerdem für Kunst und Musik.";

function renderAboutText(text) {
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  aboutText.replaceChildren(paragraph);
  aboutText.dataset.state = "loaded";
}

async function loadAboutText() {
  try {
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const response = await fetch(
      `https://ptrjstn-github-io.vercel.app/api/about?request=${requestId}`,
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
  }
}

loadAboutText();
