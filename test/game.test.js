import test from "node:test";
import assert from "node:assert/strict";

import aboutHandler from "../api/about.js";
import neologismHandler from "../api/neologism.js";
import { logGameGuess } from "../api/lib/supabase.js";
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

test("behandelt fehlgeschlagenes Supabase-Logging als nicht kritisch", async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.SUPABASE_URL;
  const originalSecret = process.env.SUPABASE_SECRET_KEY;
  const originalConsoleError = console.error;
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
  globalThis.fetch = async () => new Response("Tabelle fehlt", { status: 404 });
  console.error = () => {};

  try {
    const logged = await logGameGuess({
      puzzle_id: "2026-07-20-r3-g0",
      target_word: "Sternwarte",
      attempt_number: 1,
      guess: "Test",
      normalized_guess: "test",
      dictionary_word: null,
      status: "not_in_dictionary",
      rank: null,
      solved: false,
    });

    assert.equal(logged, false);
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
    if (originalUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalUrl;
    if (originalSecret === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = originalSecret;
  }
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

test("stellt eine angeforderte aktive Runde wieder her", async () => {
  const activePuzzle = getPuzzle(new Date(), 3);
  const response = mockResponse();
  await handler({
    method: "GET",
    headers: {},
    query: { puzzleId: activePuzzle.id },
  }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.id, activePuzzle.id);
});

test("liefert und protokolliert die Lösung beim Aufgeben", async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.SUPABASE_URL;
  const originalSecret = process.env.SUPABASE_SECRET_KEY;
  let logBody = null;
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).startsWith("https://example.supabase.co/")) {
      logBody = JSON.parse(options.body);
      return new Response(null, { status: 201 });
    }
    throw new Error(`Unerwartete Anfrage: ${url}`);
  };

  try {
    const puzzle = getPuzzle();
    const response = mockResponse();
    await handler({
      method: "POST",
      headers: {},
      body: { action: "give_up", puzzleId: puzzle.id, attemptNumber: 2 },
    }, response);

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, { word: puzzle.target, gaveUp: true });
    assert.equal(logBody.status, "gave_up");
    assert.equal(logBody.target_word, puzzle.target);
    assert.equal(logBody.attempt_number, 2);
    assert.equal(logBody.guess, null);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalUrl;
    if (originalSecret === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = originalSecret;
  }
});

test("protokolliert abgelehnte Wiederholungen und Formatfehler", async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.SUPABASE_URL;
  const originalSecret = process.env.SUPABASE_SECRET_KEY;
  const logBodies = [];
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).startsWith("https://example.supabase.co/")) {
      logBodies.push(JSON.parse(options.body));
      return new Response(null, { status: 201 });
    }
    throw new Error(`Unerwartete Anfrage: ${url}`);
  };

  try {
    const duplicateResponse = mockResponse();
    await handler({
      method: "POST",
      headers: {},
      body: {
        puzzleId: getPuzzle().id,
        guess: "Bibliothek",
        attemptNumber: 4,
        duplicate: true,
      },
    }, duplicateResponse);

    const invalidResponse = mockResponse();
    await handler({
      method: "POST",
      headers: {},
      body: {
        puzzleId: getPuzzle().id,
        guess: "zwei Wörter",
        attemptNumber: 5,
      },
    }, invalidResponse);

    assert.equal(duplicateResponse.statusCode, 409);
    assert.equal(invalidResponse.statusCode, 400);
    assert.deepEqual(logBodies.map((body) => body.status), ["duplicate", "invalid_format"]);
    assert.deepEqual(logBodies.map((body) => body.attempt_number), [4, 5]);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalUrl;
    if (originalSecret === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = originalSecret;
  }
});

test("erlaubt alle neuen Website-Origins per CORS", async () => {
  const origins = [
    "https://ptrjstn.de",
    "https://www.ptrjstn.de",
  ];

  for (const origin of origins) {
    const response = mockResponse();
    await handler({ method: "GET", headers: { origin } }, response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["Access-Control-Allow-Origin"], origin);
    assert.equal(response.headers.Vary, "Origin");
  }
});

test("erlaubt mobile Origins für alle API-Anwendungen", async () => {
  for (const apiHandler of [aboutHandler, neologismHandler]) {
    for (const origin of ["https://ptrjstn.de", "https://www.ptrjstn.de"]) {
      const response = mockResponse();
      await apiHandler({ method: "OPTIONS", headers: { origin } }, response);
      assert.equal(response.statusCode, 204);
      assert.equal(response.headers["Access-Control-Allow-Origin"], origin);
      assert.equal(response.headers.Vary, "Origin");
    }
  }
});

test("weist unsichere HTTP-Origins nach der HTTPS-Aktivierung ab", async () => {
  const response = mockResponse();
  await handler({
    method: "GET",
    headers: { origin: "http://ptrjstn.de" },
  }, response);

  assert.equal(response.statusCode, 403);
  assert.equal(response.headers["Access-Control-Allow-Origin"], undefined);
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
  const originalSupabaseUrl = process.env.SUPABASE_URL;
  const originalSupabaseSecret = process.env.SUPABASE_SECRET_KEY;
  const requests = [];
  const guess = getPuzzle().target === "Bibliothek" ? "Gewitter" : "Bibliothek";
  process.env.OPENAI_API_KEY = "test-key";
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    if (String(url).startsWith("https://www.openthesaurus.de/")) {
      return new Response(JSON.stringify({
        synsets: [{ terms: [{ term: guess }] }],
      }), { status: 200 });
    }
    if (String(url).startsWith("https://example.supabase.co/")) {
      return new Response(null, { status: 201 });
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
      body: { puzzleId: getPuzzle().id, guess, attemptNumber: 3 },
    }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.word, guess);
    assert.equal(response.body.rank, 4);
    assert.match(response.body.hint, /engsten Bedeutungsfeld/);
    assert.equal(requests.length, 3);
    const embeddingBody = JSON.parse(requests[1].options.body);
    assert.equal(embeddingBody.model, "text-embedding-3-small");
    assert.equal(embeddingBody.input.length, 2);
    const logRequest = requests[2];
    const logBody = JSON.parse(logRequest.options.body);
    assert.equal(logRequest.url, "https://example.supabase.co/rest/v1/game_guesses");
    assert.equal(logRequest.options.headers.apikey, "sb_secret_test");
    assert.equal(logRequest.options.headers.Authorization, undefined);
    assert.equal(logBody.guess, guess);
    assert.equal(logBody.target_word, getPuzzle().target);
    assert.equal(logBody.attempt_number, 3);
    assert.equal(logBody.status, "accepted");
    assert.equal(logBody.rank, 4);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
    if (originalSupabaseUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalSupabaseUrl;
    if (originalSupabaseSecret === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = originalSupabaseSecret;
  }
});
