#!/usr/bin/env node
// nuanced-viz: interactive browser visualizer for nuanced-mcp call graphs.
//
// Usage:
//   nuanced-viz <repo-path> [--language typescript|python] [--fn FunctionName]
//   nuanced-viz --graph graph.json [--fn FunctionName]
//   cat graph.json | nuanced-viz --stdin [--fn FunctionName]
//
// Builds (or loads) a call graph, generates a self-contained HTML file with
// cytoscape + mermaid, and opens it in the default browser.

import { writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawn } from "node:child_process";
import { tmpdir, homedir } from "node:os";
import { generateHtml } from "./html.js";
import type { Graph } from "./mermaid.js";

// Graph builder imports - reuse the nuanced-mcp graph modules.
// We import from the nuanced-mcp dist directory so we share the compiled code.
const NUANCED_MCP_DIST = resolve(homedir(), "Developer/nuanced-typescript/dist");

interface Args {
  repoPath?: string;
  language: string;
  fn?: string;
  graphFile?: string;
  stdin: boolean;
  out?: string;
  noOpen: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { language: "typescript", stdin: false, noOpen: false };
  const positional: string[] = [];
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--language" || arg === "-l") {
      args.language = argv[++i] ?? "typescript";
    } else if (arg === "--fn" || arg === "-f") {
      args.fn = argv[++i];
    } else if (arg === "--graph" || arg === "-g") {
      args.graphFile = argv[++i];
    } else if (arg === "--out" || arg === "-o") {
      args.out = argv[++i];
    } else if (arg === "--no-open") {
      args.noOpen = true;
    } else if (arg === "--stdin") {
      args.stdin = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      positional.push(arg);
    }
  }
  args.repoPath = positional[0];
  return args;
}

function printHelp(): void {
  console.log(`nuanced-viz - Interactive call graph visualizer

Usage:
  nuanced-viz <repo-path> [--language typescript|python] [--fn FunctionName]
  nuanced-viz --graph graph.json [--fn FunctionName]
  cat graph.json | nuanced-viz --stdin [--fn FunctionName]

Options:
  -l, --language <lang>   Language: typescript or python (default: typescript)
  -f, --fn <name>         Function to focus on initially
  -g, --graph <file>      Load a pre-built graph JSON instead of building one
      --stdin             Read graph JSON from stdin
  -o, --out <file>        Write the HTML to <file> instead of a temp path
      --no-open           Do not open the result in a browser (for CI/hosting)
  -h, --help              Show this help
`);
}

async function buildGraph(repoPath: string, language: string): Promise<Graph> {
  const abs = resolve(repoPath);
  if (!existsSync(abs)) {
    console.error(`Error: path does not exist: ${abs}`);
    process.exit(1);
  }

  let graph: Graph;
  if (language === "python") {
    const mod = await import(join(NUANCED_MCP_DIST, "graph/pythonBackend.js"));
    const result = await mod.initPythonGraph(abs);
    graph = result.graph;
    if (result.errors.length && Object.keys(graph).length === 0) {
      console.error("Error building graph:", result.errors.join("; "));
      process.exit(1);
    }
  } else {
    const mod = await import(join(NUANCED_MCP_DIST, "graph/tsBackend.js"));
    const result = await mod.initTsGraph(abs);
    graph = result.graph;
    if (result.errors.length && Object.keys(graph).length === 0) {
      console.error("Error building graph:", result.errors.join("; "));
      process.exit(1);
    }
  }
  return graph;
}

function loadGraphFile(path: string): Graph {
  const abs = resolve(path);
  if (!existsSync(abs)) {
    console.error(`Error: graph file not found: ${abs}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(abs, "utf8")) as Graph;
}

async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (d) => (data += d));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

function openBrowser(htmlPath: string): void {
  const platform = process.platform;
  let cmd: string;
  let args: string[];
  if (platform === "darwin") {
    cmd = "open";
    args = [htmlPath];
  } else if (platform === "win32") {
    cmd = "cmd";
    args = ["/c", "start", "", htmlPath];
  } else {
    cmd = "xdg-open";
    args = [htmlPath];
  }
  spawn(cmd, args, { stdio: "ignore" });
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  let graph: Graph;
  let repoPath = "";

  if (args.stdin) {
    const raw = await readStdin();
    graph = JSON.parse(raw) as Graph;
    repoPath = "(from stdin)";
  } else if (args.graphFile) {
    graph = loadGraphFile(args.graphFile);
    repoPath = args.graphFile;
  } else if (args.repoPath) {
    const abs = resolve(args.repoPath);
    console.log(`Building ${args.language} graph for ${abs}...`);
    graph = await buildGraph(abs, args.language);
    repoPath = abs;
    console.log(`Graph: ${Object.keys(graph).length} functions, ${new Set(Object.values(graph).map((n) => n.filepath)).size} files`);
  } else {
    printHelp();
    process.exit(1);
  }

  // Generate HTML and (optionally) open in browser
  const html = generateHtml(graph, repoPath, args.fn);
  const htmlPath = args.out ? resolve(args.out) : join(tmpdir(), `nuanced-viz-${Date.now()}.html`);
  writeFileSync(htmlPath, html, "utf8");
  console.log(`HTML written to: ${htmlPath}`);
  if (args.noOpen) return;
  openBrowser(htmlPath);
  console.log("Opening in browser...");

  // Clean up old temp files (best effort, last 10 minutes)
  // ponytail: no daemon; the HTML file is self-contained and works standalone.
  // The browser tab outlives the CLI process, which is the point.
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
