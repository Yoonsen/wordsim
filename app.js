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
      const results = await fetchSimilarWords(word, limit, model);
      groups.push({ word, results });
    }

    renderResults(groups);
    statusEl.textContent = `Ferdig. Modell: ${
      model === "vss_1850_cos" ? "1800-tallet" : "1900-tallet"
    }.`;
  } catch (error) {
    statusEl.textContent =
      "Kunne ikke hente data fra API. Sjekk nettverk/CORS og prøv igjen.";
    console.error(error);
  }
}

form.addEventListener("submit", handleSubmit);
