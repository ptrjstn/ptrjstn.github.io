██████╗ ████████╗██████╗      ██╗███████╗████████╗███╗   ██╗
██╔══██╗╚══██╔══╝██╔══██╗     ██║██╔════╝╚══██╔══╝████╗  ██║
██████╔╝   ██║   ██████╔╝     ██║███████╗   ██║   ██╔██╗ ██║
██╔═══╝    ██║   ██╔══██╗██   ██║╚════██║   ██║   ██║╚██╗██║
██║        ██║   ██║  ██║╚█████╔╝███████║   ██║   ██║ ╚████║
╚═╝        ╚═╝   ╚═╝  ╚═╝ ╚════╝ ╚══════╝   ╚═╝   ╚═╝  ╚═══╝

## Tageswort-Backend

`api/game.js` ist eine Vercel Serverless Function. Sie prüft Eingaben gegen
[OpenThesaurus](https://www.openthesaurus.de/) und berechnet die semantische
Nähe zum Tageswort mit OpenAIs `text-embedding-3-small`.

Für das Deployment muss `OPENAI_API_KEY` als Vercel Environment Variable
gesetzt sein. Der Schlüssel wird nur serverseitig verwendet. Vor einer
dauerhaften Nutzung der OpenThesaurus-API sollte der Betreiber entsprechend
deren API-Bedingungen `feedback@openthesaurus.de` kontaktieren.
