# Arkitektur

## Oversikt

Applikasjonen er en statisk frontend som kjører i nettleser og henter data direkte fra NB/DHLAB API.

## Komponenter

- `index.html`
  - Fane for ordlister og fane for graf.
  - Inputs for modell, terskel, dybde og nabo-grense.
  - Nedlastingsknapper for JSON-eksport.
- `app.js`
  - Input-parsing og API-kall mot `/sim_words`.
  - Normalisering av responsformat (liste av lister / objektfallback).
  - Rekursiv grafbygging med traversal-kontroll (`fetched` + `queued`).
  - Clustering med Louvain.
  - D3-rendering av force-directed graf.
  - JSON-eksport for ordlister og clustre.
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
4. For graf-fanen bygges noder/kanter iterativt med begrensninger.
5. Louvain beregner cluster-medlemskap, som vises i graf + clusterliste.
6. Datasett kan lastes ned som JSON fra UI.

## Designvalg

- Ingen backend i denne versjonen.
- Ingen rammeverk: lav kompleksitet, rask oppstart.
- Fokus på robust parsing, tydelige feilmeldinger og rask interaktivitet.
- Fast algoritme (Louvain) i UI for å holde brukerflyten enkel.

## Utvidelser (neste fase)

- Legg inn ny clustering-algoritme som alternativ til Louvain.
- Evaluering bør sammenligne:
  - cluster-konsistens mellom kjøringer
  - runtime på små/middels/store grafer
  - semantisk kvalitet i historiske case
- Behold samme grafmodell (`nodes`, `edges`) og gjenbruk eksisterende UI.
