import { Graph } from "graphlib";
import type {
  DataFlowNode,
  DataFlowEdge,
  DataFlowGraphData,
} from "./types.ts";

/**
 * Wrapper around graphlib Graph with type-safe operations
 * for Effect data flow analysis
 */
export class DataFlowGraph {
  private graph: Graph;
  private sourceFile: string;
  private entryPoints: Set<string> = new Set();
  private exitPoints: Set<string> = new Set();
  private metadata: DataFlowGraphData["metadata"];

  constructor(sourceFile: string) {
    this.graph = new Graph({ directed: true, multigraph: true });
    this.sourceFile = sourceFile;
    this.metadata = {
      analyzedAt: new Date().toISOString(),
      effectOperationCount: 0,
      streamOperationCount: 0,
      warnings: [],
    };
  }

  /**
   * Add a node to the graph
   */
  addNode(node: DataFlowNode): void {
    this.graph.setNode(node.id, node);

    // Update metadata counts
    if (node.name.startsWith("Effect.")) {
      this.metadata.effectOperationCount++;
    } else if (node.name.startsWith("Stream.")) {
      this.metadata.streamOperationCount++;
    }
  }

  /**
   * Add an edge to the graph
   */
  addEdge(edge: DataFlowEdge): void {
    this.graph.setEdge(edge.source, edge.target, edge);
  }

  /**
   * Get a node by ID
   */
  getNode(id: string): DataFlowNode | undefined {
    return this.graph.node(id);
  }

  /**
   * Get all nodes
   */
  getNodes(): DataFlowNode[] {
    return this.graph.nodes().map((id) => this.graph.node(id));
  }

  /**
   * Get all edges
   */
  getEdges(): DataFlowEdge[] {
    return this.graph.edges().map((e) => this.graph.edge(e));
  }

  /**
   * Mark a node as an entry point
   */
  addEntryPoint(nodeId: string): void {
    this.entryPoints.add(nodeId);
  }

  /**
   * Mark a node as an exit point
   */
  addExitPoint(nodeId: string): void {
    this.exitPoints.add(nodeId);
  }

  /**
   * Add a warning message
   */
  addWarning(message: string): void {
    this.metadata.warnings.push(message);
  }

  /**
   * Get successors of a node
   */
  getSuccessors(nodeId: string): DataFlowNode[] {
    return (this.graph.successors(nodeId) || []).map((id) =>
      this.graph.node(id)
    );
  }

  /**
   * Get predecessors of a node
   */
  getPredecessors(nodeId: string): DataFlowNode[] {
    return (this.graph.predecessors(nodeId) || []).map((id) =>
      this.graph.node(id)
    );
  }

  /**
   * Export graph to JSON format
   */
  toJSON(): DataFlowGraphData {
    return {
      nodes: this.getNodes(),
      edges: this.getEdges(),
      entryPoints: Array.from(this.entryPoints),
      exitPoints: Array.from(this.exitPoints),
      sourceFile: this.sourceFile,
      metadata: this.metadata,
    };
  }

  /**
   * Get graph statistics
   */
  getStats() {
    const nodes = this.getNodes();
    const edges = this.getEdges();

    return {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      entryPointCount: this.entryPoints.size,
      exitPointCount: this.exitPoints.size,
      nodesByType: nodes.reduce(
        (acc, node) => {
          acc[node.type] = (acc[node.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      edgesByType: edges.reduce(
        (acc, edge) => {
          acc[edge.type] = (acc[edge.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    };
  }

  /**
   * Find all nodes matching a predicate
   */
  findNodes(predicate: (node: DataFlowNode) => boolean): DataFlowNode[] {
    return this.getNodes().filter(predicate);
  }

  /**
   * Get the data flow path from entry to exit points
   */
  getDataFlowPaths(): DataFlowNode[][] {
    const paths: DataFlowNode[][] = [];

    for (const entryId of this.entryPoints) {
      for (const exitId of this.exitPoints) {
        const path = this.findPath(entryId, exitId);
        if (path) {
          paths.push(path);
        }
      }
    }

    return paths;
  }

  /**
   * Find a path between two nodes using BFS
   */
  private findPath(startId: string, endId: string): DataFlowNode[] | null {
    if (startId === endId) {
      return [this.graph.node(startId)];
    }

    const visited = new Set<string>();
    const queue: { id: string; path: string[] }[] = [
      { id: startId, path: [startId] },
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (visited.has(current.id)) continue;
      visited.add(current.id);

      const successors = this.graph.successors(current.id) || [];

      for (const succId of successors) {
        if (succId === endId) {
          const path = [...current.path, succId];
          return path.map((id) => this.graph.node(id));
        }

        if (!visited.has(succId)) {
          queue.push({
            id: succId,
            path: [...current.path, succId],
          });
        }
      }
    }

    return null;
  }
}
