██████╗ ████████╗██████╗      ██╗███████╗████████╗███╗   ██╗
██╔══██╗╚══██╔══╝██╔══██╗     ██║██╔════╝╚══██╔══╝████╗  ██║
██████╔╝   ██║   ██████╔╝     ██║███████╗   ██║   ██╔██╗ ██║
██╔═══╝    ██║   ██╔══██╗██   ██║╚════██║   ██║   ██║╚██╗██║
██║        ██║   ██║  ██║╚█████╔╝███████║   ██║   ██║ ╚████║
╚═╝        ╚═╝   ╚═╝  ╚═╝ ╚════╝ ╚══════╝   ╚═╝   ╚═╝  ╚═══╝

## Wortpfad-Backend

`api/game.js` ist eine Vercel Serverless Function für das tägliche Wortpfad-Spiel.
Sie prüft Eingaben gegen [OpenThesaurus](https://www.openthesaurus.de/) und
akzeptiert einen Zwischenschritt nur innerhalb der internen Top-15-Nähe mit
OpenAIs `text-embedding-3-small`. Die verdeckten Begriffe werden beim Start
nicht an das Frontend übertragen.

Die Tagesrätsel und ihre garantierten Lösungswege stehen in `api/game.js` in
`puzzles`. Jede Station hat genau fünf Kandidaten; der erste Kandidat ist der
garantierte nächste Pfadschritt, die weiteren vier sind Ablenkungen. Beim
Veröffentlichen eines neuen Rätsels müssen `path` und `neighbors` dieselbe
Länge haben, fünf eindeutige Wörter pro Station enthalten und das Ziel darf
nicht vor der letzten Station in den Kandidaten stehen. Die Tests prüfen diese
Invarianten für alle vorbereiteten Rätsel.

Für das Deployment muss `OPENAI_API_KEY` als Vercel Environment Variable
gesetzt sein. Der Schlüssel wird nur serverseitig verwendet. Vor einer
dauerhaften Nutzung der OpenThesaurus-API sollte der Betreiber entsprechend
deren API-Bedingungen `feedback@openthesaurus.de` kontaktieren.

Spielversuche und abgeschlossene Ergebnisse werden serverseitig in Supabase protokolliert. Dafür
verwendet die API `SUPABASE_URL` sowie bevorzugt `SUPABASE_SECRET_KEY` oder
alternativ `SUPABASE_SERVICE_ROLE_KEY`. Das Datenbankschema liegt als Migration
unter `supabase/migrations/`.
