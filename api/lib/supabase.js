const SUPABASE_TIMEOUT_MS = 4000;

function getConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

export async function logGameGuess(entry) {
  const config = getConfig();
  if (!config) {
    console.warn("Supabase-Logging ist nicht konfiguriert.");
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS);
  try {
    const response = await fetch(`${config.url}/rest/v1/game_guesses`, {
      method: "POST",
      headers: {
        apikey: config.key,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(entry),
      signal: controller.signal,
    });

    if (!response.ok) {
      const details = (await response.text()).slice(0, 500);
      console.error(`Supabase-Logging fehlgeschlagen (${response.status}):`, details);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Supabase-Logging fehlgeschlagen:", error.message);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
