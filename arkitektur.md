# Arkitektur

## Oversikt

Applikasjonen er en statisk frontend som kjører i nettleser og henter data direkte fra NB/DHLAB API.

## Komponenter

- `index.html`
  - Struktur og inputs (ord, antall, modellvalg).
- `app.js`
  - Input-parsing.
  - API-kall mot `/sim_words`.
  - Normalisering av responsformat (liste av lister / objektfallback).
  - Rendering av resultater.
- `styles.css`
  - Enkel layout og presentasjon.
- `.github/workflows/deploy-pages.yml`
  - Bygger og deployer statiske filer til GitHub Pages.

## Dataflyt

1. Bruker skriver inn ord og velger modell.
2. Frontend sender `GET` til:
   - `https://api.nb.no/dhlab/similarity/sim_words`
   - parametre: `word`, `limit`, `collection_name`
3. Respons normaliseres til intern struktur `{ word, score }`.
4. Resultater vises som ordlister per forespurt ord.

## Designvalg

- Ingen backend i denne versjonen.
- Ingen rammeverk: lav kompleksitet, rask oppstart.
- Fokus på robust parsing og tydelige feilmeldinger.

## Utvidelser (graf/rekursjon)

- Introduser en intern grafmodell:
  - `nodes`: unike ord
  - `edges`: relasjoner med `score`
- Rekursiv henting med begrensninger:
  - `maxDepth` (dybde)
  - `maxNeighbors` (bredde)
  - `minScore` (terskel)
  - `visited`-sett for å unngå sykluser
- Visualisering:
  - enkel force-directed graf (f.eks. D3 eller vis-network)
  - filtrering og highlighting i UI
