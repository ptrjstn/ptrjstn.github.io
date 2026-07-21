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

Für das Deployment muss `OPENAI_API_KEY` als Vercel Environment Variable
gesetzt sein. Der Schlüssel wird nur serverseitig verwendet. Vor einer
dauerhaften Nutzung der OpenThesaurus-API sollte der Betreiber entsprechend
deren API-Bedingungen `feedback@openthesaurus.de` kontaktieren.

Spielversuche und abgeschlossene Ergebnisse werden serverseitig in Supabase protokolliert. Dafür
verwendet die API `SUPABASE_URL` sowie bevorzugt `SUPABASE_SECRET_KEY` oder
alternativ `SUPABASE_SERVICE_ROLE_KEY`. Das Datenbankschema liegt als Migration
unter `supabase/migrations/`.
