const ALLOWED_ORIGIN = "https://ptrjstn.github.io";

export default async function handler(request, response) {
  const origin = request.headers.origin;

  if (origin === ALLOWED_ORIGIN) {
    response.setHeader("Access-Control-Allow-Origin", origin);
  }

  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  response.setHeader("CDN-Cache-Control", "no-store");
  response.setHeader("Vercel-CDN-Cache-Control", "no-store");

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
    const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        reasoning: { effort: "minimal" },
        max_output_tokens: 420,
        text: {
          format: {
            type: "json_schema",
            name: "about_text",
            strict: true,
            schema: {
              type: "object",
              properties: {
                text: { type: "string" },
                art: {
                  type: "array",
                  minItems: 3,
                  maxItems: 6,
                  items: {
                    type: "object",
                    properties: {
                      shape: { type: "string", enum: ["rectangle", "circle", "line"] },
                      x: { type: "integer", minimum: 0, maximum: 85 },
                      y: { type: "integer", minimum: 0, maximum: 90 },
                      width: { type: "integer", minimum: 8, maximum: 70 },
                      height: { type: "integer", minimum: 2, maximum: 30 },
                      rotation: { type: "integer", minimum: -18, maximum: 18 },
                      color: { type: "string", enum: ["cyan", "magenta", "orange", "cream", "black"] },
                    },
                    required: ["shape", "x", "y", "width", "height", "rotation", "color"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["text", "art"],
              additionalProperties: false,
            },
          },
        },
        input: [
          {
            role: "system",
            content: "Du schreibst kurze, präzise und sympathische deutsche Portfolio-Texte. Verwende ausschließlich die angegebenen Fakten. Erfinde keine Ausbildung, Arbeitgeber, Kunden, Auszeichnungen, Charaktereigenschaften oder biografischen Details. Antworte ausschließlich als gültiges JSON ohne Markdown.",
          },
          {
            role: "user",
            content: `
Schreibe bei jedem Aufruf eine neue Variante eines kurzen About-Texts mit zwei bis vier Sätzen und höchstens 65 Wörtern.
Der Ton ist kreativ-professionell, unaufdringlich und sprachlich abwechslungsreich. Schreibe in der dritten Person.

Verlässliche Fakten:
- Name: Peter
- Wohnort: Tübingen
- Beruflicher Schwerpunkt: Copywriter und Konzeptioner
- Interessen: KI, Text, Sprache, Kunst und Musik
- Freizeit: Er erfindet Spiele und Kinderbücher und arbeitet an KI-Projekten wie dieser Website.

Formuliere auch den Freizeit-Fakt bei jedem Aufruf anders, ohne ihn wegzulassen.
Erzeuge außerdem drei bis sechs abstrakte grafische Elemente für eine dezente, wechselnde Glitch-Collage über Teilen eines Hochformat-Porträts. Verteile sie über das Bild, halte die Formen eher klein und verwende unterschiedliche Farben.

Gib ausschließlich JSON mit "text" und dem Array "art" zurück.
            `.trim(),
          },
        ],
      }),
    });

    if (!openAIResponse.ok) {
      const errorDetails = await openAIResponse.text();
      console.error("OpenAI-Fehler:", errorDetails);
      return response.status(502).json({ error: "Der About-Text konnte nicht erzeugt werden." });
    }

    const result = await openAIResponse.json();
    const outputItems = Array.isArray(result.output)
      ? result.output.flatMap((item) => item.content || [])
      : [];
    const outputTextItem = outputItems.find((item) => item.type === "output_text");
    const rawText = result.output_text || (outputTextItem && outputTextItem.text);

    if (!rawText) {
      throw new Error("Die OpenAI-Antwort enthält keinen Text.");
    }

    const cleanedText = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const aboutData = JSON.parse(cleanedText);

    if (
      !aboutData.text ||
      typeof aboutData.text !== "string" ||
      !Array.isArray(aboutData.art)
    ) {
      throw new Error("Die Antwort hat nicht das erwartete Format.");
    }

    return response.status(200).json({
      text: aboutData.text.trim(),
      art: aboutData.art,
    });
  } catch (error) {
    console.error("Fehler beim Erzeugen des About-Texts:", error);
    return response.status(500).json({ error: "Beim Verarbeiten des About-Texts ist ein Fehler aufgetreten." });
  }
}
