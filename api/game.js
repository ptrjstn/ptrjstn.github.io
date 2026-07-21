import { getGameStats, logGameGuess, logGameResult } from "./lib/supabase.js";

const ALLOWED_ORIGINS = new Set(["https://ptrjstn.de", "https://www.ptrjstn.de"]);
const START_DATE = "2026-07-20";
const REVISION = "4";
const MODEL = "text-embedding-3-small";
const OPENAI_URL = "https://api.openai.com/v1/embeddings";
const THESAURUS_URL = "https://www.openthesaurus.de/synonyme/search";
const MAX_NEIGHBOR_RANK = 15;
const pairs = [
  ["Kartoffel", "Saturn"], ["Fenster", "Wüste"], ["Geige", "Gewitter"],
  ["Bibliothek", "Ozean"], ["Schnee", "Laterne"], ["Honig", "Rakete"],
  ["Garten", "Vulkan"],
];
const cache = new Map();

export function normalize(value) { return value.trim().normalize("NFC").toLocaleLowerCase("de-DE"); }
export function berlinDate(now = new Date()) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(now); }
export function dayDifference(date) { const [y, m, d] = date.split("-").map(Number); const [sy, sm, sd] = START_DATE.split("-").map(Number); return Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(sy, sm - 1, sd)) / 86400000); }
export function getPuzzle(now = new Date()) { const date = berlinDate(now); const [start, goal] = pairs[Math.max(0, dayDifference(date)) % pairs.length]; return { id: `${date}-r${REVISION}`, start, goal, dateLabel: new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric" }).format(now) }; }
export function getPuzzleFromId(id, now = new Date()) { return id === getPuzzle(now).id ? getPuzzle(now) : null; }
export function cosineSimilarity(left, right) { if (left.length !== right.length || !left.length) throw new Error("Ungültige Embeddings."); let product = 0, a = 0, b = 0; left.forEach((value, i) => { product += value * right[i]; a += value ** 2; b += right[i] ** 2; }); return product / (Math.sqrt(a) * Math.sqrt(b)); }
function similarityToRank(similarity) { const bounded = Math.max(0.25, Math.min(0.9, similarity)); return Math.max(2, Math.min(1000, Math.round(1000 * Math.exp(-10 * (bounded - 0.25))))); }

async function fetchTimed(url, options = {}) { const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 8000); try { return await fetch(url, { ...options, signal: controller.signal }); } finally { clearTimeout(timeout); } }
async function dictionaryWord(word) {
  if (cache.has(`dict:${word}`)) return cache.get(`dict:${word}`);
  const url = new URL(THESAURUS_URL); url.searchParams.set("q", word); url.searchParams.set("format", "application/json"); url.searchParams.set("baseform", "true");
  const response = await fetchTimed(url, { headers: { "User-Agent": "ptrjstn-wortpfad/1.0" } }); if (!response.ok) throw new Error("Wörterbuch nicht verfügbar");
  const data = await response.json(); const exact = data.synsets?.some((set) => set.terms?.some((entry) => normalize(entry.term || "") === word));
  const value = exact ? word : normalize(data.baseforms?.find((item) => /^[a-zäöüß]+$/iu.test(normalize(item))) || ""); cache.set(`dict:${word}`, value || null); return value || null;
}
async function embedding(word) {
  if (cache.has(`embed:${word}`)) return cache.get(`embed:${word}`);
  const response = await fetchTimed(OPENAI_URL, { method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: MODEL, input: [`Deutsches Wort: ${word}`], encoding_format: "float" }) });
  if (!response.ok) throw new Error("Embedding nicht verfügbar"); const data = await response.json(); const vector = data.data?.[0]?.embedding; if (!Array.isArray(vector)) throw new Error("Ungültiges Embedding"); cache.set(`embed:${word}`, vector); return vector;
}
async function isNeighbor(current, guess) { const [a, b] = await Promise.all([embedding(current), embedding(guess)]); return similarityToRank(cosineSimilarity(a, b)) <= MAX_NEIGHBOR_RANK; }
function headers(request, response) { const origin = request.headers.origin; if (ALLOWED_ORIGINS.has(origin)) response.setHeader("Access-Control-Allow-Origin", origin); response.setHeader("Vary", "Origin"); response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS"); response.setHeader("Access-Control-Allow-Headers", "Content-Type"); response.setHeader("Cache-Control", "no-store"); return origin; }

export default async function handler(request, response) {
  const origin = headers(request, response); if (request.method === "OPTIONS") return response.status(204).end(); if (origin && !ALLOWED_ORIGINS.has(origin)) return response.status(403).json({ error: "Nicht erlaubt." });
  const puzzle = getPuzzle();
  if (request.method === "GET") return response.status(200).json({ id: puzzle.id, start: puzzle.start, goal: puzzle.goal, dateLabel: puzzle.dateLabel });
  if (request.method !== "POST") return response.status(405).json({ error: "Methode nicht erlaubt." });
  const puzzleId = typeof request.body?.puzzleId === "string" ? request.body.puzzleId : ""; const current = normalize(request.body?.current || ""); const raw = typeof request.body?.guess === "string" ? request.body.guess : ""; const guess = normalize(raw); const attemptNumber = request.body?.attemptNumber; const durationSeconds = Number.isSafeInteger(request.body?.durationSeconds) ? request.body.durationSeconds : 0;
  if (!getPuzzleFromId(puzzleId)) return response.status(409).json({ error: "Dieses Rätsel ist nicht mehr aktuell." });
  if (!/^[a-zäöüß]+$/iu.test(guess) || guess.length > 40) return response.status(400).json({ error: "Ungültig" });
  if (guess === current) return response.status(409).json({ error: "Ungültig" });
  if (guess === normalize(puzzle.goal)) { await logGameGuess({ puzzle_id: puzzleId, target_word: puzzle.goal, attempt_number: attemptNumber, guess: raw.trim(), normalized_guess: guess, dictionary_word: guess, status: "solved", rank: null, solved: true }); await logGameResult({ puzzle_id: puzzleId, steps: Number(attemptNumber), duration_seconds: durationSeconds }); const stats = await getGameStats(puzzleId, Number(attemptNumber)); return response.status(200).json({ word: puzzle.goal, solved: true, percentile: stats.percentile }); }
  if (!process.env.OPENAI_API_KEY) return response.status(500).json({ error: "Die Wortprüfung ist momentan nicht verfügbar." });
  try {
    const word = await dictionaryWord(guess); if (!word || !(await isNeighbor(current || puzzle.start, word))) { await logGameGuess({ puzzle_id: puzzleId, target_word: puzzle.goal, attempt_number: attemptNumber, guess: raw.trim(), normalized_guess: guess, dictionary_word: word, status: "rejected", rank: null, solved: false }); return response.status(422).json({ error: "Ungültig" }); }
    await logGameGuess({ puzzle_id: puzzleId, target_word: puzzle.goal, attempt_number: attemptNumber, guess: raw.trim(), normalized_guess: guess, dictionary_word: word, status: "accepted", rank: null, solved: false }); return response.status(200).json({ word: raw.trim().charAt(0).toLocaleUpperCase("de-DE") + raw.trim().slice(1), solved: false });
  } catch { return response.status(502).json({ error: "Die Wortprüfung ist momentan nicht verfügbar." }); }
}
