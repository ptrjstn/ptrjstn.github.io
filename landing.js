const neologismWord = document.querySelector("[data-neologism-word]");

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

    neologismWord.textContent = data.word;
    neologismWord.dataset.state = "loaded";
  } catch (error) {
    neologismWord.textContent = error.message || "Der Neologismus konnte nicht geladen werden.";
    neologismWord.dataset.state = "error";
  }
}

loadNeologism();
