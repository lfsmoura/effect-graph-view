# Effect Data Flow Analyzer

A TypeScript parser that analyzes code using the Effect library and generates data flow graphs with full AST details.

## Features

- **Parse Effect Code**: Analyzes TypeScript code using Effect operations like `pipe`, `Effect.*`, `Stream.*`
- **Data Flow Graph**: Generates a graph structure showing how data flows through Effect operations
- **Full AST Details**: Captures complete abstract syntax tree information for each node
- **Type Information**: Extracts Effect type parameters (`Effect<Success, Error, Requirements>`)
- **Multiple Entry/Exit Points**: Tracks multiple pipe expressions and their flow paths
- **JSON Export**: Exports graph data to JSON format for further processing

## Installation

```bash
bun install
```

## Usage

### Basic Usage

```typescript
import { analyzeFile } from "./src/index.ts";

const result = await analyzeFile("/path/to/your/effect/code.ts", {
  includeTypes: true,
  includeFullAST: true,
});

console.log(`Found ${result.graph.nodes.length} nodes`);
console.log(`Found ${result.graph.edges.length} edges`);
```

### Advanced Usage with Analyzer Class

```typescript
import { EffectDataFlowAnalyzer } from "./src/index.ts";

const analyzer = new EffectDataFlowAnalyzer(
  "/path/to/tsconfig.json", // Optional
  {
    includeTypes: true,
    includeFullAST: true,
    followImports: false,
  }
);

const result = analyzer.analyze("/path/to/file.ts");
```

## Running the Example

Test the analyzer with the included ccmanager example:

```bash
bun run src/test.ts
```

This will:
1. Analyze `apps/ccmanager/index.ts`
2. Print graph statistics
3. List all nodes and edges
4. Export the graph to `output/ccmanager-graph.json`

## Graph Structure

### Nodes

Each node in the graph represents:
- **pipe**: A pipe expression container
- **operation**: Effect/Stream operations (e.g., `Effect.try`, `Stream.filter`)
- **lambda**: Arrow functions or anonymous functions
- **variable**: Variable references
- **function**: Function calls or declarations
- **literal**: Literal values

Node properties:
```typescript
{
  id: string;
  type: NodeType;
  name: string;
  effectType?: {
    success: string;
    error: string;
    requirements: string;
  };
  fullType?: string;
  sourceLocation: {
    file: string;
    line: number;
    column: number;
    endLine: number;
    endColumn: number;
  };
  metadata: Record<string, any>;
  astNode: { /* Full AST details */ };
}
```

### Edges

Edges represent relationships between nodes:
- **composition**: Operations composed together in a pipe
- **dataFlow**: Data flows from source to target
- **dependency**: Target depends on source
- **call**: Function call relationship

Edge properties:
```typescript
{
  source: string;
  target: string;
  type: EdgeType;
  label?: string;
  order?: number;
  metadata: Record<string, any>;
}
```

## Example Output

From analyzing `apps/ccmanager/index.ts`:

```
📊 Graph Statistics:
{
  "nodeCount": 21,
  "edgeCount": 18,
  "entryPoints": 3,
  "exitPoints": 3,
  "effectOperations": 4,
  "streamOperations": 6
}
```

The analyzer found:
- 3 pipe expressions
- 4 Effect operations (Console.log, Effect.flatMap, Effect.all, Effect.tap)
- 6 Stream operations (fromIterable, filter, mapEffect, tap, runDrain)
- 8 lambda functions
- Full data flow paths from entry to exit points

## API Reference

### `analyzeFile(filePath, options?)`

Quick analysis function.

**Parameters:**
- `filePath`: Path to the TypeScript file
- `options`: Optional configuration
  - `includeTypes`: Include type information (default: true)
  - `includeFullAST`: Include full AST details (default: true)

**Returns:** `Promise<AnalysisResult>`

### `EffectDataFlowAnalyzer`

Main analyzer class.

**Constructor:**
```typescript
new EffectDataFlowAnalyzer(
  tsConfigPath?: string,
  options?: AnalyzerOptions
)
```

**Methods:**
- `analyze(filePath: string): AnalysisResult` - Analyze a file
- `addSourceFile(filePath: string): SourceFile` - Add a source file to the project

### `DataFlowGraph`

Graph wrapper class with utility methods.

**Methods:**
- `getNodes(): DataFlowNode[]` - Get all nodes
- `getEdges(): DataFlowEdge[]` - Get all edges
- `getSuccessors(nodeId: string): DataFlowNode[]` - Get node successors
- `getPredecessors(nodeId: string): DataFlowNode[]` - Get node predecessors
- `findNodes(predicate): DataFlowNode[]` - Find nodes matching predicate
- `getDataFlowPaths(): DataFlowNode[][]` - Get all paths from entry to exit
- `toJSON(): DataFlowGraphData` - Export to JSON
- `getStats()` - Get graph statistics

## Technology Stack

- **ts-morph**: TypeScript AST parsing with type information
- **graphlib**: Graph data structure library
- **Bun**: Fast TypeScript runtime

## Use Cases

1. **Visualization**: Generate visual diagrams of Effect data flows
2. **Analysis**: Analyze complexity, detect patterns, find optimization opportunities
3. **Documentation**: Auto-generate documentation from code structure
4. **Code Generation**: Transform Effect code or generate related code
5. **Static Analysis**: Build linting rules or code quality tools

## Future Enhancements

- Support for more Effect patterns (Effect.gen, Layer, etc.)
- Cross-file dependency tracking
- Custom pattern matching
- Visualization layer (Cytoscape.js/React Flow integration)
- Performance optimizations for large codebases
- Plugin system for custom analyzers

## Example Graph Output

See `output/ccmanager-graph.json` after running the test for a complete example of the generated graph structure.
