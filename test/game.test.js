import test from "node:test";
import assert from "node:assert/strict";
import handler, { berlinDate, cosineSimilarity, dayDifference, getPuzzle, getPuzzleFromId, normalize, similarityToRank } from "../api/game.js";

test("normalisiert deutsche Wörter und sichere Leerwerte", () => {
  assert.equal(normalize("  KARTOFFEL  "), "kartoffel");
  assert.equal(normalize(null), "");
});

test("berechnet Berliner Kalendertag und Tagesabstand", () => {
  assert.equal(berlinDate(new Date("2026-07-20T22:30:00Z")), "2026-07-21");
  assert.equal(dayDifference("2026-07-21"), 1);
});

test("liefert ein stabiles tägliches Start-Ziel-Paar", () => {
  const puzzle = getPuzzle(new Date("2026-07-20T12:00:00Z"));
  assert.deepEqual(puzzle, { id: "2026-07-20-r6-g0", round: 0, start: "Kartoffel", goal: "Saturn", dateLabel: "20.07.2026" });
  assert.equal(getPuzzleFromId(puzzle.id, new Date("2026-07-20T12:00:00Z")).goal, "Saturn");
  assert.equal(getPuzzleFromId(puzzle.id, new Date("2026-07-21T12:00:00Z")), null);
});

test("bildet Ähnlichkeit intern monoton auf die Top-15-Schwelle ab", () => {
  assert.equal(similarityToRank(1), 2);
  assert.ok(similarityToRank(0.8) < similarityToRank(0.6));
});

test("berechnet Kosinusähnlichkeit", () => {
  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
  assert.throws(() => cosineSimilarity([1], [1, 2]));
});

function responseMock() { return { headers: {}, statusCode: null, body: null, setHeader(name, value) { this.headers[name] = value; }, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; }, end() { return this; } }; }

test("liefert nur Tagesmetadaten ohne Rankings", async () => {
  const response = responseMock(); await handler({ method: "GET", headers: {} }, response);
  assert.equal(response.statusCode, 200); assert.deepEqual(Object.keys(response.body).sort(), ["dateLabel", "goal", "id", "round", "start"]); assert.equal(response.body.rank, undefined);
});
