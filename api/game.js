const ALLOWED_ORIGIN = "https://ptrjstn.github.io";
const START_DATE = "2026-07-20";

const puzzles = [
  { target: "Schlüsselloch", words: ["spion", "guckloch", "türspion", "schlüssel", "türschloss", "loch", "tür", "luke", "öffnung", "fenster", "blick", "aussicht", "sehen", "beobachten", "auge", "griff", "klinke", "zimmer", "haus", "wand", "fernseher"] },
  { target: "Gewitter", words: ["donnerwetter", "unwetter", "blitz", "donner", "sturm", "wolkenbruch", "regen", "wetter", "wolke", "hagel", "orkan", "himmel", "nass", "dunkel", "sommer", "luft", "wind", "schauer", "pfütze", "schirm", "sonne"] },
  { target: "Bibliothek", words: ["bücherei", "bibliothekar", "buch", "lesen", "regal", "literatur", "ausleihe", "archiv", "roman", "wissen", "autor", "seite", "papier", "schule", "universität", "leise", "lernen", "geschichte", "schrift", "zimmer", "drucker"] },
  { target: "Schatten", words: ["silhouette", "schattig", "dunkelheit", "licht", "sonne", "umriss", "nacht", "dunkel", "spiegelbild", "gestalt", "baum", "körper", "laterne", "grau", "boden", "wand", "sommer", "kühl", "wolke", "bild", "farbe"] },
  { target: "Kompass", words: ["kompassnadel", "norden", "navigation", "richtung", "orientierung", "landkarte", "magnet", "nadel", "süden", "osten", "westen", "wandern", "weg", "reise", "meer", "schiff", "instrument", "kreis", "ziel", "wald", "uhr"] },
  { target: "Leuchtturm", words: ["leuchtfeuer", "bake", "turm", "küste", "licht", "meer", "schiff", "hafen", "signal", "insel", "strand", "welle", "seefahrt", "laterne", "nacht", "fels", "sturm", "horizont", "haus", "hoch", "lampe"] },
  { target: "Sehnsucht", words: ["verlangen", "fernweh", "vermissen", "wunsch", "heimweh", "liebe", "hoffnung", "träumen", "gefühl", "ferne", "erinnerung", "warten", "nähe", "einsamkeit", "traurig", "herz", "reise", "glück", "zukunft", "zeit", "mensch"] },
];

function berlinDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function dayDifference(date) {
  const [y, m, d] = date.split("-").map(Number);
  const [sy, sm, sd] = START_DATE.split("-").map(Number);
  return Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(sy, sm - 1, sd)) / 86400000);
}
function getPuzzle() {
  const id = berlinDate();
  const elapsed = Math.max(0, dayDifference(id));
  return { id, number: elapsed + 1, puzzle: puzzles[elapsed % puzzles.length] };
}
function normalize(value) {
  return value.trim().normalize("NFC").toLocaleLowerCase("de-DE");
}
function displayWord(word) {
  return word.charAt(0).toLocaleUpperCase("de-DE") + word.slice(1);
}
function temperature(rank) {
  if (rank <= 3) return "Sehr heiß.";
  if (rank <= 7) return "Heiß.";
  if (rank <= 12) return "Du kommst näher.";
  if (rank <= 18) return "Entfernt verwandt.";
  return "Noch ziemlich weit entfernt.";
}

export default async function handler(request, response) {
  const origin = request.headers.origin;
  if (origin === ALLOWED_ORIGIN) response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  if (request.method === "OPTIONS") return response.status(204).end();
  if (origin && origin !== ALLOWED_ORIGIN) return response.status(403).json({ error: "Diese Website darf das Spiel nicht aufrufen." });

  const { id, number, puzzle } = getPuzzle();
  if (request.method === "GET") return response.status(200).json({ id, number });
  if (request.method !== "POST") return response.status(405).json({ error: "Nur GET- und POST-Anfragen sind erlaubt." });

  const puzzleId = typeof request.body?.puzzleId === "string" ? request.body.puzzleId : "";
  const rawGuess = typeof request.body?.guess === "string" ? request.body.guess : "";
  if (puzzleId !== id) return response.status(409).json({ error: "Inzwischen hat ein neues Tagesrätsel begonnen. Bitte lade die Seite neu." });
  if (rawGuess.length > 40) return response.status(400).json({ error: "Das Wort ist zu lang." });
  const guess = normalize(rawGuess);
  if (!/^[a-zäöüß]+$/iu.test(guess)) return response.status(400).json({ error: "Bitte gib genau ein deutsches Wort ohne Leer- oder Sonderzeichen ein." });
  const target = normalize(puzzle.target);
  if (guess === target) return response.status(200).json({ word: puzzle.target, rank: 1, solved: true, temperature: "Treffer." });
  const index = puzzle.words.indexOf(guess);
  if (index === -1) return response.status(422).json({ error: "Dieses Wort ist im aktuellen Beta-Wortbestand noch nicht enthalten." });
  const rank = index + 2;
  return response.status(200).json({ word: displayWord(guess), rank, solved: false, temperature: temperature(rank) });
}
