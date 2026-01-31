import * as vscode from "vscode";
import * as path from "path";

// Import the analyzer from the effect-parser package
// Since we're in the same workspace, we'll use relative path for now
const analyzerPath = path.join(__dirname, "../effect-parser/src/index.ts");

/**
 * Activate the extension
 */
export function activate(context: vscode.ExtensionContext) {
  console.log("Effect Data Flow Visualizer is now active!");

  // Register the visualize command
  const visualizeCommand = vscode.commands.registerCommand(
    "effect-parser.visualize",
    async () => {
      await visualizeEffectDataFlow(context);
    }
  );

  const visualizeCurrentCommand = vscode.commands.registerCommand(
    "effect-parser.visualizeCurrentFile",
    async () => {
      await visualizeEffectDataFlow(context);
    }
  );

  context.subscriptions.push(visualizeCommand, visualizeCurrentCommand);
}

/**
 * Main visualization function
 */
async function visualizeEffectDataFlow(context: vscode.ExtensionContext) {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    vscode.window.showErrorMessage("No active editor found");
    return;
  }

  const document = editor.document;

  // Only process TypeScript files
  if (
    document.languageId !== "typescript" &&
    document.languageId !== "typescriptreact"
  ) {
    vscode.window.showErrorMessage(
      "This command only works with TypeScript files"
    );
    return;
  }

  const filePath = document.uri.fsPath;

  try {
    // Show progress
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Analyzing Effect data flow...",
        cancellable: false,
      },
      async (progress) => {
        progress.report({ increment: 30, message: "Parsing file..." });

        // Analyze the file
        const result = await analyzeFile(filePath);

        if (!result.success || result.errors.length > 0) {
          vscode.window.showWarningMessage(
            `Analysis completed with ${result.errors.length} errors`
          );
        }

        progress.report({ increment: 40, message: "Generating graph..." });

        // Generate Mermaid code
        const mermaidCode = generateMermaid(result.graph);

        progress.report({ increment: 20, message: "Creating visualization..." });

        // Create and show webview
        const panel = vscode.window.createWebviewPanel(
          "effectDataFlow",
          `Effect Flow: ${path.basename(filePath)}`,
          vscode.ViewColumn.Two,
          {
            enableScripts: true,
            retainContextWhenHidden: true,
          }
        );

        // Set webview content
        panel.webview.html = getWebviewContent(
          mermaidCode,
          result.graph,
          filePath
        );

        // Handle messages from webview
        panel.webview.onDidReceiveMessage(
          async (message) => {
            switch (message.command) {
              case "navigateToNode":
                await navigateToNode(message.node);
                break;
              case "refresh":
                const newResult = await analyzeFile(filePath);
                const newMermaid = generateMermaid(newResult.graph);
                panel.webview.postMessage({
                  command: "updateGraph",
                  mermaid: newMermaid,
                  graph: newResult.graph,
                });
                break;
            }
          },
          undefined,
          context.subscriptions
        );

        progress.report({ increment: 10, message: "Done!" });
      }
    );
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to analyze file: ${error instanceof Error ? error.message : String(error)}`
    );
    console.error("Analysis error:", error);
  }
}

/**
 * Analyze a TypeScript file using the effect-parser
 */
async function analyzeFile(filePath: string): Promise<any> {
  // For now, we'll use dynamic import with Bun
  // In a real extension, you'd bundle this differently
  const bunExe = process.platform === "win32" ? "bun.exe" : "bun";

  return new Promise((resolve, reject) => {
    const { spawn } = require("child_process");

    const analyzerScript = path.join(
      __dirname,
      "../../effect-parser/src/analyze-script.ts"
    );

    const proc = spawn(bunExe, ["run", analyzerScript, filePath]);

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", (code: number) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse analyzer output: ${error}`));
        }
      } else {
        reject(new Error(`Analyzer failed with code ${code}: ${stderr}`));
      }
    });

    proc.on("error", (error: Error) => {
      reject(error);
    });
  });
}

/**
 * Generate Mermaid diagram from graph data
 */
function generateMermaid(graph: any): string {
  const lines: string[] = [];

  lines.push("flowchart TD");
  lines.push("");

  // Add nodes
  for (const node of graph.nodes) {
    if (!node) continue;
    const nodeId = sanitizeId(node.id);
    const label = sanitizeLabel(node.name);
    const shape = getNodeShape(node);
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
  if (graph.entryPoints.length > 0) {
    const entryIds = graph.entryPoints.map(sanitizeId).join(",");
    lines.push("  classDef entryClass fill:#e1f5e1,stroke:#4caf50,stroke-width:3px;");
    lines.push(`  class ${entryIds} entryClass;`);
  }

  if (graph.exitPoints.length > 0) {
    const exitIds = graph.exitPoints.map(sanitizeId).join(",");
    lines.push("  classDef exitClass fill:#ffe1e1,stroke:#f44336,stroke-width:3px;");
    lines.push(`  class ${exitIds} exitClass;`);
  }

  return lines.join("\n");
}

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, "_");
}

function sanitizeLabel(label: string): string {
  return label.replace(/"/g, '\\"').replace(/\n/g, " ").substring(0, 50);
}

function getNodeShape(node: any): [string, string] {
  switch (node.type) {
    case "pipe":
      return ["[", "]"];
    case "operation":
      if (node.name.startsWith("Effect.")) {
        return ["([", "])"];
      } else if (node.name.startsWith("Stream.")) {
        return ["[[", "]]"];
      }
      return ["(", ")"];
    case "lambda":
      return ["{", "}"];
    default:
      return ["[", "]"];
  }
}

/**
 * Navigate to a node's source location
 */
async function navigateToNode(node: any) {
  try {
    const location = node.sourceLocation;
    const uri = vscode.Uri.file(location.file);
    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document);

    // Navigate to the line
    const position = new vscode.Position(location.line - 1, location.column);
    const range = new vscode.Range(position, position);

    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to navigate to node: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate webview HTML content
 */
function getWebviewContent(
  mermaidCode: string,
  graph: any,
  filePath: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Effect Data Flow</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <style>
        body {
            padding: 20px;
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }

        h1 {
            font-size: 1.5em;
            margin-bottom: 10px;
        }

        .stats {
            margin: 20px 0;
            padding: 15px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 5px;
        }

        .stats h2 {
            font-size: 1.2em;
            margin-top: 0;
            margin-bottom: 10px;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
        }

        .stat-item {
            padding: 8px;
            background-color: var(--vscode-input-background);
            border-radius: 3px;
        }

        .stat-label {
            font-size: 0.9em;
            opacity: 0.7;
        }

        .stat-value {
            font-size: 1.5em;
            font-weight: bold;
            color: var(--vscode-charts-blue);
        }

        .mermaid-container {
            margin: 20px 0;
            padding: 20px;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 5px;
            overflow: auto;
        }

        .controls {
            margin: 20px 0;
            display: flex;
            gap: 10px;
        }

        button {
            padding: 8px 16px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 14px;
        }

        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .legend {
            margin: 20px 0;
            padding: 15px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 5px;
        }

        .legend h2 {
            font-size: 1.1em;
            margin-top: 0;
            margin-bottom: 10px;
        }

        .legend ul {
            margin: 0;
            padding-left: 20px;
        }

        .legend li {
            margin: 5px 0;
        }

        #mermaid-diagram svg {
            max-width: 100%;
            height: auto;
        }

        .node-details {
            margin-top: 20px;
            padding: 15px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 5px;
            display: none;
        }

        .node-details.visible {
            display: block;
        }
    </style>
</head>
<body>
    <h1>Effect Data Flow Visualization</h1>
    <p><strong>File:</strong> ${path.basename(filePath)}</p>

    <div class="controls">
        <button onclick="refreshGraph()">🔄 Refresh</button>
        <button onclick="exportSVG()">💾 Export SVG</button>
    </div>

    <div class="stats">
        <h2>📊 Graph Statistics</h2>
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-label">Nodes</div>
                <div class="stat-value">${graph.nodes.length}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Edges</div>
                <div class="stat-value">${graph.edges.length}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Entry Points</div>
                <div class="stat-value">${graph.entryPoints.length}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Effect Operations</div>
                <div class="stat-value">${graph.metadata.effectOperationCount}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Stream Operations</div>
                <div class="stat-value">${graph.metadata.streamOperationCount}</div>
            </div>
        </div>
    </div>

    <div class="legend">
        <h2>🎨 Legend</h2>
        <ul>
            <li>🟢 <strong>Green nodes:</strong> Entry points (start of pipe expressions)</li>
            <li>🔴 <strong>Red nodes:</strong> Exit points (final operations)</li>
            <li>🔵 <strong>Blue rounded:</strong> Effect operations</li>
            <li>🔵 <strong>Blue subroutine:</strong> Stream operations</li>
            <li>🟠 <strong>Orange diamonds:</strong> Lambda functions</li>
            <li>⬜ <strong>White rectangles:</strong> Pipe containers</li>
        </ul>
    </div>

    <div class="mermaid-container">
        <div id="mermaid-diagram" class="mermaid">
${mermaidCode}
        </div>
    </div>

    <div class="node-details" id="nodeDetails">
        <h3>Node Details</h3>
        <div id="nodeDetailsContent"></div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        // Initialize Mermaid
        mermaid.initialize({
            startOnLoad: true,
            theme: document.body.classList.contains('vscode-dark') ? 'dark' : 'default',
            flowchart: {
                useMaxWidth: true,
                htmlLabels: true,
                curve: 'basis'
            }
        });

        // Store graph data
        let graphData = ${JSON.stringify(graph)};

        // Handle node clicks
        document.addEventListener('click', (e) => {
            const target = e.target;

            // Check if clicked on a node
            if (target.closest('.node')) {
                const nodeElement = target.closest('.node');
                const nodeId = nodeElement.id;

                // Find node in graph data
                const node = graphData.nodes.find(n =>
                    n && n.id.replace(/[^a-zA-Z0-9_]/g, '_') === nodeId
                );

                if (node) {
                    showNodeDetails(node);
                    // Send message to extension to navigate
                    vscode.postMessage({
                        command: 'navigateToNode',
                        node: node
                    });
                }
            }
        });

        function showNodeDetails(node) {
            const details = document.getElementById('nodeDetails');
            const content = document.getElementById('nodeDetailsContent');

            let html = '<table style="width: 100%;">';
            html += '<tr><td><strong>Name:</strong></td><td>' + node.name + '</td></tr>';
            html += '<tr><td><strong>Type:</strong></td><td>' + node.type + '</td></tr>';
            html += '<tr><td><strong>Location:</strong></td><td>' + node.sourceLocation.file.split('/').pop() + ':' + node.sourceLocation.line + '</td></tr>';

            if (node.effectType) {
                html += '<tr><td><strong>Effect Type:</strong></td><td>Effect&lt;' +
                    node.effectType.success + ', ' +
                    node.effectType.error + ', ' +
                    node.effectType.requirements + '&gt;</td></tr>';
            }

            html += '</table>';

            content.innerHTML = html;
            details.classList.add('visible');
        }

        function refreshGraph() {
            vscode.postMessage({ command: 'refresh' });
        }

        function exportSVG() {
            const svg = document.querySelector('#mermaid-diagram svg');
            if (svg) {
                const svgData = new XMLSerializer().serializeToString(svg);
                const blob = new Blob([svgData], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'effect-flow.svg';
                a.click();
            }
        }

        // Listen for messages from extension
        window.addEventListener('message', event => {
            const message = event.data;

            switch (message.command) {
                case 'updateGraph':
                    graphData = message.graph;
                    document.getElementById('mermaid-diagram').innerHTML = message.mermaid;
                    mermaid.init(undefined, document.getElementById('mermaid-diagram'));
                    break;
            }
        });
    </script>
</body>
</html>`;
}

export function deactivate() {}
