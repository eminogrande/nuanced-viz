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
  #filters { display: flex; gap: 6px; align-items: center; padding: 4px 12px; background: #141428; border-bottom: 1px solid #333; flex-shrink: 0; }
  #filters .filter-label { color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-right: 4px; }
  #filters label { color: #aaa; font-size: 12px; cursor: pointer; padding: 2px 8px; border-radius: 3px; border: 1px solid #333; user-select: none; }
  #filters label.active { background: #2a4a8e; color: #fff; border-color: #4a6abe; }
  #filters label.disabled { opacity: 0.4; }
  #sidebar-tabs { display: flex; border-bottom: 1px solid #333; flex-shrink: 0; }
  #sidebar-tabs button { flex: 1; padding: 8px; background: #141428; border: none; color: #888; cursor: pointer; font-size: 13px; border-bottom: 2px solid transparent; }
  #sidebar-tabs button.active { color: #fff; border-bottom-color: #4CAF50; background: #1a1a2e; }
  .tab-content { display: none; }
  .tab-content.active { display: block; }
  #index-list { font-size: 12px; }
  #index-list .file-group { margin-bottom: 2px; }
  #index-list .file-header { color: #6db4ff; font-size: 11px; cursor: pointer; padding: 3px 4px; border-radius: 3px; font-family: monospace; word-break: break-all; display: flex; align-items: center; gap: 4px; }
  #index-list .file-header:hover { background: #2a2a4e; }
  #index-list .file-header .toggle { font-size: 10px; width: 12px; display: inline-block; }
  #index-list .file-header .file-check { cursor: pointer; font-size: 14px; width: 16px; flex-shrink: 0; }
  #index-list .file-header .file-check:hover { color: #fff; }
  #index-list .file-header .file-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #index-list .fn-item { color: #aaa; cursor: pointer; padding: 2px 4px 2px 20px; border-radius: 3px; font-size: 12px; display: flex; align-items: center; gap: 4px; }
  #index-list .fn-item:hover { background: #2a2a4e; color: #fff; }
  #index-list .fn-item .fn-check { cursor: pointer; font-size: 14px; width: 14px; flex-shrink: 0; }
  #index-list .fn-item .fn-check:hover { color: #fff; }
  #index-list .fn-item .fn-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #index-list .fn-item.unchecked .fn-name { text-decoration: line-through; opacity: 0.5; }
  #index-list .fn-item.unchecked { cursor: default; }
  .mermaid-warning { color: #e8a847; font-size: 12px; margin-top: 4px; }
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
<div id="filters">
  <span class="filter-label">Show:</span>
  <div id="filter-pills" style="display:flex;gap:6px;flex-wrap:wrap;"></div>
</div>
<div id="main">
  <div id="cy"></div>
  <div id="sidebar">
    <div id="sidebar-tabs">
      <button id="tab-index" class="active">Function Index</button>
      <button id="tab-details">Details</button>
    </div>
    <div id="tab-index-content" class="tab-content active">
      <div id="legend" style="display:flex;flex-wrap:wrap;gap:6px;padding:4px 0 8px;border-bottom:1px solid #333;margin-bottom:8px;"></div>
      <div id="index-list"></div>
    </div>
    <div id="tab-details-content" class="tab-content">
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
</div>
<div id="loading">Building graph...</div>

<script>
const GRAPH = ${graphJson};
const INITIAL_FN = ${initialFnJson};
const REPO_PATH = ${JSON.stringify(repoPath)};

// Build cytoscape elements for a neighborhood (bidirectional BFS from entryKey).
// Renders only the selected node + N hops of callees and callers, not the
// entire graph. The full GRAPH stays in JS memory; cytoscape only renders
// the neighborhood. This prevents the browser from hanging on large graphs.
const MAX_NODES = 300; // cap to prevent browser hang on hub functions

// Auto-derive categories from the repo's directory structure + function naming
// patterns. This is generalized so the tool works on any codebase, not just
// nuri-expo. Categories are built at init time from the actual graph data.
//
// How groups are derived:
// 1. Top-level source dirs (e.g. "services", "lib", "components") become groups.
// 2. Second-level dirs (e.g. "services/bitcoin", "services/gnosis") become
//    sub-groups if they have enough functions (>= 3), otherwise they merge
//    into the parent.
// 3. Generic patterns (setters, builtins, anonymous) are always detected.
// 4. Everything that doesn't match a pattern falls into "other".

let derivedCategories = {};  // cat name -> function(key) => boolean
let derivedCategoryList = []; // ordered list of category names for display
let visibleCategories = {};   // cat name -> boolean
let categoryColors = {};     // cat name -> { bg, border }

// Distinct color palette for groups. Cycled through as groups are discovered.
const COLOR_PALETTE = [
  { bg: "#2E86C1", border: "#5DADE2" },  // blue
  { bg: "#B8860B", border: "#FFD700" },  // gold
  { bg: "#C0392B", border: "#E74C3C" },  // red
  { bg: "#E67E22", border: "#F39C12" },  // orange
  { bg: "#8A2BE2", border: "#BA55D3" },  // purple
  { bg: "#1ABC9C", border: "#16A085" },  // teal
  { bg: "#008B8B", border: "#48D1CC" },  // cyan
  { bg: "#DAA520", border: "#F0E68C" },  // goldenrod
  { bg: "#DC143C", border: "#FF69B4" },  // crimson
  { bg: "#228B22", border: "#32CD32" },  // forest green
  { bg: "#4B0082", border: "#9370DB" },  // indigo
  { bg: "#FF4500", border: "#FF7F50" },  // orange-red
  { bg: "#2F4F4F", border: "#778899" },  // dark slate
  { bg: "#8B008B", border: "#DDA0DD" },  // dark magenta
  { bg: "#556B2F", border: "#9ACD32" },  // olive
  { bg: "#CD853F", border: "#DEB887" },  // peru
  { bg: "#1C5D99", border: "#4A90D9" },  // deep blue
  { bg: "#6B3FA0", border: "#A17FD3" },  // royal purple
  { bg: "#0D6E6E", border: "#3CB371" },  // dark teal-green
  { bg: "#B5651D", border: "#D2A679" },  // copper
];

// Fixed colors for generic categories that exist on every codebase.
const FIXED_COLORS = {
  builtins: { bg: "#4A4A4A", border: "#6A6A6A" },
  setters:  { bg: "#556B2F", border: "#9ACD32" },
  anon:     { bg: "#333333", border: "#555555" },
  other:    { bg: "#2a4a8e", border: "#5A7FCC" },
};

function isAnonymous(key) {
  const name = key.split(".").pop() || key;
  return name === "<anonymous>" || name.startsWith("<anonymous>__");
}

function isBuiltin(key) {
  const n = key.split(".").pop() || key;
  return ["filter","map","some","every","includes","push","slice","splice","join",
    "split","replace","trim","toLowerCase","toUpperCase","startsWith","endsWith",
    "find","findIndex","forEach","reduce","sort","keys","values","entries",
    "has","add","delete","set","get","from","of","isArray","isInteger","isFinite",
    "isNaN","parseInt","parseFloat","String","Number","Boolean","Object","Array",
    "Promise","Date","Math","JSON","Error","RegExp","Map","Set","Symbol",
    "max","min","round","floor","ceil","abs","pow","sqrt",
    "now","getTime","toString","valueOf","bind","call","apply","then","catch",
    "all","race","resolve","reject","parse","stringify","text","json","blob",
    "setTimeout","clearTimeout","setInterval","clearInterval","console","print",
    "isSafeInteger","BigInt","encodeURIComponent","decodeURIComponent",
    "fromEntries","assign","freeze","create","defineProperty",
    "log","warn","error","info","debug"].includes(n);
}

function isSetter(key) {
  const n = (key.split(".").pop() || "");
  return n.startsWith("set") && n.length > 3 && n[3] === n[3].toUpperCase();
}

// Build categories from the actual graph data by analyzing directory structure.
function deriveCategories() {
  // Collect all relative file paths
  const files = new Set();
  for (const [key, node] of Object.entries(GRAPH)) {
    const rel = (node.filepath || "").replace(REPO_PATH + "/", "");
    if (rel) files.add(rel);
  }

  // Group by the first 1-2 path segments. E.g. "services/bitcoin/..." -> "services/bitcoin"
  // but "lib/featureFlags.ts" -> "lib". If a top-level dir has < 3 files, merge into parent.
  const dirGroups = new Map(); // group name -> Set of file paths
  const topLevelCounts = new Map(); // top-level dir -> file count

  for (const file of files) {
    const parts = file.split("/");
    if (parts.length <= 1) {
      // Root-level file, group as "root"
      if (!dirGroups.has("root")) dirGroups.set("root", new Set());
      dirGroups.get("root").add(file);
      continue;
    }
    const topLevel = parts[0];
    topLevelCounts.set(topLevel, (topLevelCounts.get(topLevel) || 0) + 1);

    // Use 2-level grouping for directories with many files
    if (parts.length >= 3) {
      const twoLevel = parts[0] + "/" + parts[1];
      if (!dirGroups.has(twoLevel)) dirGroups.set(twoLevel, new Set());
      dirGroups.get(twoLevel).add(file);
    } else {
      if (!dirGroups.has(topLevel)) dirGroups.set(topLevel, new Set());
      dirGroups.get(topLevel).add(file);
    }
  }

  // Merge sparse 2-level groups back into their parent
  const merged = new Map();
  const groupFileSets = new Map(); // group -> Set of actual file paths
  for (const [group, groupFiles] of dirGroups) {
    if (group.includes("/") && groupFiles.size < 3) {
      const parent = group.split("/")[0];
      if (!merged.has(parent)) {
        merged.set(parent, new Set());
        groupFileSets.set(parent, new Set());
      }
      for (const f of groupFiles) {
        merged.get(parent).add(f);
        groupFileSets.get(parent).add(f);
      }
    } else {
      merged.set(group, groupFiles);
      groupFileSets.set(group, groupFiles);
    }
  }

  // Build category matchers: a function belongs to a group if its file is in that group.
  const orderedGroups = [...merged.keys()].sort();
  derivedCategoryList = [];
  let colorIdx = 0;

  for (const group of orderedGroups) {
    if (group === "root") continue; // skip root-level catch-all
    const groupFiles = merged.get(group);
    // Pre-compute the set of relative file paths for this group for fast lookup
    const fileSet = new Set(groupFiles);
    derivedCategories[group] = function(key) {
      const node = GRAPH[key];
      if (!node) return false;
      const rel = (node.filepath || "").replace(REPO_PATH + "/", "");
      return fileSet.has(rel);
    };
    // Check if any function in this group is not a builtin/setter/anon
    let hasReal = false;
    for (const key of Object.keys(GRAPH)) {
      if (derivedCategories[group](key) && !isBuiltin(key) && !isSetter(key) && !isAnonymous(key)) {
        hasReal = true;
        break;
      }
    }
    if (!hasReal) {
      delete derivedCategories[group];
      continue;
    }
    derivedCategoryList.push(group);
    categoryColors[group] = COLOR_PALETTE[colorIdx % COLOR_PALETTE.length];
    colorIdx++;
  }

  // Add generic categories (always present)
  derivedCategories.setters = isSetter;
  derivedCategories.builtins = isBuiltin;
  derivedCategories.anon = isAnonymous;
  derivedCategoryList.push("setters", "builtins", "anon");
  categoryColors.setters = FIXED_COLORS.setters;
  categoryColors.builtins = FIXED_COLORS.builtins;
  categoryColors.anon = FIXED_COLORS.anon;
  categoryColors.other = FIXED_COLORS.other;

  // Initialize all as visible (except anon which is off by default)
  for (const cat of derivedCategoryList) {
    visibleCategories[cat] = cat !== "anon";
  }
}

// User-unchecked files and functions from the index tab.
// These remove nodes from the graph only; the index list keeps them
// (greyed out) so users can toggle them back on.
const hiddenFiles = new Set();   // relative file paths
const hiddenFunctions = new Set(); // graph keys

function isHidden(key) {
  if (hiddenFunctions.has(key)) return true;
  const node = GRAPH[key];
  if (node) {
    const relFile = (node.filepath || "").replace(REPO_PATH + "/", "");
    if (hiddenFiles.has(relFile)) return true;
  }
  for (const [cat, visible] of Object.entries(visibleCategories)) {
    if (!visible && derivedCategories[cat] && derivedCategories[cat](key)) return true;
  }
  if (!visibleCategories.anon && isAnonymous(key)) return true;
  return false;
}

function getCategory(key) {
  if (isAnonymous(key)) return "anon";
  for (const cat of derivedCategoryList) {
    if (cat === "setters" || cat === "builtins" || cat === "anon") continue;
    if (derivedCategories[cat] && derivedCategories[cat](key)) return cat;
  }
  if (isSetter(key)) return "setters";
  if (isBuiltin(key)) return "builtins";
  return "other";
}

function buildNeighborhood(entryKey, depth, filterText) {
  const filter = filterText ? filterText.toLowerCase() : null;
  const elements = [];
  const seen = new Set();

  // If filtering, find all matching nodes and their immediate neighbors
  if (filter) {
    for (const [key, node] of Object.entries(GRAPH)) {
      if (!key.toLowerCase().includes(filter)) continue;
      if (isHidden(key)) continue;
      if (seen.size >= MAX_NODES) break;
      addNode(elements, seen, key, node);
      for (const callee of node.callees || []) {
        if (seen.size >= MAX_NODES) break;
        if (GRAPH[callee] && !seen.has(callee) && !isHidden(callee)) {
          addNode(elements, seen, callee, GRAPH[callee]);
        }
      }
    }
    addEdges(elements, seen);
    return elements;
  }

  // No filter: bidirectional BFS from entryKey (skip hidden, except entryKey itself)
  if (!GRAPH[entryKey]) return elements;
  addNode(elements, seen, entryKey, GRAPH[entryKey]);

  const queue = [{ key: entryKey, depth: 0 }];
  while (queue.length > 0 && seen.size < MAX_NODES) {
    const { key, d } = queue.shift();
    if (d >= depth) continue;
    const node = GRAPH[key];
    if (!node) continue;
    for (const callee of node.callees || []) {
      if (seen.size >= MAX_NODES) break;
      if (!seen.has(callee) && GRAPH[callee] && (!isHidden(callee) || callee === entryKey)) {
        addNode(elements, seen, callee, GRAPH[callee]);
        queue.push({ key: callee, depth: d + 1 });
      }
    }
    const callers = findCallers(key);
    for (const caller of callers) {
      if (seen.size >= MAX_NODES) break;
      if (!seen.has(caller) && GRAPH[caller] && (!isHidden(caller) || caller === entryKey)) {
        addNode(elements, seen, caller, GRAPH[caller]);
        queue.push({ key: caller, depth: d + 1 });
      }
    }
  }

  addEdges(elements, seen);
  return elements;
}

function addNode(elements, seen, key, node) {
  if (seen.has(key)) return;
  seen.add(key);
  const id = key.replace(/[^a-zA-Z0-9_]/g, "_");
  const name = key.split(".").pop() || key;
  const callCount = (node.callees || []).length;
  const cat = getCategory(key);
  const catClass = cat.replace(/[^a-zA-Z0-9_]/g, "_");
  elements.push({
    data: { id, label: name, key, filepath: node.filepath || "", lineno: node.lineno, callees: node.callees || [], callCount, category: cat },
    classes: catClass + ((node.callees || []).length === 0 ? " leaf" : "")
  });
}

function addEdges(elements, seen) {
  for (const key of seen) {
    const node = GRAPH[key];
    if (!node) continue;
    const fromId = key.replace(/[^a-zA-Z0-9_]/g, "_");
    for (const callee of node.callees || []) {
      if (seen.has(callee) && callee !== key) {
        elements.push({ data: { source: fromId, target: callee.replace(/[^a-zA-Z0-9_]/g, "_") } });
      }
    }
  }
}

let cy;
let currentDepth = 3;
let selectedKey = null;

function buildCytoscapeStyle() {
  const style = [
    { selector: "node", style: {
      "label": "data(label)", "text-valign": "center", "text-halign": "center",
      "color": "#ddd", "font-size": "8px", "background-color": "#2a4a8e",
      "width": "mapData(callCount, 0, 80, 14, 36)", "height": "mapData(callCount, 0, 80, 14, 36)",
      "border-width": 2, "border-color": "#3a5a9e", "text-wrap": "wrap", "text-max-width": "80px",
      "text-overflow": "ellipsis"
    }},
    { selector: "node.leaf", style: { "opacity": 0.7 }},
    { selector: "node:selected", style: { "background-color": "#4CAF50", "border-color": "#fff", "border-width": 4 }},
    { selector: "node.highlighted", style: { "border-color": "#FFD700", "border-width": 4, "z-index": 999, "opacity": 1 }},
    { selector: "node.faded", style: { "opacity": 0.12 }},
    { selector: "edge", style: {
      "curve-style": "bezier", "target-arrow-shape": "triangle",
      "arrow-color": "#7799cc", "line-color": "#5577aa", "width": 2, "opacity": 0.7
    }},
    { selector: "edge:selected", style: { "line-color": "#4CAF50", "arrow-color": "#4CAF50", "width": 3, "opacity": 1 }},
    { selector: "edge.highlighted", style: { "line-color": "#FFD700", "arrow-color": "#FFD700", "width": 3, "opacity": 1 }},
    { selector: "edge.faded", style: { "opacity": 0.04 }}
  ];
  // Add per-category color styles from the derived categories
  for (const cat of derivedCategoryList) {
    const colors = categoryColors[cat] || categoryColors.other;
    // CSS class name: sanitize cat (replace / with _)
    const cls = cat.replace(/[^a-zA-Z0-9_]/g, "_");
    style.push({ selector: "node." + cls, style: { "background-color": colors.bg, "border-color": colors.border }});
  }
  // "other" category (functions not matching any group)
  style.push({ selector: "node.other", style: { "background-color": categoryColors.other.bg, "border-color": categoryColors.other.border }});
  return style;
}

// Layout: custom positioning that groups nodes by category. Functions in the
// same category (same source directory) are placed near each other in a
// sector of the graph. The selected node is at the center, with its
// neighborhood arranged around it grouped by category.
const LAYOUT_CONFIG = {
  name: "concentric",
  animate: false,
  padding: 40,
  fit: true,
  concentric: function(n) { return (n.data("callCount") || 0) + 1; },
  levelWidth: function() { return 3; },
  minNodeSpacing: 20,
};

// Fallback: grid layout if concentric fails.
const FALLBACK_CONFIG = {
  name: "grid",
  animate: false,
  padding: 40,
  fit: true,
  spacingFactor: 1.2,
};

// Custom layout: position nodes grouped by category in spatial clusters.
// Each category gets a region of the canvas; nodes within a category are
// arranged in a grid pattern with generous spacing. Categories with more
// nodes get proportionally larger regions.
function applyGroupedLayout() {
  const nodes = cy.nodes();
  if (nodes.length === 0) return;

  // Group nodes by category
  const catGroups = new Map();
  for (const n of nodes) {
    const cat = n.data("category") || "other";
    if (!catGroups.has(cat)) catGroups.set(cat, []);
    catGroups.get(cat).push(n);
  }

  // Sort categories by size (largest first)
  const sortedCats = [...catGroups.entries()].sort((a, b) => b[1].length - a[1].length);
  const totalNodes = nodes.length;

  // Use a virtual canvas much larger than the real one so nodes have room.
  // The cy.fit() at the end will zoom to fit everything.
  const nodeSpacing = 55; // pixels between node centers
  const padding = 80;

  // Calculate how many rows/columns each category needs, then size the
  // virtual canvas to fit all categories side by side.
  let totalWidth = padding;
  let maxRows = 1;

  const catLayouts = [];
  for (const [cat, groupNodes] of sortedCats) {
    // Sort by call count (highest first = top-left)
    groupNodes.sort((a, b) => (b.data("callCount") || 0) - (a.data("callCount") || 0));
    const count = groupNodes.length;

    // Aim for roughly square blocks: cols ~ sqrt(count)
    // But prefer wider blocks (more cols) to avoid tall narrow stacks
    const cols = Math.max(1, Math.ceil(Math.sqrt(count * 1.5)));
    const rows = Math.ceil(count / cols);
    const blockW = cols * nodeSpacing + 40;
    const blockH = rows * nodeSpacing + 40;

    catLayouts.push({ cat, groupNodes, cols, rows, blockW, blockH });
    totalWidth += blockW + 30;
    maxRows = Math.max(maxRows, rows);
  }

  const virtualH = maxRows * nodeSpacing + padding * 2;

  // Place categories left to right, each as a vertical block
  let xOffset = padding;
  for (const cl of catLayouts) {
    const startX = xOffset;
    const startY = padding;

    for (let i = 0; i < cl.groupNodes.length; i++) {
      const n = cl.groupNodes[i];
      const r = Math.floor(i / cl.cols);
      const c = i % cl.cols;
      n.position({
        x: startX + c * nodeSpacing,
        y: startY + r * nodeSpacing
      });
    }
    xOffset += cl.blockW + 30;
  }

  cy.fit(undefined, 50);
}

function runLayout() {
  try {
    // Try concentric first, then apply grouped positioning on top
    cy.layout(LAYOUT_CONFIG).run();
    applyGroupedLayout();
  } catch(e) {
    console.warn("layout failed, using grid:", e.message);
    try {
      cy.layout(FALLBACK_CONFIG).run();
      applyGroupedLayout();
    } catch(e2) {
      console.warn("grid also failed:", e2.message);
    }
  }
}

function initCytoscape() {
  cy = cytoscape({
    container: document.getElementById("cy"),
    elements: [],
    style: buildCytoscapeStyle(),
    layout: { name: "null" },
    wheelSensitivity: 0.2,
  });

  cy.on("tap", "node", function(evt) {
    selectNode(evt.target.data("key"));
  });

  // Hover on canvas nodes: highlight node + connected edges, fade everything else
  cy.on("mouseover", "node", function(evt) {
    highlightNode(evt.target.data("key"));
  });
  cy.on("mouseout", "node", function() {
    clearHighlight();
  });
}

function refreshCytoscape() {
  const search = document.getElementById("search").value;
  const elements = search
    ? buildNeighborhood(null, currentDepth, search)
    : buildNeighborhood(selectedKey, currentDepth, "");

  // Destroy and recreate cytoscape to avoid the stale-edge bug.
  cy.destroy();
  cy = cytoscape({
    container: document.getElementById("cy"),
    elements: elements,
    style: buildCytoscapeStyle(),
    // Use null layout (no auto-positioning); we position nodes ourselves
    layout: { name: "null" },
    wheelSensitivity: 0.2,
  });
  cy.on("tap", "node", function(evt) {
    selectNode(evt.target.data("key"));
  });
  cy.on("mouseover", "node", function(evt) {
    highlightNode(evt.target.data("key"));
  });
  cy.on("mouseout", "node", function() {
    clearHighlight();
  });

  // Apply grouped layout: positions nodes by category in sectors
  applyGroupedLayout();

  // Re-select the currently selected node
  if (selectedKey) {
    const cyId = selectedKey.replace(/[^a-zA-Z0-9_]/g, "_");
    const n = cy.getElementById(cyId);
    if (n.length) {
      n.addClass("selected");
      n.connectedEdges().addClass("selected");
      cy.center(n);
    }
  }
}

// Highlight a node + its connected edges, fade everything else.
// Works for both canvas hover and side panel hover.
function highlightNode(key) {
  const cyId = key.replace(/[^a-zA-Z0-9_]/g, "_");
  const n = cy.getElementById(cyId);
  if (!n.length) return;

  // Clear previous highlights
  cy.nodes().removeClass("highlighted faded");
  cy.edges().removeClass("highlighted faded");

  // Highlight the node and its connected edges
  n.addClass("highlighted");
  const connectedEdges = n.connectedEdges();
  connectedEdges.addClass("highlighted");

  // Highlight the neighbors connected by those edges
  const neighbors = connectedEdges.connectedNodes().not(n);
  neighbors.addClass("highlighted");

  // Fade everything that's not highlighted
  cy.nodes().not(n).not(neighbors).addClass("faded");
  cy.edges().not(connectedEdges).addClass("faded");
}

function clearHighlight() {
  cy.nodes().removeClass("highlighted faded");
  cy.edges().removeClass("highlighted faded");
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
  const allKeys = Object.keys(subgraph);
  const MERMAID_MAX_NODES = 50;

  let truncated = false;
  let renderGraph = subgraph;
  if (allKeys.length > MERMAID_MAX_NODES) {
    // Truncate: keep entrypoint + first N-1 callees by BFS order
    truncated = true;
    const kept = new Set([entryKey]);
    const queue = [entryKey];
    while (queue.length > 0 && kept.size < MERMAID_MAX_NODES) {
      const k = queue.shift();
      const node = subgraph[k];
      if (!node) continue;
      for (const c of node.callees || []) {
        if (kept.size >= MERMAID_MAX_NODES) break;
        if (subgraph[c] && !kept.has(c)) { kept.add(c); queue.push(c); }
      }
    }
    renderGraph = {};
    for (const k of kept) renderGraph[k] = subgraph[k];
  }

  const mermaidText = type === "sequence"
    ? toSequenceJs(renderGraph, entryKey)
    : toFlowchartJs(renderGraph, entryKey);

  const out = document.getElementById("mermaid-output");
  const nodeCount = allKeys.length;
  const shown = Object.keys(renderGraph).length;
  document.getElementById("mermaid-nodes").textContent = "(" + shown + (truncated ? "/" + nodeCount : "") + " nodes)";

  if (!mermaidInitialized) {
    mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "loose" });
    mermaidInitialized = true;
  }
  try {
    // Mermaid v11 requires a unique render ID each call
    const renderId = "m" + Date.now();
    const { svg } = await mermaid.render(renderId, mermaidText);
    let html = svg;
    if (truncated) {
      html = '<div class="mermaid-warning">Showing ' + shown + ' of ' + nodeCount + ' nodes (capped for readability). Increase depth to explore further.</div>' + html;
    }
    out.innerHTML = html;
  } catch(e) {
    out.textContent = "Mermaid error: " + (e.message || e);
  }
}

// Client-side mermaid generation (mirrors src/mermaid.ts)
// Node IDs are prefixed with n_ to avoid Mermaid syntax errors when
// function keys start with digits or contain only underscores.
function mId(key) { return "n_" + key.replace(/[^a-zA-Z0-9_]/g, "_"); }

function toFlowchartJs(subgraph, entryKey) {
  const lines = ["graph TD"];
  const inGraph = new Set(Object.keys(subgraph));
  const eId = mId(entryKey);
  lines.push("    " + eId + '["' + shortName(entryKey) + '"]');
  for (const [key] of Object.entries(subgraph)) {
    if (key === entryKey) continue;
    lines.push("    " + mId(key) + '["' + shortName(key) + '"]');
  }
  for (const [key, node] of Object.entries(subgraph)) {
    const fromId = mId(key);
    for (const callee of node.callees || []) {
      if (inGraph.has(callee) && callee !== key) {
        lines.push("    " + fromId + " --> " + mId(callee));
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
    lines.push("    participant " + mId(p) + " as " + shortName(p));
  }
  for (const [key, node] of Object.entries(subgraph)) {
    const fromId = mId(key);
    for (const callee of node.callees || []) {
      if (inGraph.has(callee) && callee !== key) {
        const toId = mId(callee);
        lines.push("    " + fromId + "->>+" + toId + ": " + shortName(callee));
        lines.push("    " + toId + "-->>-" + fromId + ": ok");
      }
    }
  }
  return lines.join("\\n");
}

function selectNode(key) {
  const node = GRAPH[key];
  if (!node) return;

  selectedKey = key;
  cy.nodes().removeClass("selected");
  cy.edges().removeClass("selected");
  const cyId = key.replace(/[^a-zA-Z0-9_]/g, "_");
  const cyNode = cy.getElementById(cyId);
  if (cyNode.length) {
    cyNode.addClass("selected");
    // Highlight edges connecting to this node
    cyNode.connectedEdges().addClass("selected");
  }

  document.getElementById("sel-name").textContent = shortName(key);
  const fname = (node.filepath || "").replace(REPO_PATH + "/", "");
  document.getElementById("sel-file").innerHTML = 'File: <a href="file://' + escapeHtml(node.filepath) + '">' + escapeHtml(fname) + '</a>';
  document.getElementById("sel-line").textContent = "Line: " + (node.lineno ?? "?");
  document.getElementById("sel-calls").textContent = "Calls: " + (node.callees || []).length;

  // Callees list
  const calleesUl = document.getElementById("sel-callees");
  calleesUl.innerHTML = "";
  const inGraph = Object.keys(GRAPH);
  let calleeCount = 0;
  let hiddenCalleeCount = 0;
  for (const callee of node.callees || []) {
    if (isHidden(callee)) { hiddenCalleeCount++; continue; }
    const li = document.createElement("li");
    li.textContent = shortName(callee);
    if (inGraph.includes(callee)) {
      li.onclick = () => selectNode(callee);
      li.onmouseenter = () => highlightNode(callee);
      li.onmouseleave = () => clearHighlight();
    } else {
      li.classList.add("external");
    }
    calleesUl.appendChild(li);
    calleeCount++;
  }
  if (hiddenCalleeCount > 0) {
    const li = document.createElement("li");
    li.classList.add("external");
    li.textContent = "(" + hiddenCalleeCount + " hidden)";
    calleesUl.appendChild(li);
  }

  // Callers list
  const callersUl = document.getElementById("sel-callers");
  callersUl.innerHTML = "";
  const callers = findCallers(key);
  for (const caller of callers) {
    if (isHidden(caller)) continue;
    const li = document.createElement("li");
    li.textContent = shortName(caller);
    li.onclick = () => selectNode(caller);
    li.onmouseenter = () => highlightNode(caller);
    li.onmouseleave = () => clearHighlight();
    callersUl.appendChild(li);
  }

  // Mermaid preview of subgraph
  const subgraph = buildSubgraph(key);
  renderMermaid(subgraph, key);

  // Refresh cytoscape to show the neighborhood around the selected node
  refreshCytoscape();
}

// Toolbar handlers
document.getElementById("search").addEventListener("input", function() {
  // If on index tab, filter the index list; otherwise refresh cytoscape
  const indexActive = document.getElementById("tab-index").classList.contains("active");
  if (indexActive) {
    filterIndex(this.value);
  } else {
    refreshCytoscape();
  }
});

// Filter the function index by search text
function filterIndex(text) {
  const lower = text ? text.toLowerCase() : null;
  const groups = document.querySelectorAll("#index-list .file-group");
  for (const group of groups) {
    let visible = 0;
    const items = group.querySelectorAll(".fn-item");
    for (const item of items) {
      const match = !lower || item.textContent.toLowerCase().includes(lower)
        || (item.dataset.key || "").toLowerCase().includes(lower);
      item.style.display = match ? "block" : "none";
      if (match) visible++;
    }
    group.style.display = visible > 0 ? "block" : "none";
    // Update header to show filtered count
    const header = group.querySelector(".file-header");
    if (header) {
      const baseText = header.textContent.replace(/ \(\d+\)$/, "");
      header.textContent = baseText + " (" + visible + ")";
    }
  }
}

document.getElementById("depth").addEventListener("input", function() {
  currentDepth = parseInt(this.value);
  document.getElementById("depth-val").textContent = currentDepth;
  refreshCytoscape();
});

document.getElementById("diagram-type").addEventListener("change", function() {
  const sel = cy.nodes(".selected");
  if (sel.length) {
    const key = sel.first().data("key");
    renderMermaid(buildSubgraph(key), key);
  }
});

document.getElementById("recenter").addEventListener("click", function() {
  applyGroupedLayout();
});

// Build filter pills dynamically from derived categories
function buildFilterPills() {
  const container = document.getElementById("filter-pills");
  if (!container) return;
  container.innerHTML = "";
  for (const cat of derivedCategoryList) {
    const label = document.createElement("label");
    label.id = "flt-" + cat.replace(/[^a-zA-Z0-9_]/g, "_");
    const isActive = visibleCategories[cat];
    label.className = isActive ? "active" : "disabled";
    // Display name: capitalize, replace _ with space, shorten long dir paths
    const displayName = cat.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    label.textContent = displayName;
    label.style.cssText = "color:" + (isActive ? "#fff" : "#aaa") + ";";
    if (isActive) label.style.background = categoryColors[cat] ? categoryColors[cat].bg : "#2a4a8e";
    label.addEventListener("click", function() {
      visibleCategories[cat] = !visibleCategories[cat];
      label.classList.toggle("active", visibleCategories[cat]);
      label.classList.toggle("disabled", !visibleCategories[cat]);
      label.style.background = visibleCategories[cat] ? (categoryColors[cat] ? categoryColors[cat].bg : "#2a4a8e") : "";
      label.style.color = visibleCategories[cat] ? "#fff" : "#aaa";
      // Rerender the graph with layout
      if (selectedKey && !isHidden(selectedKey)) {
        selectNode(selectedKey);
      } else {
        refreshCytoscape();
      }
    });
    container.appendChild(label);
  }
}

// Build a color legend in the sidebar showing each category + its color
function buildLegend() {
  const container = document.getElementById("legend");
  if (!container) return;
  container.innerHTML = "";
  for (const cat of derivedCategoryList) {
    const colors = categoryColors[cat] || categoryColors.other;
    const displayName = cat.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const item = document.createElement("span");
    item.style.cssText = "display:inline-flex;align-items:center;gap:3px;font-size:11px;color:#aaa;cursor:pointer;";
    const dot = document.createElement("span");
    dot.style.cssText = "display:inline-block;width:10px;height:10px;border-radius:50%;background:" + colors.bg + ";";
    item.appendChild(dot);
    item.appendChild(document.createTextNode(displayName));
    item.onclick = function() {
      const pill = document.getElementById("flt-" + cat.replace(/[^a-zA-Z0-9_]/g, "_"));
      if (pill) pill.click();
    };
    container.appendChild(item);
  }
  // "Other" legend item
  const otherItem = document.createElement("span");
  otherItem.style.cssText = "display:inline-flex;align-items:center;gap:3px;font-size:11px;color:#aaa;";
  const otherDot = document.createElement("span");
  otherDot.style.cssText = "display:inline-block;width:10px;height:10px;border-radius:50%;background:" + categoryColors.other.bg + ";";
  otherItem.appendChild(otherDot);
  otherItem.appendChild(document.createTextNode("Other"));
  container.appendChild(otherItem);
}

// Build the function index: ALL functions grouped by file, collapsible.
// Shows every function regardless of hidden state (greyed out if hidden)
// so users can toggle visibility back on. Toggling only affects the graph
// and side panel, not the index list itself.
function buildIndex() {
  const container = document.getElementById("index-list");
  container.innerHTML = "";

  // Group by file - include ALL functions, even hidden ones
  const byFile = new Map();
  for (const [key, node] of Object.entries(GRAPH)) {
    if (isAnonymous(key) && !visibleCategories.anon) continue;
    const fp = (node.filepath || "").replace(REPO_PATH + "/", "");
    if (!byFile.has(fp)) byFile.set(fp, []);
    byFile.get(fp).push(key);
  }

  // Sort files alphabetically, functions within by name
  const sortedFiles = [...byFile.keys()].sort();
  for (const file of sortedFiles) {
    const fns = byFile.get(file).sort((a, b) => shortName(a).localeCompare(shortName(b)));
    const fileIsHidden = hiddenFiles.has(file);

    const group = document.createElement("div");
    group.className = "file-group" + (fileIsHidden ? " unchecked" : "");
    group.dataset.file = file;

    const header = document.createElement("div");
    header.className = "file-header";

    const check = document.createElement("span");
    check.className = "file-check";
    check.textContent = fileIsHidden ? "\u2610" : "\u2611";
    check.title = "Toggle file visibility in graph";
    check.onclick = function(e) {
      e.stopPropagation();
      if (hiddenFiles.has(file)) {
        hiddenFiles.delete(file);
        check.textContent = "\u2611";
        group.classList.remove("unchecked");
        // Restore function item styles
        group.querySelectorAll(".fn-item").forEach(function(item) {
          const key = item.dataset.key;
          if (!hiddenFunctions.has(key)) {
            item.classList.remove("unchecked");
            const fc = item.querySelector(".fn-check");
            if (fc) fc.textContent = "\u2611";
          }
        });
      } else {
        hiddenFiles.add(file);
        check.textContent = "\u2610";
        group.classList.add("unchecked");
      }
      // Only refresh graph + side panel, do NOT rebuild the index
      refreshGraphOnly();
    };

    const name = document.createElement("span");
    name.className = "file-name";
    name.textContent = file + " (" + fns.length + ")";
    name.onclick = function() {
      const list = group.querySelector(".fn-list");
      if (list) list.style.display = list.style.display === "none" ? "block" : "none";
    };

    header.appendChild(check);
    header.appendChild(name);

    const list = document.createElement("div");
    list.className = "fn-list";
    for (const key of fns) {
      const fnIsHidden = hiddenFunctions.has(key) || fileIsHidden;
      const item = document.createElement("div");
      item.className = "fn-item" + (fnIsHidden ? " unchecked" : "");
      item.dataset.key = key;

      const fnCheck = document.createElement("span");
      fnCheck.className = "fn-check";
      fnCheck.textContent = fnIsHidden ? "\u2610" : "\u2611";
      fnCheck.title = "Toggle function visibility in graph";
      fnCheck.onclick = function(e) {
        e.stopPropagation();
        if (hiddenFunctions.has(key)) {
          hiddenFunctions.delete(key);
          fnCheck.textContent = "\u2611";
          item.classList.remove("unchecked");
        } else {
          hiddenFunctions.add(key);
          fnCheck.textContent = "\u2610";
          item.classList.add("unchecked");
        }
        // Only refresh graph + side panel, do NOT rebuild the index
        refreshGraphOnly();
      };

      const fnName = document.createElement("span");
      fnName.className = "fn-name";
      fnName.textContent = shortName(key);
      fnName.onclick = () => {
        if (hiddenFunctions.has(key)) return;
        selectNode(key);
        document.getElementById("tab-details").click();
      };
      fnName.onmouseenter = () => highlightNode(key);
      fnName.onmouseleave = () => clearHighlight();

      item.appendChild(fnCheck);
      item.appendChild(fnName);
      list.appendChild(item);
    }

    group.appendChild(header);
    group.appendChild(list);
    container.appendChild(group);
  }
}

// Refresh only the graph canvas + side panel after a toggle.
// The index list stays as-is so users can toggle things back on.
function refreshGraphOnly() {
  if (selectedKey && isHidden(selectedKey)) {
    selectedKey = null;
  }
  if (selectedKey) {
    selectNode(selectedKey);
  } else {
    refreshCytoscape();
  }
}

// Tab switching
document.getElementById("tab-index").addEventListener("click", function() {
  document.getElementById("tab-index").classList.add("active");
  document.getElementById("tab-details").classList.remove("active");
  document.getElementById("tab-index-content").classList.add("active");
  document.getElementById("tab-details-content").classList.remove("active");
});

document.getElementById("tab-details").addEventListener("click", function() {
  document.getElementById("tab-details").classList.add("active");
  document.getElementById("tab-index").classList.remove("active");
  document.getElementById("tab-details-content").classList.add("active");
  document.getElementById("tab-index-content").classList.remove("active");
});

// Init
document.addEventListener("DOMContentLoaded", function() {
  deriveCategories();   // must run first: builds categories from the repo's dir structure
  initCytoscape();      // builds cytoscape style from derived categories
  buildFilterPills();   // builds filter pills from derived categories
  buildLegend();        // builds color legend from derived categories
  buildIndex();         // builds function index (all functions, with toggle checkboxes)
  document.getElementById("loading").style.display = "none";

  // Auto-select the initial function if provided, else find a high-degree node
  let initKey = null;
  if (INITIAL_FN) {
    initKey = Object.keys(GRAPH).find(k => k.endsWith("." + INITIAL_FN));
  }
  if (!initKey) {
    // Find the node with the most callees (likely a central function), skip hidden
    let maxCalls = 0;
    for (const [key, node] of Object.entries(GRAPH)) {
      if (isHidden(key)) continue;
      const c = (node.callees || []).length;
      if (c > maxCalls) { maxCalls = c; initKey = key; }
    }
  }
  if (initKey) {
    selectNode(initKey);
  } else {
    document.getElementById("sel-name").textContent = "No functions found";
  }
});
</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
