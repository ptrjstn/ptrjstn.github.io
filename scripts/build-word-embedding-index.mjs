import fs from "node:fs/promises";

const OPENAI_URL = "https://api.openai.com/v1/embeddings";
const BATCH_SIZE = 128;
const UPSERT_SIZE = 25;
const words = (await fs.readFile(new URL("../data/german-words.tsv", import.meta.url), "utf8"))
  .trim().split(/\r?\n/).map((line) => { const [word, pos, frequency] = line.split("\t"); return { word, pos, frequency: Number(frequency) || 0 }; });
const openAIKey = process.env.OPENAI_API_KEY;
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!openAIKey || !supabaseUrl || !supabaseKey) throw new Error("OPENAI_API_KEY, SUPABASE_URL und SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY werden benötigt.");

async function embed(batch) {
  const response = await fetch(OPENAI_URL, { method: "POST", headers: { Authorization: `Bearer ${openAIKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "text-embedding-3-small", input: batch.map(({ word }) => `Deutsches Wort: ${word}`), encoding_format: "float" }) });
  if (!response.ok) throw new Error(`OpenAI antwortet mit ${response.status}: ${await response.text()}`);
  const data = await response.json(); return data.data.slice().sort((a, b) => a.index - b.index).map(({ embedding }) => embedding);
}
async function upsert(rows) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const response = await fetch(`${supabaseUrl}/rest/v1/word_embeddings?on_conflict=word`, { method: "POST", headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(rows) });
    if (response.ok) return;
    const details = await response.text();
    if (attempt === 4) throw new Error(`Supabase antwortet mit ${response.status}: ${details}`);
    await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
  }
}
for (let start = 0; start < words.length; start += BATCH_SIZE) {
  const batch = words.slice(start, start + BATCH_SIZE); const vectors = await embed(batch); const rows = batch.map((item, index) => ({ ...item, embedding: vectors[index] }));
  for (let offset = 0; offset < rows.length; offset += UPSERT_SIZE) await upsert(rows.slice(offset, offset + UPSERT_SIZE));
  console.log(`[word-index] ${Math.min(start + batch.length, words.length)}/${words.length}`);
}
