// Graph -> Mermaid syntax conversion. Duplicated from nuanced-mcp/src/graph/mermaid.ts
// to avoid a shared package dependency. If this diverges, extract nuanced-mermaid.

export interface GraphNode {
  filepath: string;
  callees: string[];
  lineno?: number | null;
  end_lineno?: number | null;
}

export type Graph = Record<string, GraphNode>;

function nodeId(key: string): string {
  return key.replace(/[^a-zA-Z0-9_]/g, "_");
}

function shortName(key: string): string {
  return key.split(".").pop() ?? key;
}

export function toFlowchart(subgraph: Graph, entrypointKey: string): string {
  const lines = ["graph TD"];
  const entryId = nodeId(entrypointKey);
  const inGraph = new Set(Object.keys(subgraph));

  lines.push(`    ${entryId}["${shortName(entrypointKey)}"]`);
  lines.push(`    style ${entryId} fill:#4CAF50,color:#fff,stroke:#2E7D32,stroke-width:3px`);

  for (const [key] of Object.entries(subgraph)) {
    if (key === entrypointKey) continue;
    lines.push(`    ${nodeId(key)}["${shortName(key)}"]`);
  }

  for (const [key, node] of Object.entries(subgraph)) {
    const fromId = nodeId(key);
    for (const callee of node.callees ?? []) {
      if (inGraph.has(callee)) {
        const toId = nodeId(callee);
        if (fromId !== toId) lines.push(`    ${fromId} --> ${toId}`);
      } else {
        const extId = nodeId("ext_" + callee);
        lines.push(`    ${extId}["${shortName(callee)}"]:::external`);
        lines.push(`    ${fromId} -.-> ${extId}`);
      }
    }
  }

  lines.push("    classDef external fill:#f9f9f9,stroke:#ccc,stroke-dasharray: 5 5");
  return lines.join("\n");
}

export function toSequence(subgraph: Graph, entrypointKey: string): string {
  const lines = ["sequenceDiagram"];
  const inGraph = new Set(Object.keys(subgraph));
  const entryName = shortName(entrypointKey);

  const participants = [entrypointKey];
  const seen = new Set([entrypointKey]);
  for (const key of Object.keys(subgraph)) {
    if (key !== entrypointKey && !seen.has(key)) {
      participants.push(key);
      seen.add(key);
    }
  }

  for (const p of participants) {
    lines.push(`    participant ${nodeId(p)} as ${shortName(p)}`);
  }

  for (const [key, node] of Object.entries(subgraph)) {
    const fromId = nodeId(key);
    for (const callee of node.callees ?? []) {
      if (inGraph.has(callee) && callee !== key) {
        const toId = nodeId(callee);
        lines.push(`    ${fromId}->>+${toId}: ${shortName(callee)}`);
        lines.push(`    ${toId}-->>-${fromId}: ok`);
      }
    }
  }

  return lines.join("\n");
}
