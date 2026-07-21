import { findWordEmbeddings, getGameStats, logGameGuess, logGameResult } from "./lib/supabase.js";

const ALLOWED_ORIGINS = new Set(["https://ptrjstn.de", "https://www.ptrjstn.de"]);
const START_DATE = "2026-07-20";
const REVISION = "6";
const OPENAI_MODEL = "text-embedding-3-small";
const OPENAI_URL = "https://api.openai.com/v1/embeddings";
const THESAURUS_URL = "https://www.openthesaurus.de/synonyme/search";
const MAX_ASSOCIATION_RANK = 25;
export const puzzles = [
  ["Kartoffel", "Saturn"], ["Kaffee", "Mond"], ["Schlüssel", "Meer"],
  ["Buch", "Wald"], ["Fenster", "Wüste"], ["Geige", "Gewitter"],
  ["Schnee", "Laterne"],
];
const cache = new Map();
const associationCache = new Map();

export function normalize(value) { return String(value || "").trim().normalize("NFC").toLocaleLowerCase("de-DE"); }
export function berlinDate(now = new Date()) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(now); }
export function dayDifference(date) { const [y, m, d] = date.split("-").map(Number); const [sy, sm, sd] = START_DATE.split("-").map(Number); return Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(sy, sm - 1, sd)) / 86400000); }
export function getPuzzle(now = new Date(), requestedRound) { const date = berlinDate(now); const round = Number.isSafeInteger(requestedRound) && requestedRound >= 0 ? requestedRound : Math.max(0, dayDifference(date)); const pair = puzzles[round % puzzles.length]; return { id: `${date}-r${REVISION}-g${round}`, round, start: pair[0], goal: pair[1], dateLabel: new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric" }).format(now) }; }
export function getPuzzleFromId(id, now = new Date()) { const match = /^(\d{4}-\d{2}-\d{2})-r6-g(\d+)$/.exec(id); if (!match || match[1] !== berlinDate(now)) return null; const round = Number(match[2]); return Number.isSafeInteger(round) ? getPuzzle(now, round) : null; }
export function cosineSimilarity(left, right) { if (left.length !== right.length || !left.length) throw new Error("Ungültige Embeddings."); let product = 0, a = 0, b = 0; left.forEach((value, i) => { product += value * right[i]; a += value ** 2; b += right[i] ** 2; }); return product / (Math.sqrt(a) * Math.sqrt(b)); }
export function similarityToRank(similarity) { const bounded = Math.max(0.25, Math.min(0.9, similarity)); return Math.max(2, Math.min(1000, Math.round(1000 * Math.exp(-10 * (bounded - 0.25))))); }
async function fetchTimed(url, options = {}) { const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 8000); try { return await fetch(url, { ...options, signal: controller.signal }); } finally { clearTimeout(timeout); } }
async function dictionaryWord(word) { const key = `dict:${word}`; if (cache.has(key)) return cache.get(key); const url = new URL(THESAURUS_URL); url.searchParams.set("q", word); url.searchParams.set("format", "application/json"); url.searchParams.set("baseform", "true"); const response = await fetchTimed(url, { headers: { "User-Agent": "ptrjstn-wortpfad/1.0" } }); if (!response.ok) throw new Error("Wörterbuch nicht verfügbar"); const data = await response.json(); const exact = data.synsets?.some((set) => set.terms?.some((entry) => normalize(entry.term) === word)); const baseform = data.baseforms?.find((item) => /^[a-zäöüß]+$/iu.test(normalize(item))); const value = exact ? word : normalize(baseform); cache.set(key, value || null); return value || null; }
async function allowedAssociations(current) {
  if (associationCache.has(current)) return associationCache.get(current);
  if (process.env.SUPABASE_URL && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    const indexed = await findWordEmbeddings(await embedding(current), MAX_ASSOCIATION_RANK);
    if (Array.isArray(indexed) && indexed.length) {
      const result = indexed.filter((item) => normalize(item.word) !== normalize(current)).slice(0, MAX_ASSOCIATION_RANK).map((item) => ({ word: item.word, similarity: item.similarity }));
      associationCache.set(current, result); return result;
    }
  }
  const url = new URL(THESAURUS_URL); url.searchParams.set("q", current); url.searchParams.set("format", "application/json");
  const response = await fetchTimed(url, { headers: { "User-Agent": "ptrjstn-wortpfad/1.0" } }); if (!response.ok) return [];
  const data = await response.json(); const candidates = [...new Set((data.synsets || []).flatMap((set) => (set.terms || []).map((entry) => normalize(entry.term)).filter((word) => /^[a-zäöüß]+$/iu.test(word) && word !== normalize(current))))].slice(0, 20); const ranked = await Promise.all(candidates.map(async (word) => ({ word, rank: await neighborRank(current, word) }))); const result = ranked.filter((item) => item.rank <= MAX_ASSOCIATION_RANK).slice(0, MAX_ASSOCIATION_RANK).map((item) => item.word); associationCache.set(current, result); return result;
}
async function embedding(word) { const key = `embedding:${word}`; if (cache.has(key)) return cache.get(key); const response = await fetchTimed(OPENAI_URL, { method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: OPENAI_MODEL, input: [`Deutsches Wort: ${word}`], encoding_format: "float" }) }); if (!response.ok) throw new Error("Embedding nicht verfügbar"); const vector = (await response.json()).data?.[0]?.embedding; if (!Array.isArray(vector)) throw new Error("Ungültiges Embedding"); cache.set(key, vector); return vector; }
async function neighborRank(current, guess) { const [currentVector, guessVector] = await Promise.all([embedding(current), embedding(guess)]); return similarityToRank(cosineSimilarity(currentVector, guessVector)); }
function setHeaders(request, response) { const origin = request.headers.origin; if (ALLOWED_ORIGINS.has(origin)) response.setHeader("Access-Control-Allow-Origin", origin); response.setHeader("Vary", "Origin"); response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS"); response.setHeader("Access-Control-Allow-Headers", "Content-Type"); response.setHeader("Cache-Control", "no-store"); return origin; }

export default async function handler(request, response) {
  const origin = setHeaders(request, response); if (request.method === "OPTIONS") return response.status(204).end(); if (origin && !ALLOWED_ORIGINS.has(origin)) return response.status(403).json({ error: "Nicht erlaubt." });
  const requestedRound = Number.isSafeInteger(Number(request.query?.round)) && Number(request.query.round) >= 0 ? Number(request.query.round) : undefined; const puzzle = getPuzzle(new Date(), requestedRound); if (request.method === "GET") return response.status(200).json({ id: puzzle.id, round: puzzle.round, start: puzzle.start, goal: puzzle.goal, dateLabel: puzzle.dateLabel }); if (request.method !== "POST") return response.status(405).json({ error: "Methode nicht erlaubt." });
  const body = request.body || {}; const puzzleId = typeof body.puzzleId === "string" ? body.puzzleId : ""; const current = normalize(body.current); const raw = typeof body.guess === "string" ? body.guess : ""; const guess = normalize(raw); const attemptNumber = Number.isSafeInteger(body.attemptNumber) ? body.attemptNumber : 1; const durationSeconds = Number.isSafeInteger(body.durationSeconds) ? Math.max(0, Math.min(body.durationSeconds, 86400)) : 0;
  if (!getPuzzleFromId(puzzleId)) return response.status(409).json({ error: "Dieses Rätsel ist nicht mehr aktuell." }); if (!/^[a-zäöüß]+$/iu.test(guess) || guess.length > 40) return response.status(422).json({ error: "Nicht dabei" });
  if (guess === normalize(puzzle.goal)) { await logGameGuess({ puzzle_id: puzzleId, target_word: puzzle.goal, attempt_number: attemptNumber, guess: raw.trim(), normalized_guess: guess, dictionary_word: guess, status: "solved", rank: null, solved: true }); await logGameResult({ puzzle_id: puzzleId, steps: attemptNumber, duration_seconds: durationSeconds }); const stats = await getGameStats(puzzleId, attemptNumber); return response.status(200).json({ word: puzzle.goal, solved: true, percentile: stats.percentile }); }
  if (!process.env.OPENAI_API_KEY) return response.status(500).json({ error: "Die Wortprüfung ist momentan nicht verfügbar." });
  try { const dictionary = await dictionaryWord(guess); const rank = dictionary ? await neighborRank(current || puzzle.start, dictionary) : null; if (!dictionary || rank > MAX_ASSOCIATION_RANK) { await logGameGuess({ puzzle_id: puzzleId, target_word: puzzle.goal, attempt_number: attemptNumber, guess: raw.trim(), normalized_guess: guess, dictionary_word: dictionary, status: "rejected", rank, solved: false }); return response.status(422).json({ error: "Nicht dabei" }); } await logGameGuess({ puzzle_id: puzzleId, target_word: puzzle.goal, attempt_number: attemptNumber, guess: raw.trim(), normalized_guess: guess, dictionary_word: dictionary, status: "accepted", rank, solved: false }); let associations = []; try { associations = await allowedAssociations(dictionary); } catch (error) { console.error("[wortpfad:associations-error]", error.message); } console.info("[wortpfad:valid]", JSON.stringify({ puzzleId, current: current || puzzle.start, association: dictionary, rank, allowedAssociations: associations })); return response.status(200).json({ word: raw.trim().charAt(0).toLocaleUpperCase("de-DE") + raw.trim().slice(1), solved: false }); } catch { return response.status(502).json({ error: "Die Wortprüfung ist momentan nicht verfügbar." }); }
}
