# Manifest

## Formål

Denne appen gjør ordlikhet tilgjengelig i en enkel webflate, med fokus på lav terskel og rask utforsking av språkmodeller fra 1800- og 1900-tallet.

## Prinsipper

- Hold løsningen liten, lesbar og lett å drifte.
- Bruk direkte API-kall der det fungerer stabilt.
- Foretrekk enkle komponenter fremfor tidlig kompleksitet.
- Bygg funksjoner inkrementelt med synlig nytte for brukeren.

## Nåværende scope

- Input av ett eller flere ord.
- Valg av modell:
  - `vss_1850_cos` (1800-tallet)
  - `vss_1950-2015_cos` (1900-tallet)
- Uthenting av nærliggende ord fra `api.nb.no/dhlab/similarity/sim_words`.
- Deploy via GitHub Pages og GitHub Actions.

## Retning videre

- Utforske ordrelasjoner som nettverk/grafer.
- Støtte rekursiv utvidelse av noder (ord -> nærliggende ord -> videre).
- Beholde UI enkelt selv når funksjonalitet øker.
