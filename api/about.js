const ALLOWED_ORIGINS = new Set([
  "https://ptrjstn.de",
  "https://www.ptrjstn.de",
]);

export default async function handler(request, response) {
  const origin = request.headers.origin;

  if (ALLOWED_ORIGINS.has(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
  }

  response.setHeader("Vary", "Origin");
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

  if (origin && !ALLOWED_ORIGINS.has(origin)) {
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
        max_output_tokens: 180,
        text: {
          format: {
            type: "json_schema",
            name: "about_text",
            strict: true,
            schema: {
              type: "object",
              properties: {
                text: { type: "string" },
              },
              required: ["text"],
              additionalProperties: false,
            },
          },
        },
        input: [
          {
            role: "system",
            content: `
              Du schreibst sehr kurze deutsche About-Texte für eine persönliche Website.

              Der Stil ist einfach, trocken und leicht verspielt. Der Text darf ein bisschen
              wie die Beschreibung einer Kinderbuchfigur klingen, aber nicht albern oder
              künstlich niedlich.

              Verwende nur die angegebenen Fakten. Erfinde keine Arbeitgeber, Kunden,
              Ausbildungen, Erfolge, Charaktereigenschaften oder biografischen Details.

              Vermeide Werbe- und Portfolio-Sprache. Verwende insbesondere keine Formulierungen
              wie „an der Schnittstelle von“, „mit Leidenschaft“, „kreativer Kopf“,
              „verbindet X mit Y“, „sein Herz schlägt für“, „Vision“, „innovativ“ oder
              „maßgeschneidert“.

              Antworte ausschließlich im vorgegebenen JSON-Format.
            `.trim(),
          },
          {
            role: "user",
            content: `
              Schreibe eine neue Variante eines kurzen About-Texts über Peter.

              Regeln:
              - Schreibe in der dritten Person.
              - Schreibe zwei bis vier kurze Sätze.
              - Verwende höchstens 55 Wörter.
              - Beginne nicht jedes Mal mit seinem Beruf.
              - Verwende einfache, alltägliche Wörter.
              - Der Text soll unprätentiös, freundlich und ein wenig kindlich wirken.
              - Stelle nicht zwingend alle Fakten in jeder Variante unter.
              - Formuliere konkret: Was macht Peter, womit beschäftigt er sich?
              - Keine Bewertung seiner Persönlichkeit, Arbeit oder Wirkung.
              - Keine Überschrift und kein Markdown.

              Fakten:
              - Peter lebt in Tübingen.
              - Er arbeitet als Copywriter und Konzeptioner.
              - Er interessiert sich für Technik, Kultur und Medien.
              - Er denkt sich Spiele aus.
              - Er schreibt Kinderbücher.
              - Er baut eigene kleine Projekte mit KI.

              Tonbeispiele:
              - „Peter lebt in Tübingen und denkt sich gern Dinge aus.“
              - „Manchmal sind es Kampagnen. Manchmal Spiele.“
              - „Ab und zu bringt er Computern neue Tricks bei.“

              Die Beispiele zeigen nur den Ton. Kopiere sie nicht vollständig.

              Gib ausschließlich ein JSON-Objekt mit dem Feld "text" zurück.
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
      typeof aboutData.text !== "string"
    ) {
      throw new Error("Die Antwort hat nicht das erwartete Format.");
    }

    return response.status(200).json({ text: aboutData.text.trim() });
  } catch (error) {
    console.error("Fehler beim Erzeugen des About-Texts:", error);
    return response.status(500).json({ error: "Beim Verarbeiten des About-Texts ist ein Fehler aufgetreten." });
  }
}
