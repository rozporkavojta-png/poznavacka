# Poznávačka obratlovců

Webová aplikace na procvičování poznávačky ze zoologie obratlovců podle fotek (1. a 2. část, 564 druhů).

- **Testy:** celá 1. poznávačka, celá 2. poznávačka, náhodných 30 (1. část / 2. část / obě), moje chyby, vlastní test (výběr částí, skupin, počtu otázek, jen „červené“ rody).
- **Režimy odpovídání:** výběr ze 4 (podobné druhy jako chytáky), psaní názvu (uzná i latinský název, upozorní na diakritiku), kartičky.
- **Zařazení:** volitelně druhá otázka na vyšší taxon (řád apod.).
- **Profil podle jména:** výsledky se ukládají jen v prohlížeči daného člověka (localStorage), nikam se neodesílají.
- **Atlas:** přehled všech druhů s českým a latinským názvem a zařazením.

Statický web (HTML/CSS/JS), žádný server. Data jsou v `data.js`, fotky v `img/`.

## Odkud jsou data

- Seznam druhů a zařazení: `poznavacka_seznam2025.xlsx`
- Fotky: prezentace *Poznávačka 1. část* a *Poznávačka 2. část*; 8 chybějících druhů doplněno z Wikimedia Commons (licence v `nastroje/zdroje-novych-fotek.json`).
- Skripty na vytažení dat a úpravu prezentací jsou ve složce `nastroje/`.
