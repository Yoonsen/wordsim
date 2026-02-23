import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import Graph from "https://esm.sh/graphology@0.26.0";
import louvain from "https://esm.sh/graphology-communities-louvain@2.0.2";

const BASE_URL = "https://api.nb.no/dhlab/similarity";
const MAX_GRAPH_NODES = 1000;

const form = document.querySelector("#words-form");
const wordsInput = document.querySelector("#words-input");
const limitInput = document.querySelector("#limit-input");
const modelSelect = document.querySelector("#model-select");
const statusEl = document.querySelector("#status");
const resultsEl = document.querySelector("#results");

const graphForm = document.querySelector("#graph-form");
const graphSeedInput = document.querySelector("#graph-seed-input");
const graphDepthInput = document.querySelector("#graph-depth-input");
const graphNeighborsInput = document.querySelector("#graph-neighbors-input");
const graphThresholdInput = document.querySelector("#graph-threshold-input");
const graphModelSelect = document.querySelector("#graph-model-select");
const graphNormalizationSelect = document.querySelector("#graph-normalization-select");
const graphClusterWordsSelect = document.querySelector("#graph-cluster-words-select");
const graphAlgorithmSelect = document.querySelector("#graph-algorithm-select");
const graphReclusterBtn = document.querySelector("#graph-recluster-btn");
const graphStatusEl = document.querySelector("#graph-status");
const graphCanvasEl = document.querySelector("#graph-canvas");
const clusterResultsEl = document.querySelector("#cluster-results");

const tabButtons = [...document.querySelectorAll(".tab-button")];
const tabContents = [...document.querySelectorAll(".tab-content")];
let lastBuiltGraph = null;

function setActiveTab(tabId) {
  for (const button of tabButtons) {
    button.classList.toggle("active", button.dataset.tab === tabId);
  }
  for (const panel of tabContents) {
    panel.classList.toggle("active", panel.id === tabId);
  }
}

for (const button of tabButtons) {
  button.addEventListener("click", () => setActiveTab(button.dataset.tab));
}

function parseWords(rawText) {
  if (!rawText.trim()) {
    return [];
  }

  return rawText
    .split(/[,\s]+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

function normalizeWord(word, mode = "case-sensitive") {
  const trimmed = String(word || "").trim();
  if (!trimmed) {
    return "";
  }
  if (mode === "normalized") {
    return trimmed.toLocaleLowerCase("nb-NO");
  }
  return trimmed;
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
    .filter((item) => item && item.word);
}

function renderWordResults(groups) {
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

async function handleWordListSubmit(event) {
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

    renderWordResults(groups);
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

function addNode(nodesById, word, depth, normalizationMode) {
  const id = normalizeWord(word, normalizationMode);
  if (!id) {
    return null;
  }
  const existing = nodesById.get(id);
  if (existing) {
    existing.depth = Math.min(existing.depth, depth);
    return existing;
  }
  const node = { id, word: String(word).trim(), depth };
  nodesById.set(id, node);
  return node;
}

function addEdge(edgesById, source, target, score) {
  if (source === target) {
    return;
  }
  const [a, b] = [source, target].sort();
  const edgeId = `${a}::${b}`;
  const existing = edgesById.get(edgeId);
  if (existing) {
    existing.weight = Math.max(existing.weight, score);
    return;
  }
  edgesById.set(edgeId, { source: a, target: b, weight: score });
}

async function buildGraph(seedWord, options) {
  const nodesById = new Map();
  const edgesById = new Map();
  const fetched = new Set();
  const queued = new Set();
  const queue = [];

  const root = addNode(nodesById, seedWord, 0, options.normalizationMode);
  if (!root) {
    return { nodes: [], edges: [] };
  }
  queue.push(root);
  queued.add(root.id);

  while (queue.length > 0 && nodesById.size < MAX_GRAPH_NODES) {
    const current = queue.shift();
    if (current) {
      queued.delete(current.id);
    }
    if (!current || fetched.has(current.id) || current.depth >= options.depth) {
      continue;
    }
    fetched.add(current.id);

    const raw = await fetchSimilarWords(
      current.word,
      options.maxNeighbors,
      options.model,
    );
    const neighbors = normalizeResults(raw)
      .filter((item) => item.score >= options.threshold)
      .slice(0, options.maxNeighbors);

    for (const neighbor of neighbors) {
      const node = addNode(
        nodesById,
        neighbor.word,
        current.depth + 1,
        options.normalizationMode,
      );
      if (!node) {
        continue;
      }
      addEdge(edgesById, current.id, node.id, neighbor.score);

      if (
        node.depth < options.depth &&
        !fetched.has(node.id) &&
        !queued.has(node.id) &&
        nodesById.size < MAX_GRAPH_NODES
      ) {
        queue.push(node);
        queued.add(node.id);
      }
    }
  }

  return {
    nodes: [...nodesById.values()],
    edges: [...edgesById.values()],
  };
}

function buildAdjacency(nodes, edges) {
  const map = new Map(nodes.map((node) => [node.id, []]));
  for (const edge of edges) {
    map.get(edge.source)?.push({ id: edge.target, weight: edge.weight });
    map.get(edge.target)?.push({ id: edge.source, weight: edge.weight });
  }
  return map;
}

function runChineseWhispers(nodes, edges, iterations = 12) {
  const adjacency = buildAdjacency(nodes, edges);
  const labels = new Map(nodes.map((node) => [node.id, node.id]));

  for (let i = 0; i < iterations; i += 1) {
    const order = [...nodes]
      .map((node) => node.id)
      .sort(() => Math.random() - 0.5);

    for (const nodeId of order) {
      const neighbors = adjacency.get(nodeId) || [];
      if (neighbors.length === 0) {
        continue;
      }

      const scores = new Map();
      for (const edge of neighbors) {
        const label = labels.get(edge.id);
        if (!label) {
          continue;
        }
        scores.set(label, (scores.get(label) || 0) + edge.weight);
      }

      let bestLabel = labels.get(nodeId);
      let bestScore = -1;
      for (const [label, score] of scores.entries()) {
        if (score > bestScore) {
          bestScore = score;
          bestLabel = label;
        }
      }
      if (bestLabel) {
        labels.set(nodeId, bestLabel);
      }
    }
  }

  const groups = new Map();
  for (const node of nodes) {
    const label = labels.get(node.id) || node.id;
    if (!groups.has(label)) {
      groups.set(label, []);
    }
    groups.get(label).push(node.id);
  }

  const clusters = [...groups.values()]
    .map((members) => ({
      members,
      size: members.length,
    }))
    .sort((a, b) => b.size - a.size);

  const clusterByNode = new Map();
  clusters.forEach((cluster, idx) => {
    for (const nodeId of cluster.members) {
      clusterByNode.set(nodeId, idx);
    }
  });

  return { clusters, clusterByNode };
}

function runLouvain(nodes, edges) {
  const graph = new Graph({ type: "undirected", multi: false });
  for (const node of nodes) {
    graph.addNode(node.id);
  }
  for (const edge of edges) {
    const key = `${edge.source}::${edge.target}`;
    if (!graph.hasEdge(key)) {
      graph.addUndirectedEdgeWithKey(key, edge.source, edge.target, {
        weight: edge.weight,
      });
    }
  }

  const labels = louvain(graph, { getEdgeWeight: "weight" });
  const groups = new Map();
  for (const node of nodes) {
    const label = String(labels[node.id] ?? node.id);
    if (!groups.has(label)) {
      groups.set(label, []);
    }
    groups.get(label).push(node.id);
  }

  const clusters = [...groups.values()]
    .map((members) => ({
      members,
      size: members.length,
    }))
    .sort((a, b) => b.size - a.size);

  const clusterByNode = new Map();
  clusters.forEach((cluster, idx) => {
    for (const nodeId of cluster.members) {
      clusterByNode.set(nodeId, idx);
    }
  });

  return { clusters, clusterByNode };
}

function clusterGraph(nodes, edges, algorithm) {
  if (algorithm === "louvain") {
    return runLouvain(nodes, edges);
  }
  return runChineseWhispers(nodes, edges);
}

function renderClusters(nodes, clusters, showAllWords = false) {
  const nodeById = new Map(nodes.map((node) => [node.id, node.word]));
  clusterResultsEl.innerHTML = "";

  const card = document.createElement("article");
  card.className = "result-card";

  const title = document.createElement("h2");
  title.textContent = `Clustre (${clusters.length})`;

  const list = document.createElement("ol");
  list.className = "cluster-list";

  clusters.forEach((cluster, idx) => {
    const item = document.createElement("li");
    const words = cluster.members.map((id) => nodeById.get(id) || id);
    const visibleWords = showAllWords ? words : words.slice(0, 12);
    const suffix = showAllWords || words.length <= 12 ? "" : " ...";
    item.textContent = `Cluster ${idx + 1} (${cluster.size}): ${visibleWords.join(", ")}${suffix}`;
    list.append(item);
  });

  card.append(title, list);
  clusterResultsEl.append(card);
}

function renderGraph(graph, clusterByNode) {
  graphCanvasEl.innerHTML = "";
  if (graph.nodes.length === 0) {
    return;
  }

  const width = graphCanvasEl.clientWidth || 920;
  const height = 560;

  const color = d3.scaleOrdinal(d3.schemeTableau10);
  const svg = d3
    .select(graphCanvasEl)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`);

  const link = svg
    .append("g")
    .attr("stroke", "#94a3b8")
    .attr("stroke-opacity", 0.45)
    .selectAll("line")
    .data(graph.edges)
    .join("line")
    .attr("stroke-width", (d) => 0.6 + d.weight * 1.8);

  const node = svg
    .append("g")
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 1.2)
    .selectAll("circle")
    .data(graph.nodes)
    .join("circle")
    .attr("r", 5)
    .attr("fill", (d) => color(String(clusterByNode.get(d.id) || 0)));

  node.append("title").text((d) => d.word);

  const showLabels = graph.nodes.length <= 120;
  const labels = showLabels
    ? svg
        .append("g")
        .selectAll("text")
        .data(graph.nodes)
        .join("text")
        .attr("font-size", 10)
        .attr("fill", "#111827")
        .attr("dx", 7)
        .attr("dy", 3)
        .text((d) => d.word)
    : null;

  const simulation = d3
    .forceSimulation(graph.nodes)
    .force(
      "link",
      d3
        .forceLink(graph.edges)
        .id((d) => d.id)
        .distance((d) => 90 - Math.min(55, d.weight * 45)),
    )
    .force("charge", d3.forceManyBody().strength(-120))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collide", d3.forceCollide(10));

  function dragStarted(event) {
    if (!event.active) {
      simulation.alphaTarget(0.25).restart();
    }
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  function dragged(event) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  function dragEnded(event) {
    if (!event.active) {
      simulation.alphaTarget(0);
    }
    event.subject.fx = null;
    event.subject.fy = null;
  }

  node.call(d3.drag().on("start", dragStarted).on("drag", dragged).on("end", dragEnded));

  simulation.on("tick", () => {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);

    if (labels) {
      labels.attr("x", (d) => d.x).attr("y", (d) => d.y);
    }
  });
}

function renderClusteredGraph(graph, options) {
  if (!graph || graph.nodes.length === 0) {
    graphStatusEl.textContent = "Ingen graf å vise.";
    graphCanvasEl.innerHTML = "";
    clusterResultsEl.innerHTML = "";
    return;
  }

  const { clusters, clusterByNode } = clusterGraph(
    graph.nodes,
    graph.edges,
    options.algorithm,
  );
  renderGraph(graph, clusterByNode);
  renderClusters(graph.nodes, clusters, options.showAllClusterWords);
  graphStatusEl.textContent = `Ferdig: ${graph.nodes.length} noder, ${graph.edges.length} kanter, ${clusters.length} clustre (${options.normalizationMode}, ${options.algorithm}).`;
}

async function handleGraphSubmit(event) {
  event.preventDefault();

  const seedWord = graphSeedInput.value.trim();
  const depth = Math.min(2, Math.max(1, Number(graphDepthInput.value) || 1));
  const maxNeighbors = Math.min(
    10,
    Math.max(1, Number(graphNeighborsInput.value) || 10),
  );
  const threshold = Math.min(
    1,
    Math.max(0, Number(graphThresholdInput.value) || 0.7),
  );
  const model = graphModelSelect.value;
  const normalizationMode = graphNormalizationSelect.value;
  const showAllClusterWords = graphClusterWordsSelect.value === "all";
  const algorithm = graphAlgorithmSelect.value;

  if (!seedWord) {
    graphStatusEl.textContent = "Skriv inn ett startord.";
    graphCanvasEl.innerHTML = "";
    clusterResultsEl.innerHTML = "";
    return;
  }

  graphStatusEl.textContent = "Bygger graf ...";
  graphCanvasEl.innerHTML = "";
  clusterResultsEl.innerHTML = "";

  try {
    const graph = await buildGraph(seedWord, {
      depth,
      maxNeighbors,
      threshold,
      model,
      normalizationMode,
    });
    lastBuiltGraph = graph;

    if (graph.nodes.length === 0) {
      graphStatusEl.textContent = "Ingen treff for valgt oppsett.";
      return;
    }

    renderClusteredGraph(graph, {
      algorithm,
      showAllClusterWords,
      normalizationMode,
    });
  } catch (error) {
    graphStatusEl.textContent = "Kunne ikke bygge graf fra API-kall.";
    console.error(error);
  }
}

function handleRecluster() {
  if (!lastBuiltGraph || lastBuiltGraph.nodes.length === 0) {
    graphStatusEl.textContent = "Bygg en graf først, deretter kan du reclustre.";
    return;
  }

  const normalizationMode = graphNormalizationSelect.value;
  const showAllClusterWords = graphClusterWordsSelect.value === "all";
  const algorithm = graphAlgorithmSelect.value;
  renderClusteredGraph(lastBuiltGraph, {
    algorithm,
    showAllClusterWords,
    normalizationMode,
  });
}

form.addEventListener("submit", handleWordListSubmit);
graphForm.addEventListener("submit", handleGraphSubmit);
graphReclusterBtn.addEventListener("click", handleRecluster);
