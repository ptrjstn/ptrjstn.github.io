import test from "node:test";
import assert from "node:assert/strict";
import handler, { berlinDate, cosineSimilarity, dayDifference, getPuzzle, getPuzzleFromId, normalize } from "../api/game.js";

test("normalisiert deutsche Wörter", () => {
  assert.equal(normalize("  KARTOFFEL  "), "kartoffel");
});

test("berechnet Berliner Kalendertag und Tagesabstand", () => {
  assert.equal(berlinDate(new Date("2026-07-20T22:30:00Z")), "2026-07-21");
  assert.equal(dayDifference("2026-07-21"), 1);
});

test("liefert ein deterministisches Tagespaar", () => {
  const puzzle = getPuzzle(new Date("2026-07-20T12:00:00Z"));
  assert.deepEqual(puzzle, {
    id: "2026-07-20-r4",
    start: "Kartoffel",
    goal: "Saturn",
    dateLabel: "20.07.2026",
  });
  assert.equal(getPuzzleFromId(puzzle.id, new Date("2026-07-20T12:00:00Z")).goal, "Saturn");
  assert.equal(getPuzzleFromId(puzzle.id, new Date("2026-07-21T12:00:00Z")), null);
});

test("berechnet Kosinusähnlichkeit", () => {
  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
  assert.throws(() => cosineSimilarity([1], [1, 2]));
});

function responseMock() {
  return {
    headers: {}, statusCode: null, body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { return this; },
  };
}

test("liefert Start und Ziel ohne geheime Lösung", async () => {
  const response = responseMock();
  await handler({ method: "GET", headers: {} }, response);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(Object.keys(response.body).sort(), ["dateLabel", "goal", "id", "start"]);
  assert.ok(response.body.start && response.body.goal);
});

test("akzeptiert das Ziel ohne Rankingdaten zurückzugeben", async () => {
  const puzzle = getPuzzle();
  const response = responseMock();
  await handler({
    method: "POST", headers: {}, body: {
      puzzleId: puzzle.id, current: puzzle.start, guess: puzzle.goal,
      attemptNumber: 1, durationSeconds: 12,
    },
  }, response);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { word: puzzle.goal, solved: true, percentile: 50 });
});
