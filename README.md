# Poznávačka obratlovců

Webová aplikace na procvičování poznávačky ze zoologie obratlovců podle fotek (1. a 2. část, 564 druhů).

- **Hlavní testy = psaní:** název se musí napsat správně česky nebo latinsky (dá se nastavit jen česky / jen latinsky a jestli tolerovat diakritiku). Celá 1. a 2. poznávačka, náhodných 30, červené rody, moje chyby.
- **ABCD testy zvlášť:** možnosti česky i latinsky, chytáky z podobných druhů; celé části, náhodných 30/50, jen latinské názvy, testy po skupinách (ryby, ptáci, savci…).
- **Vlastní test:** výběr části, skupin, počtu otázek a způsobu (psaní, ABCD, ABCD latinsky, kartičky).
- **Zařazení:** volitelně druhá otázka na vyšší taxon (řád apod.).
- **Profil podle jména:** výsledky se ukládají jen v prohlížeči daného člověka (localStorage), nikam se neodesílají.
- **Atlas:** přehled všech druhů s českým a latinským názvem a zařazením.

Statický web (HTML/CSS/JS), žádný server. Data jsou v `data.js`, fotky v `img/`.

## Odkud jsou data

- Seznam druhů a zařazení: `poznavacka_seznam2025.xlsx`
- Fotky: prezentace *Poznávačka 1. část* a *Poznávačka 2. část*; 8 chybějících druhů doplněno z Wikimedia Commons (licence v `nastroje/zdroje-novych-fotek.json`).
- Skripty na vytažení dat a úpravu prezentací jsou ve složce `nastroje/`.
