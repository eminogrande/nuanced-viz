# nuanced-viz

Interactive browser visualizer for [nuanced-mcp](https://github.com/eminogrande/nuanced-mcp-typescript) call graphs. Takes call graph data and renders it as an explorable, interactive graph in your browser.

## What it does

- Builds a call graph from any TypeScript/JavaScript or Python repo
- Generates a self-contained HTML file with [cytoscape.js](https://js.cytoscape.org/) + [mermaid.js](https://mermaid.js.org/)
- Opens it in your default browser
- No server, no port, no daemon. Just a file.

## Install

```bash
git clone https://github.com/eminogrande/nuanced-viz.git
cd nuanced-viz
npm install && npm run build
```

Requires Node.js >= 22 (uses `fs.globSync`). For Python repos, also needs `uv` on PATH.

## Usage

```bash
# Build a graph from a repo and visualize it
node dist/index.js /path/to/repo --language typescript
node dist/index.js /path/to/repo --language typescript --fn App

# Load a pre-built graph JSON (from nuanced-mcp tools or elsewhere)
node dist/index.js --graph graph.json --fn mainFunction

# Pipe graph JSON from stdin
cat graph.json | node dist/index.js --stdin
```

### Options

| Flag | Description |
|------|-------------|
| `<repo-path>` | Path to the repo to analyze (positional) |
| `-l, --language <lang>` | `typescript` or `python` (default: `typescript`) |
| `-f, --fn <name>` | Function to focus on initially |
| `-g, --graph <file>` | Load a pre-built graph JSON instead of building one |
| `--stdin` | Read graph JSON from stdin |

## Browser UI

### Cytoscape canvas (left)

- Interactive graph with pan, zoom, and drag
- Nodes are functions, sized by call count, colored by auto-derived group
- Click a node to select it and see its neighborhood
- Only renders the neighborhood around the selected node (up to 300 nodes) to stay responsive on large codebases

### Sidebar (right)

Two tabs:

**Function Index**
- All functions grouped by file, collapsible
- Per-file and per-function checkboxes to toggle visibility in the graph (items stay in the list, greyed out, so you can toggle them back)
- Color legend showing each group's color (click to toggle)
- Search box filters the index live

**Details**
- Selected function's file, line, call count
- Clickable callees and callers lists (hover to highlight in the canvas)
- Live Mermaid preview of the selected function's subgraph (flowchart or sequence, switchable)

### Filter toolbar

- Auto-derived category pills based on the repo's directory structure
- Each pill toggles a group of functions on/off in the graph
- Toggling rerenders the graph with a fresh layout

### Auto-derived categories

Categories are **not hardcoded**. The tool scans the repo's directory structure and creates a group per top-level or second-level source directory (e.g. `services/bitcoin`, `lib`, `components`). Sparse subdirectories merge into their parent. Generic categories (Setters, Builtins, Anonymous) are always detected. Everything else falls into "Other".

This means it works on any repo:
- [nuri-expo](https://github.com/eminogrande/nuri-expo) (8337 functions, 542 files)
- [arkade-os/ts-sdk](https://github.com/arkade-os/ts-sdk) (7414 functions, 266 files, monorepo)
- Any TS/JS or Python repo

## How it works

1. **Graph building**: reuses the graph modules from [nuanced-mcp-typescript](https://github.com/eminogrande/nuanced-mcp-typescript) (ts-morph for TS/JS, `uv` + `nuanced` for Python)
2. **HTML generation**: embeds the graph JSON + cytoscape.js + mermaid.js (CDN) into a single self-contained HTML file
3. **Browser rendering**: all interactivity is client-side JS. The graph data is embedded at generation time. No round-trips to a server.

## License

MIT
