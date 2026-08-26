#!/usr/bin/env node
// Builds the static demo site for GitHub Pages.
//
// Produces a self-contained index.html visualizing nuanced-viz's own call
// graph. No external dependencies (uses the ts-morph based selfGraph builder),
// so it runs unchanged in CI.
//
// Usage: node dist/site.js [outDir] [repoDir]
//   outDir  - directory to write index.html into (default: "site")
//   repoDir - repo to analyze (default: current working directory)

import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildSelfGraph } from "./selfGraph.js";
import { generateHtml } from "./html.js";

function main(): void {
  const outDir = resolve(process.argv[2] ?? "site");
  const repoDir = resolve(process.argv[3] ?? process.cwd());

  console.log(`Building self call graph for ${repoDir}...`);
  const graph = buildSelfGraph(repoDir);
  const fnCount = Object.keys(graph).length;
  const fileCount = new Set(Object.values(graph).map((n) => n.filepath)).size;
  console.log(`Graph: ${fnCount} functions across ${fileCount} files`);

  if (fnCount === 0) {
    console.error("Refusing to build an empty demo graph.");
    process.exit(1);
  }

  // Focus on the CLI entrypoint so the initial view is meaningful.
  const focus = Object.keys(graph).find((k) => k.endsWith(".main"));
  const html = generateHtml(graph, "nuanced-viz", focus);

  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "index.html");
  writeFileSync(outPath, html, "utf8");
  console.log(`Wrote ${outPath} (${(html.length / 1024).toFixed(0)} KB)`);
}

main();
