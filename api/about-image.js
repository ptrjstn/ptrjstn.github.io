const ALLOWED_ORIGIN = "https://ptrjstn.github.io";
const PORTRAIT_URL = "https://ptrjstn.github.io/assets/about/peter.webp";

export const config = {
  maxDuration: 60,
};

function setCorsHeaders(request, response) {
  const origin = request.headers.origin;

  if (origin === ALLOWED_ORIGIN) {
    response.setHeader("Access-Control-Allow-Origin", origin);
  }

  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  response.setHeader("CDN-Cache-Control", "no-store");
  response.setHeader("Vercel-CDN-Cache-Control", "no-store");
}

export default async function handler(request, response) {
  const origin = request.headers.origin;
  setCorsHeaders(request, response);

  if (request.method === "OPTIONS") {
    return response.status(204).end();
  }

  if (request.method !== "GET") {
    return response.status(405).json({ error: "Nur GET-Anfragen sind erlaubt." });
  }

  if (origin && origin !== ALLOWED_ORIGIN) {
    return response.status(403).json({ error: "Diese Website darf die Funktion nicht aufrufen." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return response.status(500).json({ error: "Der OpenAI API-Key fehlt." });
  }

  try {
    const portraitResponse = await fetch(PORTRAIT_URL, { cache: "no-store" });

    if (!portraitResponse.ok) {
      throw new Error(`Das Originalporträt konnte nicht geladen werden: ${portraitResponse.status}`);
    }

    const portraitBlob = await portraitResponse.blob();
    const formData = new FormData();
    formData.append("model", "gpt-image-1");
    formData.append("image", portraitBlob, "peter.webp");
    formData.append(
      "prompt",
      "Interpretiere dieses Porträt als experimentelles Editorial-Kunstwerk neu. Erhalte Identität, Person, Pose, Gesicht, Brille, Kleidung, Hochformat und vollständigen Bildausschnitt klar erkennbar. Verändere nur die visuelle Ästhetik mit subtilen analogen Scanlines, digitalem Glitch, Druckfehlern und zeitgenössischer KI-Kunst. Keine Schrift, keine Logos, keine zusätzlichen Personen, kein Beschnitt."
    );
    formData.append("size", "1024x1536");
    formData.append("quality", "low");
    formData.append("output_format", "webp");

    const openAIResponse = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!openAIResponse.ok) {
      const errorDetails = await openAIResponse.text();
      console.error("OpenAI-Bildfehler:", errorDetails);
      return response.status(502).json({ error: "Die KI-Interpretation konnte nicht erzeugt werden." });
    }

    const result = await openAIResponse.json();
    const imageData = result.data && result.data[0] && result.data[0].b64_json;

    if (!imageData) {
      throw new Error("Die OpenAI-Antwort enthält kein Bild.");
    }

    const imageBuffer = Buffer.from(imageData, "base64");
    response.setHeader("Content-Type", "image/webp");
    response.setHeader("Content-Length", String(imageBuffer.length));
    return response.status(200).send(imageBuffer);
  } catch (error) {
    console.error("Fehler beim Erzeugen der KI-Interpretation:", error);
    return response.status(500).json({ error: "Beim Verarbeiten der KI-Interpretation ist ein Fehler aufgetreten." });
  }
}
