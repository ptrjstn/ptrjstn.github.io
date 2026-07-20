import test from "node:test";
import assert from "node:assert/strict";

import {
  default as handler,
  berlinDate,
  cosineSimilarity,
  dayDifference,
  getPuzzle,
  getPuzzleFromId,
  hintForRank,
  normalize,
  similarityToRank,
} from "../api/game.js";

test("normalisiert deutsche Wörter", () => {
  assert.equal(normalize("  SCHLÜSSELLOCH  "), "schlüsselloch");
});

test("berechnet den Berliner Kalendertag auch an einer UTC-Grenze", () => {
  assert.equal(berlinDate(new Date("2026-07-20T22:30:00Z")), "2026-07-21");
  assert.equal(dayDifference("2026-07-21"), 1);
});

test("rotiert die Tageswörter deterministisch", () => {
  assert.deepEqual(getPuzzle(new Date("2026-07-20T12:00:00Z")), {
    id: "2026-07-20-r3-g0",
    target: "Sternwarte",
  });
  assert.equal(getPuzzle(new Date("2026-07-27T12:00:00Z")).target, "Sternwarte");
});

test("löst fortlaufende Spiel-IDs nur am aktuellen Tag auf", () => {
  const now = new Date("2026-07-20T12:00:00Z");
  assert.equal(getPuzzle(now, 1).target, "Gewitter");
  assert.equal(getPuzzleFromId("2026-07-20-r3-g1", now).target, "Gewitter");
  assert.equal(getPuzzleFromId("2026-07-19-r3-g1", now), null);
});

test("berechnet Kosinusähnlichkeit", () => {
  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
  assert.throws(() => cosineSimilarity([1], [1, 2]));
});

test("bildet Ähnlichkeit monoton auf Ränge von 2 bis 1000 ab", () => {
  assert.equal(similarityToRank(0), 1000);
  assert.equal(similarityToRank(1), 2);
  assert.ok(similarityToRank(0.7) < similarityToRank(0.5));
});

test("liefert konkrete Hinweise für unterschiedliche Rangbereiche", () => {
  assert.match(hintForRank(4), /engsten Bedeutungsfeld/);
  assert.match(hintForRank(150), /präziseren/);
  assert.match(hintForRank(900), /anderen Themenfeld/);
});

function mockResponse() {
  return {
    headers: {},
    statusCode: null,
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    end() {
      return this;
    },
  };
}

test("liefert Puzzle-Metadaten ohne das Lösungswort", async () => {
  const response = mockResponse();
  await handler({ method: "GET", headers: {} }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(Object.keys(response.body), ["id"]);
});

test("erlaubt die neue Website-Domain per CORS", async () => {
  const response = mockResponse();
  await handler({
    method: "GET",
    headers: { origin: "https://ptrjstn.de" },
  }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["Access-Control-Allow-Origin"], "https://ptrjstn.de");
});

test("liefert nach einem abgeschlossenen Spiel die nächste Runde", async () => {
  const current = getPuzzle();
  const response = mockResponse();
  await handler({
    method: "GET",
    headers: {},
    query: { after: current.id },
  }, response);

  assert.equal(response.statusCode, 200);
  assert.notEqual(response.body.id, current.id);
  assert.equal(getPuzzleFromId(response.body.id).target, getPuzzle(new Date(), dayDifference(berlinDate()) + 1).target);
});

test("validiert über OpenThesaurus und nutzt text-embedding-3-small", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  const requests = [];
  const guess = getPuzzle().target === "Bibliothek" ? "Gewitter" : "Bibliothek";
  process.env.OPENAI_API_KEY = "test-key";
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    if (String(url).startsWith("https://www.openthesaurus.de/")) {
      return new Response(JSON.stringify({
        synsets: [{ terms: [{ term: guess }] }],
      }), { status: 200 });
    }
    return new Response(JSON.stringify({
      data: [
        { index: 0, embedding: [1, 0] },
        { index: 1, embedding: [0.8, 0.6] },
      ],
    }), { status: 200 });
  };

  try {
    const response = mockResponse();
    await handler({
      method: "POST",
      headers: {},
      body: { puzzleId: getPuzzle().id, guess },
    }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.word, guess);
    assert.equal(response.body.rank, 4);
    assert.match(response.body.hint, /engsten Bedeutungsfeld/);
    assert.equal(requests.length, 2);
    const embeddingBody = JSON.parse(requests[1].options.body);
    assert.equal(embeddingBody.model, "text-embedding-3-small");
    assert.equal(embeddingBody.input.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});
