# Changelog

## 2026-10-14 — [RELEASE] v0.1.0 — hermes-agent for emino

- First tagged release of `main` at HEAD `df844ca2`. (df844ca2)
- Node.js CLI `nuanced-viz`: builds a call graph from a TS/JS or Python repo, or loads one via `--graph` / `--stdin`, writes a self-contained HTML file and opens it in the browser. (df844ca2)
- Browser UI: cytoscape canvas with rooted hierarchy layout, depth and complexity sliders, auto-derived category pills, function index, details tab with live Mermaid preview. (df844ca2)
- Self-check tests via `npm test`. (df844ca2)
- Not in this release: GitHub Pages deploy with demo graph (open PR #1, not merged).

## 2026-08-14

### Changed

- Replaced dense cluster positioning with a rooted caller-to-callee hierarchy. (df844ca2)
- Kept graph labels readable with compact names and bounded automatic zoom. (df844ca2)
- Fixed depth traversal so the slider limits the displayed neighborhood. (df844ca2)
- Rendered Mermaid flowcharts left-to-right at their natural size with scrolling and an expanded view. (df844ca2)
- Restored native wheel zoom behavior and corrected Cytoscape arrow styling. (df844ca2)
- Added `src/test/selfcheck.test.ts` and the `npm test` script. (df844ca2)

### Rationale

Dense neighborhoods previously auto-zoomed small layouts until labels became oversized and overlapping. Hierarchical spacing, bounded zoom, and an expandable Mermaid canvas make call paths readable without removing graph detail.

## 2026-06-20

- Compact layout: smaller node spacing plus a relaxation pass that pushes overlapping nodes apart. (1bdfc0cc)
- Complexity slider hides low-importance functions, scored by callers, callees and reachable descendants. (46ae9352)
- Layout clusters functions by file inside each category sector; canvas cap raised from 300 to 1000 nodes. (6a6f3700)
- Hovering a file header highlights all its functions and fades the rest. (c25d12e1)
- Hovering an index item highlights the matching canvas node. (6af95318)
- Stats bar added; category filters stay in sync with the function index. (7c472a5e)
- Hovering a canvas node highlights the function in the index. (7e6816b7)
- Radial centered layout with one sector per category. (94eafbca)
- Wider grid blocks, smaller nodes, more spacing. (aff13bba)
- Grouped layout by category and hover-to-highlight with fading. (56a5debf)
- Fixed layout stacking and Mermaid syntax errors. (26a620bf)
- Categories auto-derived from repo directory structure; graph rerenders on filter toggle. (2d5b2dcf)
- Initial commit: CLI with repo, `--graph` and `--stdin` input modes, self-contained HTML with cytoscape and mermaid. (27442275)
