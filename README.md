# wordsim

Liten JavaScript-app for å hente nærliggende ord fra NB/DHLAB-modeller.

## Modellvalg

- 1800-tallet: `vss_1850_cos`
- 1900-tallet: `vss_1950-2015_cos`

## API

- Base URL: `https://api.nb.no/dhlab/similarity`
- Appen bruker `GET /sim_words` med parametre:
  - `word`
  - `limit`
  - `collection_name`

## Lokal test

I repo-roten:

- `python3 -m http.server 8000`
- åpne `http://localhost:8000`
