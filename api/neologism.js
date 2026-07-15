const ALLOWED_ORIGIN = "https://ptrjstn.github.io";

export default async function handler(request, response) {
  const origin = request.headers.origin;

  // Erlaubt Aufrufe von deiner GitHub-Pages-Website.
  if (origin === ALLOWED_ORIGIN) {
    response.setHeader("Access-Control-Allow-Origin", origin);
  }

  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  response.setHeader("CDN-Cache-Control", "no-store");
  response.setHeader("Vercel-CDN-Cache-Control", "no-store");

  // Browser senden teilweise zunächst eine OPTIONS-Anfrage.
  if (request.method === "OPTIONS") {
    return response.status(204).end();
  }

  if (request.method !== "GET") {
    return response.status(405).json({
      error: "Nur GET-Anfragen sind erlaubt.",
    });
  }

  if (origin && origin !== ALLOWED_ORIGIN) {
    return response.status(403).json({
      error: "Diese Website darf die Funktion nicht aufrufen.",
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return response.status(500).json({
      error: "Der OpenAI API-Key fehlt.",
    });
  }

  try {
    const openAIResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-5-mini",
          reasoning: { effort: "minimal" },
          max_output_tokens: 120,
          text: {
            format: {
              type: "json_schema",
              name: "neologism",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  word: { type: "string" },
                  wordType: { type: "string" },
                  article: { type: "string" },
                  pronunciation: { type: "string" },
                  definition: { type: "string" },
                },
                required: ["word", "wordType", "article", "pronunciation", "definition"],
                additionalProperties: false,
              },
            },
          },
          input: [
            {
              role: "system",
              content:
                "Du erfindest kurze, glaubwürdige neue deutsche Wörter. Antworte ausschließlich als gültiges JSON ohne Markdown.",
            },
            {
              role: "user",
              content: `
Erfinde ein möglichst kurzes neues deutsches Hauptwort, idealerweise mit höchstens acht Buchstaben.
Schreibe eine präzise Definition mit höchstens zwölf Wörtern.

Gib ausschließlich dieses JSON-Format zurück:

{
  "word": "Das kurze erfundene Wort",
  "wordType": "Substantiv",
  "article": "der, die, das oder leer",
  "pronunciation": "Eine leicht lesbare deutsche Lautschrift ohne eckige Klammern",
  "definition": "Eine sehr kurze Definition mit höchstens zwölf Wörtern."
}
              `.trim(),
            },
          ],
        }),
      }
    );

    if (!openAIResponse.ok) {
      const errorDetails = await openAIResponse.text();
      console.error("OpenAI-Fehler:", errorDetails);

      return response.status(502).json({
        error: "Das neue Wort konnte nicht erzeugt werden.",
      });
    }

    const result = await openAIResponse.json();
    const rawText =
      result.output_text ||
      result.output
        ?.flatMap((item) => item.content || [])
        .find((item) => item.type === "output_text")
        ?.text;

    if (!rawText) {
      console.error("Unerwartete OpenAI-Antwort:", JSON.stringify(result));
      throw new Error("Die OpenAI-Antwort enthält keinen Text.");
    }

    const cleanedText = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const wordData = JSON.parse(cleanedText);

    if (!wordData.word || !wordData.definition) {
      throw new Error("Die Antwort hat nicht das erwartete Format.");
    }

    return response.status(200).json(wordData);
  } catch (error) {
    console.error("Fehler beim Erzeugen des Wortes:", error);

    return response.status(500).json({
      error: "Beim Verarbeiten des neuen Wortes ist ein Fehler aufgetreten.",
    });
  }
}
