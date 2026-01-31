/**
 * Standalone script for analyzing Effect files
 * Used by the VSCode extension to analyze files
 */
import { analyzeFile } from "./index.ts";

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: bun run analyze-script.ts <file-path>");
    process.exit(1);
  }

  const filePath = args[0];

  try {
    const result = await analyzeFile(filePath, {
      includeTypes: true,
      includeFullAST: false, // Don't include full AST for performance
    });

    // Output as JSON
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(
      JSON.stringify({
        success: false,
        errors: [
          {
            message: error instanceof Error ? error.message : String(error),
          },
        ],
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
            warnings: ["Failed to analyze file"],
          },
        },
      })
    );
    process.exit(1);
  }
}

main();
