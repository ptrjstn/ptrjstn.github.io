██████╗ ████████╗██████╗      ██╗███████╗████████╗███╗   ██╗
██╔══██╗╚══██╔══╝██╔══██╗     ██║██╔════╝╚══██╔══╝████╗  ██║
██████╔╝   ██║   ██████╔╝     ██║███████╗   ██║   ██╔██╗ ██║
██╔═══╝    ██║   ██╔══██╗██   ██║╚════██║   ██║   ██║╚██╗██║
██║        ██║   ██║  ██║╚█████╔╝███████║   ██║   ██║ ╚████║
╚═╝        ╚═╝   ╚═╝  ╚═╝ ╚════╝ ╚══════╝   ╚═╝   ╚═╝  ╚═══╝

## Wortpfad-Backend

`api/game.js` ist eine Vercel Serverless Function für das tägliche Wortpfad-Spiel.
Sie prüft Eingaben gegen [OpenThesaurus](https://www.openthesaurus.de/) und
akzeptiert einen Zwischenschritt nur innerhalb der internen Top-10-Nähe mit
OpenAIs `text-embedding-3-small`. Die verdeckten Begriffe werden beim Start
nicht an das Frontend übertragen.

Die Tagesrätsel stehen in `api/game.js` in `puzzles`. Ein tägliches Paar wird
ausgehend vom Berliner Kalendertag deterministisch ausgewählt. Jeder neue
Begriff wird gegen OpenThesaurus und die semantische Top-10-Nähe zum aktuellen
Begriff geprüft. Das Frontend enthält kein sichtbares Eingabefeld: Tastatur-
eingaben werden als zufällige Letter-Grafiken aus `assets/letters` dargestellt.

## Wortbestand

`data/german-words.tsv` ist aus dem deutschen 10K-News-Korpus 2021 der Leipzig
Corpora Collection erzeugt. Enthalten sind 14.072 eindeutige Grundformen aus
Substantiven, Adjektiven und Verben mit ihrer Korpus-Häufigkeit. Die Leipzig-
Daten werden unter CC BY bereitgestellt; der Import basiert auf dem Format
`*_words_pos_base.txt`. Quelle: https://wortschatz.uni-leipzig.de/en/download/deu

Der Embedding-Index wird mit der Migration
`supabase/migrations/20260721120000_create_word_embeddings.sql` und dem
Einmaljob `npm run build:word-index` erzeugt. Der Job benötigt nur serverseitig
`OPENAI_API_KEY`, `SUPABASE_URL` und `SUPABASE_SECRET_KEY` und schreibt bis zu
25 semantische Nachbarn pro Abfrage über `pgvector` zurück.

Für das Deployment muss `OPENAI_API_KEY` als Vercel Environment Variable
gesetzt sein. Der Schlüssel wird nur serverseitig verwendet. Die API lädt pro
Begriff die 25 ähnlichsten Nachbarn aus dem Index; Begriffe bis Rang 25 sind
gültig. Vor einer
dauerhaften Nutzung der OpenThesaurus-API sollte der Betreiber entsprechend
deren API-Bedingungen `feedback@openthesaurus.de` kontaktieren.

Spielversuche und abgeschlossene Ergebnisse werden serverseitig in Supabase protokolliert. Dafür
verwendet die API `SUPABASE_URL` sowie bevorzugt `SUPABASE_SECRET_KEY` oder
alternativ `SUPABASE_SERVICE_ROLE_KEY`. Das Datenbankschema liegt als Migration
unter `supabase/migrations/`.
