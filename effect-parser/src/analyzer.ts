import {
  Project,
  SourceFile,
  Node,
  SyntaxKind,
  CallExpression,
  PropertyAccessExpression,
  ArrowFunction,
  FunctionExpression,
  TypeChecker,
  Type,
} from "ts-morph";
import { DataFlowGraph } from "./graph.ts";
import type {
  AnalyzerOptions,
  AnalysisResult,
  DataFlowNode,
  DataFlowEdge,
  SourceLocation,
  EffectTypeInfo,
  NodeType,
} from "./types.ts";

export class EffectDataFlowAnalyzer {
  private project: Project;
  private options: Required<AnalyzerOptions>;
  private nodeIdCounter = 0;

  constructor(
    tsConfigPath?: string,
    options: AnalyzerOptions = {}
  ) {
    this.project = tsConfigPath
      ? new Project({ tsConfigFilePath: tsConfigPath })
      : new Project({ compilerOptions: { strict: true } });

    this.options = {
      includeFullAST: options.includeFullAST ?? true,
      includeTypes: options.includeTypes ?? true,
      followImports: options.followImports ?? false,
      maxImportDepth: options.maxImportDepth ?? 2,
      customPatterns: options.customPatterns ?? [],
    };
  }

  /**
   * Add a source file to the project
   */
  addSourceFile(filePath: string): SourceFile {
    return this.project.addSourceFileAtPath(filePath);
  }

  /**
   * Analyze a source file and generate a data flow graph
   */
  analyze(filePath: string): AnalysisResult {
    const errors: Error[] = [];

    try {
      const sourceFile = this.project.addSourceFileAtPath(filePath);
      const graph = new DataFlowGraph(filePath);
      const typeChecker = this.project.getTypeChecker();

      // Find all pipe expressions in the file
      const pipeExpressions = this.findPipeExpressions(sourceFile);

      for (const pipeExpr of pipeExpressions) {
        try {
          this.processPipeExpression(pipeExpr, graph, typeChecker);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          errors.push(new Error(`Error processing pipe expression: ${message}`));
          graph.addWarning(`Failed to process pipe expression: ${message}`);
        }
      }

      return {
        graph: graph.toJSON(),
        errors,
        success: errors.length === 0,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(new Error(`Fatal error during analysis: ${message}`));
      return {
        graph: {
          nodes: [],
          edges: [],
          entryPoints: [],
          exitPoints: [],
          sourceFile: filePath,
          metadata: {
            analyzedAt: new Date().toISOString(),
            effectOperationCount: 0,
            streamOperationCount: 0,
            warnings: [message],
          },
        },
        errors,
        success: false,
      };
    }
  }

  /**
   * Find all pipe() call expressions in the source file
   */
  private findPipeExpressions(sourceFile: SourceFile): CallExpression[] {
    const pipeExpressions: CallExpression[] = [];

    sourceFile.forEachDescendant((node) => {
      if (Node.isCallExpression(node)) {
        const expr = node.getExpression();
        if (Node.isIdentifier(expr) && expr.getText() === "pipe") {
          pipeExpressions.push(node);
        }
      }
    });

    return pipeExpressions;
  }

  /**
   * Process a pipe expression and add nodes/edges to the graph
   */
  private processPipeExpression(
    pipeExpr: CallExpression,
    graph: DataFlowGraph,
    typeChecker: TypeChecker
  ): void {
    const args = pipeExpr.getArguments();

    if (args.length === 0) {
      graph.addWarning("Empty pipe expression found");
      return;
    }

    // Check if this pipe is assigned to a variable
    const variableName = this.getVariableNameForExpression(pipeExpr);
    const pipeName = variableName || "pipe";

    // Create a pipe container node
    const pipeNode = this.createNodeFromExpression(
      pipeExpr,
      "pipe",
      pipeName,
      typeChecker
    );

    // Store the variable name in metadata
    if (variableName) {
      pipeNode.metadata.variableName = variableName;
      pipeNode.metadata.isExported = this.isExportedVariable(pipeExpr);
    }

    graph.addNode(pipeNode);
    graph.addEntryPoint(pipeNode.id);

    let previousNodeId = pipeNode.id;
    let previousNode = pipeNode;

    // Process each argument in the pipe
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const node = this.processExpression(arg, graph, typeChecker);

      if (node) {
        // Create data flow edge from previous node to current
        // Use type information as label instead of step number
        const edgeLabel = this.getEdgeLabel(previousNode, node);

        const edge: DataFlowEdge = {
          source: previousNodeId,
          target: node.id,
          type: "composition",
          order: i,
          label: edgeLabel,
          metadata: {
            sourceType: previousNode.fullType,
            targetType: node.fullType,
          },
        };
        graph.addEdge(edge);
        previousNodeId = node.id;
        previousNode = node;

        // Mark last node as exit point
        if (i === args.length - 1) {
          graph.addExitPoint(node.id);
        }
      }
    }
  }

  /**
   * Process an expression and create a node
   */
  private processExpression(
    expr: Node,
    graph: DataFlowGraph,
    typeChecker: TypeChecker
  ): DataFlowNode | null {
    try {
      if (Node.isCallExpression(expr)) {
        return this.processCallExpression(expr, graph, typeChecker);
      } else if (Node.isArrowFunction(expr) || Node.isFunctionExpression(expr)) {
        return this.processFunction(expr, graph, typeChecker);
      } else if (Node.isIdentifier(expr)) {
        const node = this.createNodeFromExpression(
          expr,
          "variable",
          expr.getText(),
          typeChecker
        );
        graph.addNode(node);
        return node;
      }

      // For other expressions, create a generic node
      const node = this.createNodeFromExpression(
        expr,
        "operation",
        expr.getText().substring(0, 50), // Limit length
        typeChecker
      );
      graph.addNode(node);
      return node;
    } catch (error) {
      graph.addWarning(`Failed to process expression: ${error}`);
      return null;
    }
  }

  /**
   * Process a call expression (e.g., Effect.try, Stream.filter)
   */
  private processCallExpression(
    callExpr: CallExpression,
    graph: DataFlowGraph,
    typeChecker: TypeChecker
  ): DataFlowNode {
    const expr = callExpr.getExpression();
    let operationName = "unknown";

    if (Node.isPropertyAccessExpression(expr)) {
      // e.g., Effect.try, Stream.filter
      operationName = expr.getText();
    } else if (Node.isIdentifier(expr)) {
      // e.g., customFunction()
      operationName = expr.getText();
    }

    const node = this.createNodeFromExpression(
      callExpr,
      "operation",
      operationName,
      typeChecker
    );

    graph.addNode(node);

    // Process arguments and create dependency edges
    const args = callExpr.getArguments();
    for (const arg of args) {
      if (Node.isArrowFunction(arg) || Node.isFunctionExpression(arg)) {
        const funcNode = this.processFunction(arg, graph, typeChecker);
        if (funcNode) {
          const edge: DataFlowEdge = {
            source: funcNode.id,
            target: node.id,
            type: "dependency",
            label: "callback",
            metadata: {},
          };
          graph.addEdge(edge);
        }
      }
    }

    return node;
  }

  /**
   * Process a function (arrow function or function expression)
   */
  private processFunction(
    func: ArrowFunction | FunctionExpression,
    graph: DataFlowGraph,
    typeChecker: TypeChecker
  ): DataFlowNode {
    const node = this.createNodeFromExpression(
      func,
      "lambda",
      "λ",
      typeChecker
    );
    graph.addNode(node);
    return node;
  }

  /**
   * Create a DataFlowNode from a ts-morph Node
   */
  private createNodeFromExpression(
    node: Node,
    type: NodeType,
    name: string,
    typeChecker: TypeChecker
  ): DataFlowNode {
    const id = this.generateNodeId();
    const sourceLocation = this.getSourceLocation(node);
    const fullType = this.options.includeTypes
      ? this.getTypeString(node, typeChecker)
      : undefined;
    const effectType = this.options.includeTypes
      ? this.extractEffectType(node, typeChecker)
      : undefined;

    return {
      id,
      type,
      name,
      effectType,
      fullType,
      sourceLocation,
      metadata: {
        syntaxKind: node.getKindName(),
      },
      astNode: {
        kind: node.getKindName(),
        text: node.getText(),
        ...(this.options.includeFullAST ? this.serializeNode(node) : {}),
      },
    };
  }

  /**
   * Extract Effect type parameters from a node
   */
  private extractEffectType(
    node: Node,
    typeChecker: TypeChecker
  ): EffectTypeInfo | undefined {
    try {
      const type = node.getType();
      const typeText = type.getText();

      // Try to match Effect<Success, Error, Requirements> pattern
      const effectMatch = typeText.match(
        /Effect<([^,]+),\s*([^,]+),\s*([^>]+)>/
      );

      if (effectMatch) {
        return {
          success: effectMatch[1].trim(),
          error: effectMatch[2].trim(),
          requirements: effectMatch[3].trim(),
        };
      }
    } catch (error) {
      // Type information not available or not an Effect type
    }

    return undefined;
  }

  /**
   * Get type string for a node
   */
  private getTypeString(node: Node, typeChecker: TypeChecker): string {
    try {
      return node.getType().getText();
    } catch {
      return "unknown";
    }
  }

  /**
   * Get source location from a node
   */
  private getSourceLocation(node: Node): SourceLocation {
    const sourceFile = node.getSourceFile();
    const start = node.getStartLineNumber();
    const end = node.getEndLineNumber();
    const startPos = node.getStart();
    const endPos = node.getEnd();

    return {
      file: sourceFile.getFilePath(),
      line: start,
      column: startPos - sourceFile.getLineAndColumnAtPos(startPos).line,
      endLine: end,
      endColumn: endPos - sourceFile.getLineAndColumnAtPos(endPos).line,
    };
  }

  /**
   * Serialize a node for full AST capture
   */
  private serializeNode(node: Node): Record<string, any> {
    return {
      kind: node.getKindName(),
      kindNumber: node.getKind(),
      text: node.getText(),
      fullText: node.getFullText(),
      width: node.getWidth(),
      fullWidth: node.getFullWidth(),
      start: node.getStart(),
      end: node.getEnd(),
      // Note: We don't recursively serialize children to avoid massive objects
      // Users can access the full AST through ts-morph if needed
    };
  }

  /**
   * Generate a unique node ID
   */
  private generateNodeId(): string {
    return `node_${this.nodeIdCounter++}`;
  }

  /**
   * Get the variable name if this expression is assigned to a variable
   */
  private getVariableNameForExpression(expr: CallExpression): string | undefined {
    try {
      // Walk up the tree to find a VariableDeclaration
      let parent = expr.getParent();

      while (parent) {
        if (Node.isVariableDeclaration(parent)) {
          const name = parent.getName();
          return name;
        }
        parent = parent.getParent();
      }
    } catch (error) {
      // Failed to find variable declaration
    }

    return undefined;
  }

  /**
   * Check if a variable is exported
   */
  private isExportedVariable(expr: CallExpression): boolean {
    try {
      let parent = expr.getParent();

      while (parent) {
        if (Node.isVariableStatement(parent)) {
          // Check if the statement has an export modifier
          return parent.hasExportKeyword();
        }
        parent = parent.getParent();
      }
    } catch (error) {
      // Failed to determine export status
    }

    return false;
  }

  /**
   * Generate an edge label based on type information
   */
  private getEdgeLabel(sourceNode: DataFlowNode, targetNode: DataFlowNode): string {
    // Try to extract the success type from Effect<Success, Error, Requirements>
    if (sourceNode.effectType) {
      const successType = sourceNode.effectType.success;
      // Simplify long type names
      return this.simplifyTypeName(successType);
    }

    // Fallback to extracting from fullType
    if (sourceNode.fullType) {
      const typeMatch = sourceNode.fullType.match(/Effect<([^,]+)/);
      if (typeMatch) {
        return this.simplifyTypeName(typeMatch[1]);
      }

      // For Stream types
      const streamMatch = sourceNode.fullType.match(/Stream<([^,]+)/);
      if (streamMatch) {
        return this.simplifyTypeName(streamMatch[1]);
      }
    }

    return "";
  }

  /**
   * Simplify type names for display
   */
  private simplifyTypeName(typeName: string): string {
    // Remove import paths
    let simplified = typeName.replace(/import\([^)]+\)\./g, "");

    // Simplify common patterns
    simplified = simplified.replace(/\s*\|\s*/g, " | ");

    // Limit length for edge labels (more generous for readability)
    if (simplified.length > 50) {
      simplified = simplified.substring(0, 47) + "...";
    }

    return simplified;
  }
}
