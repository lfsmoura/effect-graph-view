/**
 * Effect Data Flow Analyzer
 *
 * Parses TypeScript code using the Effect library and generates
 * data flow graphs with full AST details.
 */

import { EffectDataFlowAnalyzer as Analyzer } from "./analyzer.ts";

export { EffectDataFlowAnalyzer } from "./analyzer.ts";
export { DataFlowGraph } from "./graph.ts";
export type {
  DataFlowNode,
  DataFlowEdge,
  DataFlowGraphData,
  EffectTypeInfo,
  SourceLocation,
  NodeType,
  EdgeType,
  AnalyzerOptions,
  AnalysisResult,
} from "./types.ts";

// Convenience function for quick analysis
export async function analyzeFile(
  filePath: string,
  options?: {
    includeTypes?: boolean;
    includeFullAST?: boolean;
  }
) {
  const analyzer = new Analyzer(undefined, options);
  return analyzer.analyze(filePath);
}
