import type { DataFlowGraphData, DataFlowNode, DataFlowEdge } from "./types";

/**
 * Convert a DataFlowGraph to Mermaid flowchart format
 */
export function toMermaid(graph: DataFlowGraphData): string {
  const lines: string[] = [];

  // Header
  lines.push("```mermaid");
  lines.push("flowchart TD");
  lines.push("");

  // Add nodes with styling
  for (const node of graph.nodes) {
    if (!node) continue;

    const nodeId = sanitizeId(node.id);
    const label = sanitizeLabel(node.name);
    const shape = getNodeShape(node);

    // Add node with appropriate shape
    lines.push(`  ${nodeId}${shape[0]}"${label}"${shape[1]}`);
  }

  lines.push("");

  // Add edges
  for (const edge of graph.edges) {
    const source = sanitizeId(edge.source);
    const target = sanitizeId(edge.target);
    const label = edge.label ? sanitizeLabel(edge.label) : "";

    if (label) {
      lines.push(`  ${source} -->|"${label}"| ${target}`);
    } else {
      lines.push(`  ${source} --> ${target}`);
    }
  }

  lines.push("");

  // Add styling
  lines.push("  %% Styling");

  // Style entry points
  if (graph.entryPoints.length > 0) {
    const entryIds = graph.entryPoints.map(sanitizeId).join(",");
    lines.push(`  classDef entryClass fill:#e1f5e1,stroke:#4caf50,stroke-width:3px;`);
    lines.push(`  class ${entryIds} entryClass;`);
  }

  // Style exit points
  if (graph.exitPoints.length > 0) {
    const exitIds = graph.exitPoints.map(sanitizeId).join(",");
    lines.push(`  classDef exitClass fill:#ffe1e1,stroke:#f44336,stroke-width:3px;`);
    lines.push(`  class ${exitIds} exitClass;`);
  }

  // Style by node type
  const nodesByType = groupNodesByType(graph.nodes);

  if (nodesByType.operation.length > 0) {
    const opIds = nodesByType.operation.map(n => sanitizeId(n.id)).join(",");
    lines.push(`  classDef operationClass fill:#e3f2fd,stroke:#2196f3;`);
    lines.push(`  class ${opIds} operationClass;`);
  }

  if (nodesByType.lambda.length > 0) {
    const lambdaIds = nodesByType.lambda.map(n => sanitizeId(n.id)).join(",");
    lines.push(`  classDef lambdaClass fill:#fff3e0,stroke:#ff9800;`);
    lines.push(`  class ${lambdaIds} lambdaClass;`);
  }

  lines.push("```");

  return lines.join("\n");
}

/**
 * Generate a Mermaid visualization with metadata
 */
export function generateMermaidDoc(
  graph: DataFlowGraphData,
  title?: string
): string {
  const lines: string[] = [];

  // Title and metadata
  lines.push(`# ${title || "Effect Data Flow Visualization"}`);
  lines.push("");
  lines.push(`**Source:** ${graph.sourceFile}`);
  lines.push(`**Analyzed:** ${new Date(graph.metadata.analyzedAt).toLocaleString()}`);
  lines.push("");

  // Statistics
  lines.push("## Statistics");
  lines.push("");
  lines.push(`- **Nodes:** ${graph.nodes.length}`);
  lines.push(`- **Edges:** ${graph.edges.length}`);
  lines.push(`- **Entry Points:** ${graph.entryPoints.length}`);
  lines.push(`- **Exit Points:** ${graph.exitPoints.length}`);
  lines.push(`- **Effect Operations:** ${graph.metadata.effectOperationCount}`);
  lines.push(`- **Stream Operations:** ${graph.metadata.streamOperationCount}`);
  lines.push("");

  // Warnings if any
  if (graph.metadata.warnings.length > 0) {
    lines.push("## Warnings");
    lines.push("");
    for (const warning of graph.metadata.warnings) {
      lines.push(`- ⚠️  ${warning}`);
    }
    lines.push("");
  }

  // Graph visualization
  lines.push("## Data Flow Graph");
  lines.push("");
  lines.push(toMermaid(graph));
  lines.push("");

  // Legend
  lines.push("## Legend");
  lines.push("");
  lines.push("- 🟢 **Green nodes**: Entry points (start of pipe expressions)");
  lines.push("- 🔴 **Red nodes**: Exit points (final operations)");
  lines.push("- 🔵 **Blue nodes**: Effect/Stream operations");
  lines.push("- 🟠 **Orange nodes**: Lambda functions");
  lines.push("- ⬜ **White nodes**: Pipe containers");
  lines.push("");

  // Node details
  lines.push("## Node Details");
  lines.push("");

  for (const node of graph.nodes) {
    if (!node) continue;

    lines.push(`### ${node.name} (${node.id})`);
    lines.push("");
    lines.push(`- **Type:** ${node.type}`);
    lines.push(`- **Location:** ${node.sourceLocation.file.split('/').pop()}:${node.sourceLocation.line}`);

    if (node.effectType) {
      lines.push(`- **Effect Type:** \`Effect<${node.effectType.success}, ${node.effectType.error}, ${node.effectType.requirements}>\``);
    }

    if (node.fullType && node.fullType !== "unknown") {
      // Simplify the full type display
      const simpleType = node.fullType.replace(/import\([^)]+\)\./g, "");
      lines.push(`- **Full Type:** \`${simpleType}\``);
    }

    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Sanitize node ID for Mermaid (alphanumeric and underscore only)
 */
function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, "_");
}

/**
 * Sanitize label for Mermaid (escape special characters)
 */
function sanitizeLabel(label: string): string {
  return label
    .replace(/"/g, '\\"')
    .replace(/\n/g, " ")
    .substring(0, 50); // Limit length
}

/**
 * Get Mermaid shape for a node based on its type
 */
function getNodeShape(node: DataFlowNode): [string, string] {
  switch (node.type) {
    case "pipe":
      return ["[", "]"]; // Rectangle
    case "operation":
      if (node.name.startsWith("Effect.")) {
        return ["([", "])"]; // Stadium (rounded)
      } else if (node.name.startsWith("Stream.")) {
        return ["[[", "]]"]; // Subroutine
      } else {
        return ["(", ")"]; // Round
      }
    case "lambda":
      return ["{", "}"]; // Rhombus
    case "function":
      return ["(", ")"]; // Round
    case "variable":
      return ["(", ")"]; // Round
    case "literal":
      return ["[", "]"]; // Rectangle
    default:
      return ["[", "]"]; // Rectangle
  }
}

/**
 * Group nodes by type
 */
function groupNodesByType(nodes: DataFlowNode[]): Record<string, DataFlowNode[]> {
  const groups: Record<string, DataFlowNode[]> = {
    pipe: [],
    operation: [],
    lambda: [],
    function: [],
    variable: [],
    literal: [],
  };

  for (const node of nodes) {
    if (!node) continue;
    if (groups[node.type]) {
      groups[node.type].push(node);
    }
  }

  return groups;
}
