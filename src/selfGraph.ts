// Self-contained call-graph builder used for the GitHub Pages demo.
//
// The main CLI (index.ts) reuses the richer graph modules from nuanced-mcp,
// which live outside this repo. For the hosted demo we don't want that
// external dependency, so this module builds a reasonable call graph of a
// TypeScript repo using ts-morph alone (already a dependency). It is
// intentionally lightweight: enough to produce an interesting, accurate-ish
// graph of this codebase for the demo page.

import { relative } from "node:path";
import { Project, Node, SyntaxKind } from "ts-morph";
import type { Graph, GraphNode } from "./mermaid.js";

// A function-like declaration we want to represent as a node.
type FnNode = Node;

function fnName(node: Node): string | undefined {
  if (Node.isFunctionDeclaration(node) || Node.isMethodDeclaration(node)) {
    return node.getName();
  }
  if (Node.isGetAccessorDeclaration(node) || Node.isSetAccessorDeclaration(node)) {
    return node.getName();
  }
  // Arrow / function expression assigned to a variable: `const foo = () => {}`
  if (Node.isArrowFunction(node) || Node.isFunctionExpression(node)) {
    const parent = node.getParent();
    if (parent && Node.isVariableDeclaration(parent)) {
      return parent.getName();
    }
    if (parent && Node.isPropertyAssignment(parent)) {
      return parent.getName();
    }
  }
  return undefined;
}

function isFunctionLike(node: Node): boolean {
  return (
    Node.isFunctionDeclaration(node) ||
    Node.isMethodDeclaration(node) ||
    Node.isGetAccessorDeclaration(node) ||
    Node.isSetAccessorDeclaration(node) ||
    Node.isArrowFunction(node) ||
    Node.isFunctionExpression(node)
  );
}

export function buildSelfGraph(repoDir: string, globs: string[] = ["src/**/*.ts"]): Graph {
  const project = new Project({
    compilerOptions: { allowJs: true },
    skipAddingFilesFromTsConfig: true,
  });
  for (const g of globs) {
    project.addSourceFilesAtPaths(`${repoDir}/${g}`);
  }

  const graph: Graph = {};
  // Map from a function-like declaration to its graph key.
  const declToKey = new Map<FnNode, string>();

  // First pass: register every named function-like declaration as a node.
  for (const sourceFile of project.getSourceFiles()) {
    const rel = relative(repoDir, sourceFile.getFilePath());
    const base = rel.replace(/\.[tj]sx?$/, "");
    sourceFile.forEachDescendant((node) => {
      if (!isFunctionLike(node)) return;
      const name = fnName(node);
      if (!name) return; // skip anonymous callbacks
      const key = `${base}.${name}`;
      const fnNode: GraphNode = {
        filepath: rel,
        callees: [],
        lineno: node.getStartLineNumber(),
        end_lineno: node.getEndLineNumber(),
      };
      graph[key] = fnNode;
      declToKey.set(node, key);
    });
  }

  // Second pass: resolve calls inside each function body to callee keys.
  for (const [decl, key] of declToKey) {
    const callees = new Set<string>();
    decl.forEachDescendant((node) => {
      if (!Node.isCallExpression(node)) return;
      // Don't descend into nested function declarations' calls; attribute the
      // call to the nearest enclosing registered function instead.
      const enclosing = nearestRegisteredFn(node, declToKey);
      if (enclosing !== decl) return;

      const expr = node.getExpression();
      const resolved = resolveCallee(expr, declToKey);
      if (resolved) {
        callees.add(resolved);
      } else {
        const name = calleeText(expr);
        if (name) callees.add(name); // external / unresolved
      }
    });
    graph[key].callees = [...callees];
  }

  return graph;
}

// Walk up from a node to the nearest ancestor that is a registered function.
function nearestRegisteredFn(node: Node, declToKey: Map<Node, string>): Node | undefined {
  let cur: Node | undefined = node.getParent();
  while (cur) {
    if (declToKey.has(cur)) return cur;
    cur = cur.getParent();
  }
  return undefined;
}

// Resolve a call expression's target to one of our registered function keys.
function resolveCallee(expr: Node, declToKey: Map<Node, string>): string | undefined {
  let symbol = expr.getSymbol();
  if (!symbol) {
    // Property access (obj.method) — resolve the name part.
    if (Node.isPropertyAccessExpression(expr)) {
      symbol = expr.getNameNode().getSymbol();
    }
  }
  if (!symbol) return undefined;
  for (const d of symbol.getDeclarations()) {
    // The declaration might be the function itself, or a variable whose
    // initializer is the arrow function we registered.
    if (declToKey.has(d)) return declToKey.get(d);
    if (Node.isVariableDeclaration(d)) {
      const init = d.getInitializer();
      if (init && declToKey.has(init)) return declToKey.get(init);
    }
  }
  return undefined;
}

function calleeText(expr: Node): string | undefined {
  if (Node.isIdentifier(expr)) return expr.getText();
  if (Node.isPropertyAccessExpression(expr)) return expr.getName();
  // Fall back to the trailing identifier of whatever was called.
  const text = expr.getText().split(/[^A-Za-z0-9_]/).filter(Boolean).pop();
  return text;
}
