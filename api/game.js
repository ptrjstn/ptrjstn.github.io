const ALLOWED_ORIGINS = new Set([
  "https://ptrjstn.de",
  "https://www.ptrjstn.de",
]);
const START_DATE = "2026-07-20";
const PUZZLE_REVISION = "3";
const OPENAI_MODEL = "text-embedding-3-small";
const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
const OPENTHESAURUS_URL = "https://www.openthesaurus.de/synonyme/search";
const OPENTHESAURUS_USER_AGENT =
  "ptrjstn-neuronym/1.0 (+https://ptrjstn.de/)";
const REQUEST_TIMEOUT_MS = 8000;
const CACHE_LIMIT = 500;

const puzzles = [
  "Sternwarte",
  "Gewitter",
  "Bibliothek",
  "Schatten",
  "Kompass",
  "Leuchtturm",
  "Sehnsucht",
];

const dictionaryCache = new Map();
const embeddingCache = new Map();

function cache(cacheStore, key, loader) {
  if (cacheStore.has(key)) return cacheStore.get(key);

  const pending = loader().catch((error) => {
    cacheStore.delete(key);
    throw error;
  });
  cacheStore.set(key, pending);

  if (cacheStore.size > CACHE_LIMIT) {
    cacheStore.delete(cacheStore.keys().next().value);
  }
  return pending;
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export function berlinDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function dayDifference(date) {
  const [year, month, day] = date.split("-").map(Number);
  const [startYear, startMonth, startDay] = START_DATE.split("-").map(Number);
  return Math.floor(
    (Date.UTC(year, month - 1, day) -
      Date.UTC(startYear, startMonth - 1, startDay)) /
      86400000,
  );
}

export function getPuzzle(now = new Date(), requestedRound) {
  const date = berlinDate(now);
  const elapsed = Math.max(0, dayDifference(date));
  const round = Number.isSafeInteger(requestedRound) && requestedRound >= 0
    ? requestedRound
    : elapsed;
  return {
    id: `${date}-r${PUZZLE_REVISION}-g${round}`,
    target: puzzles[round % puzzles.length],
  };
}

export function getPuzzleFromId(id, now = new Date()) {
  const match = /^(\d{4}-\d{2}-\d{2})-r3-g(\d+)$/.exec(id);
  if (!match || match[1] !== berlinDate(now)) return null;

  const round = Number(match[2]);
  return Number.isSafeInteger(round) ? getPuzzle(now, round) : null;
}

export function normalize(value) {
  return value.trim().normalize("NFC").toLocaleLowerCase("de-DE");
}

function displayWord(word) {
  return word.charAt(0).toLocaleUpperCase("de-DE") + word.slice(1);
}

export function cosineSimilarity(left, right) {
  if (left.length !== right.length || left.length === 0) {
    throw new Error("Die Embeddings haben nicht die erwartete Form.");
  }

  let product = 0;
  let leftLength = 0;
  let rightLength = 0;
  for (let index = 0; index < left.length; index += 1) {
    product += left[index] * right[index];
    leftLength += left[index] ** 2;
    rightLength += right[index] ** 2;
  }

  const denominator = Math.sqrt(leftLength) * Math.sqrt(rightLength);
  if (!denominator) throw new Error("Ein Embedding ist leer.");
  return product / denominator;
}

// Eine exponentielle Skala macht hohe semantische Ähnlichkeit deutlich sichtbar.
export function similarityToRank(similarity) {
  const boundedSimilarity = Math.max(0.25, Math.min(0.9, similarity));
  const estimatedRank = Math.round(
    1000 * Math.exp(-10 * (boundedSimilarity - 0.25)),
  );
  return Math.max(2, Math.min(1000, estimatedRank));
}

export function hintForRank(rank) {
  if (rank <= 5) return "Fast geschafft: Du suchst im engsten Bedeutungsfeld.";
  if (rank <= 20) return "Sehr nah: Denk an ein direkt verwandtes Substantiv.";
  if (rank <= 75) return "Gute Spur: Bleib in diesem Themenfeld und werde konkreter.";
  if (rank <= 200) return "Die Richtung stimmt. Suche nach einem präziseren Gegenstand oder Begriff.";
  if (rank <= 500) return "Es gibt eine Verbindung, aber sie ist noch allgemein. Wechsle die Perspektive.";
  return "Kaum Bedeutungsnähe. Probiere ein Substantiv aus einem anderen Themenfeld.";
}

function isExactDictionaryTerm(data, guess) {
  return data.synsets?.some((synset) =>
    synset.terms?.some((entry) => normalize(entry.term || "") === guess),
  );
}

async function findDictionaryWord(guess) {
  return cache(dictionaryCache, guess, async () => {
    const url = new URL(OPENTHESAURUS_URL);
    url.searchParams.set("q", guess);
    url.searchParams.set("format", "application/json");
    url.searchParams.set("baseform", "true");

    const thesaurusResponse = await fetchWithTimeout(url, {
      headers: { "User-Agent": OPENTHESAURUS_USER_AGENT },
    });
    if (!thesaurusResponse.ok) {
      throw new Error(`OpenThesaurus antwortet mit ${thesaurusResponse.status}.`);
    }

    const data = await thesaurusResponse.json();
    if (isExactDictionaryTerm(data, guess)) return guess;

    const baseform = data.baseforms?.find((word) =>
      /^[a-zäöüß]+$/iu.test(normalize(word)),
    );
    return baseform ? normalize(baseform) : null;
  });
}

async function createEmbeddings(words) {
  const openAIResponse = await fetchWithTimeout(OPENAI_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: words.map((word) => `Deutsches Wort: ${word}`),
      encoding_format: "float",
    }),
  });

  if (!openAIResponse.ok) {
    const details = await openAIResponse.text();
    console.error("OpenAI-Fehler:", details);
    throw new Error(`OpenAI antwortet mit ${openAIResponse.status}.`);
  }

  const result = await openAIResponse.json();
  const vectors = result.data
    ?.slice()
    .sort((left, right) => left.index - right.index)
    .map((item) => item.embedding);
  if (vectors?.length !== words.length || vectors.some((vector) => !Array.isArray(vector))) {
    throw new Error("Die OpenAI-Antwort enthält nicht alle Embeddings.");
  }
  return vectors;
}

async function getSimilarity(guess, target) {
  const targetKey = normalize(target);
  const cachedTarget = embeddingCache.get(targetKey);

  if (cachedTarget) {
    const [guessVector, targetVector] = await Promise.all([
      cache(embeddingCache, guess, async () => (await createEmbeddings([guess]))[0]),
      cachedTarget,
    ]);
    return cosineSimilarity(guessVector, targetVector);
  }

  const [guessVector, targetVector] = await createEmbeddings([guess, targetKey]);
  embeddingCache.set(guess, Promise.resolve(guessVector));
  embeddingCache.set(targetKey, Promise.resolve(targetVector));
  return cosineSimilarity(guessVector, targetVector);
}

function setHeaders(request, response) {
  const origin = request.headers.origin;
  if (ALLOWED_ORIGINS.has(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
  }
  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  response.setHeader("CDN-Cache-Control", "no-store");
  response.setHeader("Vercel-CDN-Cache-Control", "no-store");
  return origin;
}

export default async function handler(request, response) {
  const origin = setHeaders(request, response);
  if (request.method === "OPTIONS") return response.status(204).end();
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return response.status(403).json({ error: "Diese Website darf das Spiel nicht aufrufen." });
  }

  const dailyPuzzle = getPuzzle();
  if (request.method === "GET") {
    const after = typeof request.query?.after === "string"
      ? getPuzzleFromId(request.query.after)
      : null;
    const puzzle = after
      ? getPuzzle(new Date(), Number(after.id.match(/-g(\d+)$/)[1]) + 1)
      : dailyPuzzle;
    return response.status(200).json({ id: puzzle.id });
  }
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Nur GET- und POST-Anfragen sind erlaubt." });
  }

  const puzzleId = typeof request.body?.puzzleId === "string" ? request.body.puzzleId : "";
  const rawGuess = typeof request.body?.guess === "string" ? request.body.guess : "";
  const puzzle = getPuzzleFromId(puzzleId);
  if (!puzzle) {
    return response.status(409).json({ error: "Dieses Spiel ist nicht mehr aktuell. Starte ein neues Spiel." });
  }
  if (rawGuess.length > 40) {
    return response.status(400).json({ error: "Das Wort ist zu lang." });
  }

  const guess = normalize(rawGuess);
  if (!/^[a-zäöüß]+$/iu.test(guess)) {
    return response.status(400).json({ error: "Bitte gib genau ein deutsches Wort ohne Leer- oder Sonderzeichen ein." });
  }

  if (guess === normalize(puzzle.target)) {
    return response.status(200).json({
      word: puzzle.target,
      rank: 1,
      solved: true,
      hint: "Treffer.",
    });
  }
  if (!process.env.OPENAI_API_KEY) {
    return response.status(500).json({ error: "Der OpenAI API-Key fehlt." });
  }

  try {
    const dictionaryWord = await findDictionaryWord(guess);
    if (!dictionaryWord) {
      return response.status(422).json({ error: "Dieses Wort ist nicht bei OpenThesaurus enthalten." });
    }

    const similarity = await getSimilarity(dictionaryWord, puzzle.target);
    const rank = similarityToRank(similarity);
    return response.status(200).json({
      word: displayWord(guess),
      rank,
      solved: false,
      hint: hintForRank(rank),
    });
  } catch (error) {
    console.error("Fehler beim Prüfen des Wortes:", error);
    return response.status(502).json({
      error: "Die Wortprüfung ist momentan nicht verfügbar. Bitte versuche es erneut.",
    });
  }
}
