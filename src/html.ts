// Generates a self-contained HTML file with cytoscape + mermaid for interactive
// graph navigation. The graph JSON is embedded at generation time. All
// interactivity is client-side JS.

import { toFlowchart, toSequence, type Graph } from "./mermaid.js";

export function generateHtml(graph: Graph, repoPath: string, initialFn?: string): string {
  const graphJson = JSON.stringify(graph).replace(/</g, "\\u003c");
  const initialFnJson = JSON.stringify(initialFn ?? "");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>nuanced-viz: ${escapeHtml(repoPath)}</title>
<script src="https://unpkg.com/cytoscape@3.30.2/dist/cytoscape.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
  #toolbar { display: flex; gap: 8px; padding: 8px 12px; background: #1a1a2e; align-items: center; flex-shrink: 0; }
  #toolbar input, #toolbar select, #toolbar button { padding: 6px 10px; border-radius: 4px; border: 1px solid #444; background: #2a2a4e; color: #eee; font-size: 13px; }
  #toolbar input[type="text"] { width: 280px; }
  #toolbar input[type="range"] { width: 120px; }
  #toolbar label { color: #aaa; font-size: 12px; }
  #toolbar button { cursor: pointer; }
  #toolbar button:hover { background: #3a3a6e; }
  #toolbar .spacer { flex: 1; }
  #toolbar .repo { color: #888; font-size: 12px; font-family: monospace; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #main { display: flex; flex: 1; overflow: hidden; }
  #cy { width: 70%; height: 100%; background: #0f0f23; }
  #sidebar { width: 30%; min-width: 280px; background: #1a1a2e; color: #ccc; overflow-y: auto; padding: 16px; border-left: 1px solid #333; }
  #sidebar h2 { color: #e0e0e0; font-size: 16px; margin-bottom: 8px; word-break: break-all; }
  #sidebar .detail { font-size: 13px; color: #aaa; margin-bottom: 4px; }
  #sidebar .detail a { color: #6db4ff; text-decoration: none; }
  #sidebar .section-title { color: #999; font-size: 12px; text-transform: uppercase; margin-top: 16px; margin-bottom: 6px; letter-spacing: 1px; }
  #sidebar .callees, #sidebar .callers { font-size: 12px; line-height: 1.6; }
  #sidebar .callees li, #sidebar .callers li { list-style: none; cursor: pointer; padding: 2px 4px; border-radius: 3px; }
  #sidebar .callees li:hover, #sidebar .callers li:hover { background: #2a2a4e; color: #fff; }
  #sidebar .callees li.external, #sidebar .callers li.external { color: #777; cursor: default; }
  #mermaid-container { margin-top: 16px; }
  #mermaid-container .section-title { margin-bottom: 4px; }
  #mermaid-output { background: #0a0a1a; border: 1px solid #333; border-radius: 4px; padding: 12px; overflow-x: auto; font-size: 11px; }
  #mermaid-output svg { max-width: 100%; }
  .node-count { font-size: 11px; color: #666; margin-left: 6px; }
  #loading { position: fixed; top: 50%; left: 35%; transform: translate(-50%,-50%); color: #888; font-size: 14px; z-index: 100; }
</style>
</head>
<body>
<div id="toolbar">
  <input type="text" id="search" placeholder="Search functions..." />
  <label>Depth:
    <input type="range" id="depth" min="1" max="10" value="3" />
    <span id="depth-val">3</span>
  </label>
  <select id="diagram-type">
    <option value="flowchart">Flowchart</option>
    <option value="sequence">Sequence</option>
  </select>
  <button id="recenter">Recenter</button>
  <div class="spacer"></div>
  <span class="repo" title="${escapeHtml(repoPath)}">${escapeHtml(repoPath)}</span>
</div>
<div id="main">
  <div id="cy"></div>
  <div id="sidebar">
    <h2 id="sel-name">Click a node</h2>
    <div class="detail" id="sel-file"></div>
    <div class="detail" id="sel-line"></div>
    <div class="detail" id="sel-calls"></div>
    <div class="section-title">Callees</div>
    <ul class="callees" id="sel-callees"></ul>
    <div class="section-title">Callers</div>
    <ul class="callers" id="sel-callers"></ul>
    <div id="mermaid-container">
      <div class="section-title">Mermaid Preview <span class="node-count" id="mermaid-nodes"></span></div>
      <div id="mermaid-output">Select a function to see its subgraph</div>
    </div>
  </div>
</div>
<div id="loading">Building graph...</div>

<script>
const GRAPH = ${graphJson};
const INITIAL_FN = ${initialFnJson};
const REPO_PATH = ${JSON.stringify(repoPath)};

// Build cytoscape elements from the graph
function buildElements(maxDepth, filterText) {
  const elements = [];
  const seen = new Set();
  const filter = filterText ? filterText.toLowerCase() : null;

  for (const [key, node] of Object.entries(GRAPH)) {
    if (filter && !key.toLowerCase().includes(filter)) continue;
    const id = key.replace(/[^a-zA-Z0-9_]/g, "_");
    const name = key.split(".").pop() || key;
    const fname = (node.filepath || "").replace(REPO_PATH + "/", "");
    const callCount = (node.callees || []).length;
    elements.push({
      data: { id, label: name, key, filepath: node.filepath || "", fname, lineno: node.lineno, callees: node.callees || [], callCount },
      classes: node.callees && node.callees.length === 0 ? "leaf" : ""
    });
    seen.add(key);
  }

  // Edges: only for nodes in the filtered set
  for (const [key, node] of Object.entries(GRAPH)) {
    if (filter && !key.toLowerCase().includes(filter)) continue;
    const fromId = key.replace(/[^a-zA-Z0-9_]/g, "_");
    for (const callee of node.callees || []) {
      const toId = callee.replace(/[^a-zA-Z0-9_]/g, "_");
      if (seen.has(callee) && fromId !== toId) {
        elements.push({ data: { source: fromId, target: toId } });
      }
    }
  }
  return elements;
}

let cy;
let currentDepth = 3;

function initCytoscape() {
  cy = cytoscape({
    container: document.getElementById("cy"),
    elements: buildElements(currentDepth, ""),
    style: [
      { selector: "node", style: {
        "label": "data(label)", "text-valign": "center", "text-halign": "center",
        "color": "#ddd", "font-size": "10px", "background-color": "#2a4a8e",
        "width": "mapData(callCount, 0, 50, 24, 50)", "height": "mapData(callCount, 0, 50, 24, 50)",
        "border-width": 1, "border-color": "#3a5a9e", "text-wrap": "wrap", "text-max-width": "80px",
        "text-overflow": "ellipsis"
      }},
      { selector: "node.leaf", style: { "background-color": "#4a4a5e", "border-color": "#5a5a6e" }},
      { selector: "node:selected", style: { "background-color": "#4CAF50", "border-color": "#2E7D32", "border-width": 3 }},
      { selector: "edge", style: {
        "curve-style": "bezier", "target-arrow-shape": "triangle",
        "arrow-color": "#555", "line-color": "#333", "width": 1, "opacity": 0.6
      }},
      { selector: "edge:selected", style: { "line-color": "#4CAF50", "arrow-color": "#4CAF50", "width": 2, "opacity": 1 }}
    ],
    layout: { name: "cose", animate: false, nodeRepulsion: 10000, idealEdgeLength: 100, nodeDimensionsIncludeLabels: true },
    wheelSensitivity: 0.2,
  });

  cy.on("tap", "node", function(evt) {
    selectNode(evt.target.data("key"));
  });
}

function shortName(key) { return key.split(".").pop() || key; }

// BFS subgraph from a given key up to currentDepth
function buildSubgraph(entryKey) {
  const sub = {};
  sub[entryKey] = GRAPH[entryKey];
  if (!sub[entryKey]) return sub;
  const visited = new Set([entryKey]);
  const queue = [{ key: entryKey, depth: 0 }];
  while (queue.length > 0) {
    const { key, depth } = queue.shift();
    if (depth >= currentDepth) continue;
    const node = GRAPH[key];
    if (!node) continue;
    for (const callee of node.callees || []) {
      if (visited.has(callee)) continue;
      visited.add(callee);
      if (GRAPH[callee]) {
        sub[callee] = GRAPH[callee];
        queue.push({ key: callee, depth: depth + 1 });
      }
    }
  }
  return sub;
}

function findCallers(entryKey) {
  const callers = [];
  for (const [key, node] of Object.entries(GRAPH)) {
    if (key === entryKey) continue;
    if ((node.callees || []).includes(entryKey)) callers.push(key);
  }
  return callers;
}

function escapeHtml(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

let mermaidInitialized = false;
async function renderMermaid(subgraph, entryKey) {
  const type = document.getElementById("diagram-type").value;
  const mermaidText = type === "sequence"
    ? toSequenceJs(subgraph, entryKey)
    : toFlowchartJs(subgraph, entryKey);

  const out = document.getElementById("mermaid-output");
  document.getElementById("mermaid-nodes").textContent = "(" + Object.keys(subgraph).length + " nodes)";

  if (!mermaidInitialized) {
    mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "loose" });
    mermaidInitialized = true;
  }
  try {
    const { svg } = await mermaid.render("mermaid-preview", mermaidText);
    out.innerHTML = svg;
  } catch(e) {
    out.textContent = "Mermaid error: " + (e.message || e);
  }
}

// Client-side mermaid generation (mirrors src/mermaid.ts)
function toFlowchartJs(subgraph, entryKey) {
  const lines = ["graph TD"];
  const inGraph = new Set(Object.keys(subgraph));
  const eId = entryKey.replace(/[^a-zA-Z0-9_]/g, "_");
  lines.push("    " + eId + '["' + shortName(entryKey) + '"]');
  for (const [key] of Object.entries(subgraph)) {
    if (key === entryKey) continue;
    lines.push("    " + key.replace(/[^a-zA-Z0-9_]/g, "_") + '["' + shortName(key) + '"]');
  }
  for (const [key, node] of Object.entries(subgraph)) {
    const fromId = key.replace(/[^a-zA-Z0-9_]/g, "_");
    for (const callee of node.callees || []) {
      if (inGraph.has(callee) && callee !== key) {
        lines.push("    " + fromId + " --> " + callee.replace(/[^a-zA-Z0-9_]/g, "_"));
      }
    }
  }
  return lines.join("\\n");
}

function toSequenceJs(subgraph, entryKey) {
  const lines = ["sequenceDiagram"];
  const inGraph = new Set(Object.keys(subgraph));
  const participants = [entryKey];
  const seen = new Set([entryKey]);
  for (const key of Object.keys(subgraph)) {
    if (key !== entryKey && !seen.has(key)) { participants.push(key); seen.add(key); }
  }
  for (const p of participants) {
    lines.push("    participant " + p.replace(/[^a-zA-Z0-9_]/g, "_") + " as " + shortName(p));
  }
  for (const [key, node] of Object.entries(subgraph)) {
    const fromId = key.replace(/[^a-zA-Z0-9_]/g, "_");
    for (const callee of node.callees || []) {
      if (inGraph.has(callee) && callee !== key) {
        lines.push("    " + fromId + "->>+" + callee.replace(/[^a-zA-Z0-9_]/g, "_") + ": " + shortName(callee));
        lines.push("    " + callee.replace(/[^a-zA-Z0-9_]/g, "_") + "-->>-" + fromId + ": ok");
      }
    }
  }
  return lines.join("\\n");
}

function selectNode(key) {
  const node = GRAPH[key];
  if (!node) return;

  cy.nodes().removeClass("selected");
  const cyId = key.replace(/[^a-zA-Z0-9_]/g, "_");
  const cyNode = cy.getElementById(cyId);
  if (cyNode.length) cyNode.addClass("selected");

  document.getElementById("sel-name").textContent = shortName(key);
  const fname = (node.filepath || "").replace(REPO_PATH + "/", "");
  document.getElementById("sel-file").innerHTML = 'File: <a href="file://' + escapeHtml(node.filepath) + '">' + escapeHtml(fname) + '</a>';
  document.getElementById("sel-line").textContent = "Line: " + (node.lineno ?? "?");
  document.getElementById("sel-calls").textContent = "Calls: " + (node.callees || []).length;

  // Callees list
  const calleesUl = document.getElementById("sel-callees");
  calleesUl.innerHTML = "";
  const inGraph = Object.keys(GRAPH);
  for (const callee of node.callees || []) {
    const li = document.createElement("li");
    li.textContent = shortName(callee);
    if (inGraph.includes(callee)) {
      li.onclick = () => selectNode(callee);
    } else {
      li.classList.add("external");
    }
    calleesUl.appendChild(li);
  }

  // Callers list
  const callersUl = document.getElementById("sel-callers");
  callersUl.innerHTML = "";
  const callers = findCallers(key);
  for (const caller of callers) {
    const li = document.createElement("li");
    li.textContent = shortName(caller);
    li.onclick = () => selectNode(caller);
    callersUl.appendChild(li);
  }

  // Mermaid preview of subgraph
  const subgraph = buildSubgraph(key);
  renderMermaid(subgraph, key);
}

// Toolbar handlers
document.getElementById("search").addEventListener("input", function() {
  const text = this.value;
  cy.elements().remove();
  cy.add(buildElements(currentDepth, text));
  cy.layout({ name: "cose", animate: false, nodeRepulsion: 10000, idealEdgeLength: 100, nodeDimensionsIncludeLabels: true }).run();
});

document.getElementById("depth").addEventListener("input", function() {
  currentDepth = parseInt(this.value);
  document.getElementById("depth-val").textContent = currentDepth;
});

document.getElementById("diagram-type").addEventListener("change", function() {
  const sel = cy.nodes(".selected");
  if (sel.length) {
    const key = sel.first().data("key");
    renderMermaid(buildSubgraph(key), key);
  }
});

document.getElementById("recenter").addEventListener("click", function() {
  cy.layout({ name: "cose", animate: true, nodeRepulsion: 10000, idealEdgeLength: 100, nodeDimensionsIncludeLabels: true }).run();
  cy.fit(undefined, 50);
});

// Init
document.addEventListener("DOMContentLoaded", function() {
  initCytoscape();
  document.getElementById("loading").style.display = "none";

  // Auto-select the initial function if provided, else select the first node
  if (INITIAL_FN) {
    // Find a key ending with .<INITIAL_FN>
    const match = Object.keys(GRAPH).find(k => k.endsWith("." + INITIAL_FN));
    if (match) {
      selectNode(match);
      cy.getElementById(match.replace(/[^a-zA-Z0-9_]/g, "_")).select();
      cy.center(cy.getElementById(match.replace(/[^a-zA-Z0-9_]/g, "_")));
    }
  } else if (Object.keys(GRAPH).length > 0) {
    selectNode(Object.keys(GRAPH)[0]);
  }
});
</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
