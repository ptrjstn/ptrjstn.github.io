import { getGameStats, logGameGuess, logGameResult } from "./lib/supabase.js";

const ALLOWED_ORIGINS = new Set(["https://ptrjstn.de", "https://www.ptrjstn.de"]);
const START_DATE = "2026-07-20";
const REVISION = "5";
const OPENAI_MODEL = "text-embedding-3-small";
const OPENAI_URL = "https://api.openai.com/v1/embeddings";
const THESAURUS_URL = "https://www.openthesaurus.de/synonyme/search";
const MAX_NEIGHBOR_RANK = 15;

// Jeder Tagesdatensatz enthält einen garantierten Pfad. Die vier weiteren Begriffe
// je Station sind bewusst kuratiert und werden zusätzlich über Embeddings geprüft.
export const puzzles = [
  { start: "Kartoffel", goal: "Saturn", path: ["Kartoffel", "Erde", "Planet", "Saturn"], neighbors: [["Erde", "Knolle", "Acker", "Pommes", "Gemüse"], ["Planet", "Boden", "Welt", "Garten", "Lehm"], ["Saturn", "Sonne", "Mond", "Weltraum", "Umlaufbahn"]] },
  { start: "Kaffee", goal: "Mond", path: ["Kaffee", "Bohne", "Pflanze", "Erde", "Mond"], neighbors: [["Bohne", "Tasse", "Morgen", "Aroma", "Mühle"], ["Pflanze", "Hülse", "Ernte", "Samen", "Wurzel"], ["Erde", "Blatt", "Garten", "Natur", "Boden"], ["Mond", "Nacht", "Krater", "Sonne", "Himmel"]] },
  { start: "Schlüssel", goal: "Meer", path: ["Schlüssel", "Tür", "Haus", "Hafen", "Meer"], neighbors: [["Tür", "Schloss", "Metall", "Bund", "Zugang"], ["Haus", "Zimmer", "Dach", "Familie", "Wohnung"], ["Hafen", "Stadt", "Schiff", "Küste", "Handel"], ["Meer", "Wasser", "Strand", "Welle", "Ozean"]] },
  { start: "Buch", goal: "Wald", path: ["Buch", "Papier", "Baum", "Wald"], neighbors: [["Papier", "Seite", "Text", "Druck", "Brief"], ["Baum", "Holz", "Blatt", "Ast", "Wurzel"], ["Wald", "Forst", "Natur", "Moos", "Lichtung"]] },
];
const cache = new Map();

export function normalize(value) { return value.trim().normalize("NFC").toLocaleLowerCase("de-DE"); }
export function berlinDate(now = new Date()) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(now); }
export function dayDifference(date) { const [y, m, d] = date.split("-").map(Number); const [sy, sm, sd] = START_DATE.split("-").map(Number); return Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(sy, sm - 1, sd)) / 86400000); }
export function getPuzzle(now = new Date()) { const date = berlinDate(now); const config = puzzles[Math.max(0, dayDifference(date)) % puzzles.length]; return { id: `${date}-r${REVISION}`, start: config.start, goal: config.goal, path: config.path, neighbors: config.neighbors, dateLabel: new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric" }).format(now) }; }
export function getPuzzleFromId(id, now = new Date()) { return id === getPuzzle(now).id ? getPuzzle(now) : null; }
export function cosineSimilarity(left, right) { if (left.length !== right.length || !left.length) throw new Error("Ungültige Embeddings."); let product = 0, a = 0, b = 0; left.forEach((value, i) => { product += value * right[i]; a += value ** 2; b += right[i] ** 2; }); return product / (Math.sqrt(a) * Math.sqrt(b)); }
function similarityToRank(similarity) { const bounded = Math.max(0.25, Math.min(0.9, similarity)); return Math.max(2, Math.min(1000, Math.round(1000 * Math.exp(-10 * (bounded - 0.25))))); }
function displayWord(word) { return word.charAt(0).toLocaleUpperCase("de-DE") + word.slice(1); }
async function fetchTimed(url, options = {}) { const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 8000); try { return await fetch(url, { ...options, signal: controller.signal }); } finally { clearTimeout(timeout); } }
async function dictionaryWord(word) {
  const key = `dict:${word}`; if (cache.has(key)) return cache.get(key);
  const url = new URL(THESAURUS_URL); url.searchParams.set("q", word); url.searchParams.set("format", "application/json"); url.searchParams.set("baseform", "true");
  const response = await fetchTimed(url, { headers: { "User-Agent": "ptrjstn-wortpfad/1.0" } }); if (!response.ok) throw new Error("Wörterbuch nicht verfügbar");
  const data = await response.json(); const exact = data.synsets?.some((set) => set.terms?.some((entry) => normalize(entry.term || "") === word)); const baseform = data.baseforms?.find((item) => /^[a-zäöüß]+$/iu.test(normalize(item))); const value = exact ? word : normalize(baseform || ""); cache.set(key, value || null); return value || null;
}
async function embedding(word) {
  const key = `embedding:${word}`; if (cache.has(key)) return cache.get(key);
  const response = await fetchTimed(OPENAI_URL, { method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: OPENAI_MODEL, input: [`Deutsches Wort: ${word}`], encoding_format: "float" }) }); if (!response.ok) throw new Error("Embedding nicht verfügbar");
  const vector = (await response.json()).data?.[0]?.embedding; if (!Array.isArray(vector)) throw new Error("Ungültiges Embedding"); cache.set(key, vector); return vector;
}
async function embeddingNeighbor(current, guess) { const [currentVector, guessVector] = await Promise.all([embedding(current), embedding(guess)]); return similarityToRank(cosineSimilarity(currentVector, guessVector)) <= MAX_NEIGHBOR_RANK; }
function nodeFor(puzzle, current) { const index = puzzle.path.findIndex((word) => normalize(word) === normalize(current)); return index >= 0 && index < puzzle.path.length - 1 ? { index, neighbors: puzzle.neighbors[index] } : null; }
function setHeaders(request, response) { const origin = request.headers.origin; if (ALLOWED_ORIGINS.has(origin)) response.setHeader("Access-Control-Allow-Origin", origin); response.setHeader("Vary", "Origin"); response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS"); response.setHeader("Access-Control-Allow-Headers", "Content-Type"); response.setHeader("Cache-Control", "no-store"); return origin; }

export default async function handler(request, response) {
  const origin = setHeaders(request, response); if (request.method === "OPTIONS") return response.status(204).end(); if (origin && !ALLOWED_ORIGINS.has(origin)) return response.status(403).json({ error: "Nicht erlaubt." });
  const puzzle = getPuzzle();
  if (request.method === "GET") return response.status(200).json({ id: puzzle.id, start: puzzle.start, goal: puzzle.goal, neighbors: Array.from({ length: 5 }, () => null), dateLabel: puzzle.dateLabel });
  if (request.method !== "POST") return response.status(405).json({ error: "Methode nicht erlaubt." });
  const body = request.body || {}; const puzzleId = typeof body.puzzleId === "string" ? body.puzzleId : ""; const current = normalize(body.current || ""); const raw = typeof body.guess === "string" ? body.guess : ""; const guess = normalize(raw); const attemptNumber = Number.isSafeInteger(body.attemptNumber) ? body.attemptNumber : 1; const durationSeconds = Number.isSafeInteger(body.durationSeconds) ? Math.max(0, Math.min(body.durationSeconds, 86400)) : 0;
  if (!getPuzzleFromId(puzzleId)) return response.status(409).json({ error: "Dieses Rätsel ist nicht mehr aktuell." });
  const node = nodeFor(puzzle, current); if (!node || !/^[a-zäöüß]+$/iu.test(guess) || guess.length > 40) return response.status(422).json({ error: "Nicht dabei" });
  const candidate = node.neighbors.find((word) => normalize(word) === guess);
  if (!candidate) { await logGameGuess({ puzzle_id: puzzleId, target_word: puzzle.goal, attempt_number: attemptNumber, guess: raw.trim(), normalized_guess: guess, dictionary_word: null, status: "rejected", rank: null, solved: false }); return response.status(422).json({ error: "Nicht dabei" }); }
  if (!process.env.OPENAI_API_KEY) return response.status(500).json({ error: "Die Wortprüfung ist momentan nicht verfügbar." });
  try {
    const dictionary = await dictionaryWord(guess); if (!dictionary || !(await embeddingNeighbor(current, dictionary))) { await logGameGuess({ puzzle_id: puzzleId, target_word: puzzle.goal, attempt_number: attemptNumber, guess: raw.trim(), normalized_guess: guess, dictionary_word: dictionary, status: "rejected", rank: null, solved: false }); return response.status(422).json({ error: "Nicht dabei" }); }
    const solved = normalize(candidate) === normalize(puzzle.goal); await logGameGuess({ puzzle_id: puzzleId, target_word: puzzle.goal, attempt_number: attemptNumber, guess: raw.trim(), normalized_guess: guess, dictionary_word: dictionary, status: solved ? "solved" : "accepted", rank: null, solved });
    if (solved) { await logGameResult({ puzzle_id: puzzleId, steps: attemptNumber, duration_seconds: durationSeconds }); const stats = await getGameStats(puzzleId, attemptNumber); return response.status(200).json({ word: puzzle.goal, neighbors: [], solved: true, percentile: stats.percentile }); }
    return response.status(200).json({ word: displayWord(candidate), neighbors: puzzle.neighbors[node.index + 1], solved: false });
  } catch { return response.status(502).json({ error: "Die Wortprüfung ist momentan nicht verfügbar." }); }
}
