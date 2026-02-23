# TODO

## Kort sikt

- [ ] Legg til visning av score ved hvert nærliggende ord.
- [ ] Legg til enkel validering av `limit` med tydelig UI-feedback.
- [ ] Forbedre feilmeldinger med HTTP-status når tilgjengelig.
- [ ] Legg inn en liten "loading"-indikator per ord ved flere oppslag.

## Graf og rekursjon

- [ ] Definer datastruktur for graf (`nodes`, `edges`).
- [ ] Lag funksjon for rekursiv utvidelse med:
  - [ ] `maxDepth`
  - [ ] `maxNeighbors`
  - [ ] `minScore`
  - [ ] `visited`-sett
- [ ] Legg til enkel visualisering av graf.
- [ ] Lag kontrollpanel for dybde, terskel og modellvalg.
- [ ] Vis forskjeller mellom 1800- og 1900-modell i samme visning.

## Drift og kvalitet

- [ ] Legg til enkel smoke-test for API-kall.
- [ ] Rydd opp tom `proxy/`-mappe hvis den ikke skal brukes.
- [ ] Dokumenter kjent API-format i `README.md`.
