import assert from "node:assert/strict";
import test from "node:test";
import { generateHtml } from "../html.js";

const graph = {
  "app.veryLongFunctionNameThatWouldOverlapEveryNeighbour": {
    filepath: "/repo/src/app.ts",
    callees: ["app.child"],
    lineno: 1,
  },
  "app.child": {
    filepath: "/repo/src/app.ts",
    callees: [],
    lineno: 2,
  },
};

const html = generateHtml(graph, "/repo", "veryLongFunctionNameThatWouldOverlapEveryNeighbour");

test("keeps graph labels compact and caps automatic zoom", () => {
  assert.match(html, /shortLabel\(name, 18\)/);
  assert.match(html, /"text-valign": "bottom"/);
  assert.match(html, /const MIN_AUTO_ZOOM = 0\.70/);
  assert.match(html, /const MAX_AUTO_ZOOM = 1\.15/);
  assert.match(html, /Math\.max\(MIN_AUTO_ZOOM, Math\.min\(cy\.zoom\(\), MAX_AUTO_ZOOM\)\)/);
  assert.doesNotMatch(html, /wheelSensitivity/);
});

test("uses a readable rooted layout and respects depth", () => {
  assert.match(html, /name: "breadthfirst"/);
  assert.match(html, /nodeDimensionsIncludeLabels: true/);
  assert.match(html, /const \{ key, depth: level \} = queue\.shift\(\)/);
  assert.match(html, /if \(level >= depth\) continue/);
  assert.match(html, /depth: level \+ 1/);
  assert.match(html, /k === INITIAL_FN \|\| k\.endsWith\("\." \+ INITIAL_FN\)/);
});

test("renders Mermaid at readable size with an expanded view", () => {
  assert.match(html, /id="mermaid-expand"/);
  assert.match(html, /#mermaid-output svg \{ max-width: none/);
  assert.match(html, /#mermaid-container\.expanded/);
  assert.match(html, /flowchart: \{ useMaxWidth: false/);
});
