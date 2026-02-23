const BASE_URL = "https://api.nb.no/dhlab/similarity";

const form = document.querySelector("#words-form");
const wordsInput = document.querySelector("#words-input");
const limitInput = document.querySelector("#limit-input");
const modelSelect = document.querySelector("#model-select");
const statusEl = document.querySelector("#status");
const resultsEl = document.querySelector("#results");

function parseWords(rawText) {
  if (!rawText.trim()) {
    return [];
  }

  return rawText
    .split(/[,\s]+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

async function fetchSimilarWords(word, limit, collectionName) {
  const url = new URL(`${BASE_URL}/sim_words`);
  url.searchParams.set("word", word);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("collection_name", collectionName);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API-feil ${response.status}`);
  }
  return response.json();
}

function normalizeResults(results) {
  if (!Array.isArray(results)) {
    return [];
  }

  return results
    .map((item) => {
      if (Array.isArray(item) && item.length >= 2) {
        return { word: String(item[0]), score: Number(item[1]) };
      }
      if (item && typeof item === "object" && "word" in item) {
        return {
          word: String(item.word),
          score: Number(item.score ?? 0),
        };
      }
      return null;
    })
    .filter(Boolean);
}

function renderResults(groups) {
  resultsEl.innerHTML = "";

  for (const group of groups) {
    const card = document.createElement("article");
    card.className = "result-card";

    const title = document.createElement("h2");
    title.textContent = group.word;

    const list = document.createElement("p");
    list.className = "result-list";
    list.textContent =
      group.results.length > 0
        ? group.results.map((item) => item.word).join(", ")
        : "Ingen treff.";

    card.append(title, list);
    resultsEl.append(card);
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  const words = parseWords(wordsInput.value);
  const limit = Number(limitInput.value) || 10;
  const model = modelSelect.value;

  if (words.length === 0) {
    statusEl.textContent = "Skriv minst ett ord.";
    resultsEl.innerHTML = "";
    return;
  }

  statusEl.textContent = "Henter data ...";
  resultsEl.innerHTML = "";

  try {
    const groups = [];
    for (const word of words) {
      const rawResults = await fetchSimilarWords(word, limit, model);
      const results = normalizeResults(rawResults);
      groups.push({ word, results });
    }

    renderResults(groups);
    statusEl.textContent = `Ferdig. Modell: ${
      model === "vss_1850_cos" ? "1800-tallet" : "1900-tallet"
    }.`;
  } catch (error) {
    const message = error instanceof TypeError
      ? "Kunne ikke kontakte API-et. Sjekk nettverk og prøv igjen."
      : "Kunne ikke hente data fra API.";
    statusEl.textContent = message;
    console.error(error);
  }
}

form.addEventListener("submit", handleSubmit);
