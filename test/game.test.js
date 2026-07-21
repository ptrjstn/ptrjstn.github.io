import test from "node:test";
import assert from "node:assert/strict";
import handler, { berlinDate, cosineSimilarity, dayDifference, getPuzzle, getPuzzleFromId, normalize, puzzles } from "../api/game.js";

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
    id: "2026-07-20-r5",
    start: "Kartoffel",
    goal: "Saturn",
    path: ["Kartoffel", "Erde", "Planet", "Saturn"],
    neighbors: [["Erde", "Knolle", "Acker", "Pommes", "Gemüse"], ["Planet", "Boden", "Welt", "Garten", "Lehm"], ["Saturn", "Sonne", "Mond", "Weltraum", "Umlaufbahn"]],
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

test("liefert Start, Ziel und genau fünf verdeckte Kandidaten", async () => {
  const response = responseMock();
  await handler({ method: "GET", headers: {} }, response);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(Object.keys(response.body).sort(), ["dateLabel", "goal", "id", "neighbors", "start"]);
  assert.equal(response.body.neighbors.length, 5);
  assert.ok(response.body.neighbors.every((word) => word === null));
});

test("jeder vorbereitete Tagespfad ist vollständig und das Ziel kommt nicht zu früh", () => {
  puzzles.forEach((puzzle) => {
    assert.equal(puzzle.path[0], puzzle.start);
    assert.equal(puzzle.path.at(-1), puzzle.goal);
    assert.ok(puzzle.path.length >= 4);
    puzzle.neighbors.forEach((neighbors, index) => {
      assert.equal(neighbors.length, 5);
      assert.equal(neighbors[0], puzzle.path[index + 1]);
      assert.ok(!neighbors.slice(1).some((word) => normalize(word) === normalize(puzzle.goal)));
      assert.equal(new Set(neighbors.map(normalize)).size, 5);
    });
  });
});
