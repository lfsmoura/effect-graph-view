import type { Node } from "ts-morph";

/**
 * Represents the type information extracted from an Effect operation
 */
export interface EffectTypeInfo {
  /** The success type parameter from Effect<Success, Error, Requirements> */
  success: string;
  /** The error type parameter from Effect<Success, Error, Requirements> */
  error: string;
  /** The requirements type parameter from Effect<Success, Error, Requirements> */
  requirements: string;
}

/**
 * Source location information for a node
 */
export interface SourceLocation {
  /** File path */
  file: string;
  /** Line number (1-indexed) */
  line: number;
  /** Column number (0-indexed) */
  column: number;
  /** End line number (1-indexed) */
  endLine: number;
  /** End column number (0-indexed) */
  endColumn: number;
}

/**
 * Type of node in the data flow graph
 */
export type NodeType =
  | "operation" // Effect/Stream operation like Effect.try, Stream.filter
  | "function" // Function call or declaration
  | "variable" // Variable reference
  | "literal" // Literal value
  | "pipe" // Pipe expression container
  | "lambda"; // Arrow function or anonymous function

/**
 * Represents a node in the data flow graph
 */
export interface DataFlowNode {
  /** Unique identifier for this node */
  id: string;
  /** Type of this node */
  type: NodeType;
  /** Human-readable name of the operation/function/variable */
  name: string;
  /** Effect type information if this is an Effect operation */
  effectType?: EffectTypeInfo;
  /** Full TypeScript type as string */
  fullType?: string;
  /** Source location in the original file */
  sourceLocation: SourceLocation;
  /** Additional metadata */
  metadata: Record<string, any>;
  /** Serialized AST node (for full AST detail) */
  astNode: {
    kind: string;
    text: string;
    [key: string]: any;
  };
}

/**
 * Type of edge in the data flow graph
 */
export type EdgeType =
  | "dataFlow" // Data flows from source to target
  | "dependency" // Target depends on source
  | "composition" // Operations composed together (e.g., in pipe)
  | "call"; // Function call relationship

/**
 * Represents an edge in the data flow graph
 */
export interface DataFlowEdge {
  /** Source node ID */
  source: string;
  /** Target node ID */
  target: string;
  /** Type of this edge */
  type: EdgeType;
  /** Optional label describing the transformation */
  label?: string;
  /** Order in a sequence (e.g., position in pipe arguments) */
  order?: number;
  /** Additional metadata */
  metadata: Record<string, any>;
}

/**
 * Represents the complete data flow graph
 */
export interface DataFlowGraphData {
  /** All nodes in the graph */
  nodes: DataFlowNode[];
  /** All edges in the graph */
  edges: DataFlowEdge[];
  /** Entry point nodes (typically the main pipe expression) */
  entryPoints: string[];
  /** Exit point nodes (typically the final operation) */
  exitPoints: string[];
  /** Source file path */
  sourceFile: string;
  /** Additional metadata about the analysis */
  metadata: {
    /** Timestamp of analysis */
    analyzedAt: string;
    /** Total number of Effect operations found */
    effectOperationCount: number;
    /** Total number of Stream operations found */
    streamOperationCount: number;
    /** Any warnings or issues encountered during parsing */
    warnings: string[];
  };
}

/**
 * Configuration options for the analyzer
 */
export interface AnalyzerOptions {
  /** Include full AST node details */
  includeFullAST?: boolean;
  /** Include type information */
  includeTypes?: boolean;
  /** Follow imports and analyze dependencies */
  followImports?: boolean;
  /** Maximum depth for following imports */
  maxImportDepth?: number;
  /** Custom operation patterns to recognize */
  customPatterns?: {
    /** Pattern name */
    name: string;
    /** Regex or function to match operation names */
    matcher: RegExp | ((name: string) => boolean);
  }[];
}

/**
 * Result of analyzing a file
 */
export interface AnalysisResult {
  /** The generated graph data */
  graph: DataFlowGraphData;
  /** Any errors encountered */
  errors: Error[];
  /** Success status */
  success: boolean;
}
