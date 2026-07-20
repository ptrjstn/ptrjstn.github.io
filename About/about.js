const aboutText = document.querySelector("[data-about-text]");
const aboutPortrait = document.querySelector("[data-about-portrait]");
const generatedImage = document.querySelector("[data-about-generated-image]");
const imageStatus = document.querySelector("[data-about-image-status]");
const reloadButton = document.querySelector("[data-about-reload]");
const fallbackText = "Peter ist Copywriter und Konzeptioner aus Tübingen. Er interessiert sich für KI, Text, Sprache, Kunst und Musik. In seiner Freizeit erfindet er Spiele und Kinderbücher und arbeitet an KI-Projekten wie dieser Website.";

function requestId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function renderAboutText(text) {
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  aboutText.replaceChildren(paragraph);
  aboutText.dataset.state = "loaded";
}

async function loadAboutText() {
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
  }
}

async function loadAboutImage() {
  try {
    const response = await fetch(
      `https://ptrjstn-github-io.vercel.app/api/about-image?request=${requestId()}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error("Die KI-Interpretation konnte nicht geladen werden.");
    }

    const imageBlob = await response.blob();
    const imageUrl = URL.createObjectURL(imageBlob);
    generatedImage.src = imageUrl;
    await generatedImage.decode();
    aboutPortrait.dataset.state = "ready";
    imageStatus.textContent = "Original und KI-Interpretation im Wechsel.";
  } catch (error) {
    console.error("Fehler beim Laden der KI-Interpretation:", error);
    aboutPortrait.dataset.state = "fallback";
    imageStatus.textContent = "Originalporträt";
  }
}

reloadButton.addEventListener("click", () => window.location.reload());

loadAboutText();
loadAboutImage();
