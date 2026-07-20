██████╗ ████████╗██████╗      ██╗███████╗████████╗███╗   ██╗
██╔══██╗╚══██╔══╝██╔══██╗     ██║██╔════╝╚══██╔══╝████╗  ██║
██████╔╝   ██║   ██████╔╝     ██║███████╗   ██║   ██╔██╗ ██║
██╔═══╝    ██║   ██╔══██╗██   ██║╚════██║   ██║   ██║╚██╗██║
██║        ██║   ██║  ██║╚█████╔╝███████║   ██║   ██║ ╚████║
╚═╝        ╚═╝   ╚═╝  ╚═╝ ╚════╝ ╚══════╝   ╚═╝   ╚═╝  ╚═══╝

## Neuronym-Backend

`api/game.js` ist eine Vercel Serverless Function. Sie prüft Eingaben gegen
[OpenThesaurus](https://www.openthesaurus.de/) und berechnet die semantische
Nähe zum Neuronym mit OpenAIs `text-embedding-3-small`.

Für das Deployment muss `OPENAI_API_KEY` als Vercel Environment Variable
gesetzt sein. Der Schlüssel wird nur serverseitig verwendet. Vor einer
dauerhaften Nutzung der OpenThesaurus-API sollte der Betreiber entsprechend
deren API-Bedingungen `feedback@openthesaurus.de` kontaktieren.

Gültige Spielversuche werden serverseitig in Supabase protokolliert. Dafür
verwendet die API `SUPABASE_URL` sowie bevorzugt `SUPABASE_SECRET_KEY` oder
alternativ `SUPABASE_SERVICE_ROLE_KEY`. Das Datenbankschema liegt als Migration
unter `supabase/migrations/`.
