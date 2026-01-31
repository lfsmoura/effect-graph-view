import { analyzeFile } from "./index";
import { writeFile } from "fs/promises";
import { join } from "path";

/**
 * Test the Effect parser with the ccmanager example
 */
async function main() {
  console.log("🔍 Analyzing Effect code...\n");

  const targetFile = "/Users/leonardomoura/dotfiles/apps/ccmanager/index";

  try {
    const result = await analyzeFile(targetFile, {
      includeTypes: true,
      includeFullAST: true,
    });

    console.log("✅ Analysis complete!\n");

    // Print statistics
    const stats = {
      nodeCount: result.graph.nodes.length,
      edgeCount: result.graph.edges.length,
      entryPoints: result.graph.entryPoints.length,
      exitPoints: result.graph.exitPoints.length,
      effectOperations: result.graph.metadata.effectOperationCount,
      streamOperations: result.graph.metadata.streamOperationCount,
    };

    console.log("📊 Graph Statistics:");
    console.log(JSON.stringify(stats, null, 2));
    console.log();

    // Print nodes
    console.log("📦 Nodes:");
    for (const node of result.graph.nodes) {
      if (!node) {
        console.log("  - [warning] undefined node detected");
        continue;
      }
      console.log(
        `  - [${node.type}] ${node.name} (${node.sourceLocation.file}:${node.sourceLocation.line})`
      );
      if (node.effectType) {
        console.log(
          `    Effect<${node.effectType.success}, ${node.effectType.error}, ${node.effectType.requirements}>`
        );
      }
    }
    console.log();

    // Print edges
    console.log("🔗 Edges:");
    for (const edge of result.graph.edges) {
      const sourceNode = result.graph.nodes.find((n) => n.id === edge.source);
      const targetNode = result.graph.nodes.find((n) => n.id === edge.target);
      console.log(
        `  - [${edge.type}] ${sourceNode?.name} → ${targetNode?.name}${edge.label ? ` (${edge.label})` : ""}`
      );
    }
    console.log();

    // Print warnings
    if (result.graph.metadata.warnings.length > 0) {
      console.log("⚠️  Warnings:");
      for (const warning of result.graph.metadata.warnings) {
        console.log(`  - ${warning}`);
      }
      console.log();
    }

    // Print errors
    if (result.errors.length > 0) {
      console.log("❌ Errors:");
      for (const error of result.errors) {
        console.log(`  - ${error.message}`);
      }
      console.log();
    }

    // Export to JSON
    const outputPath = join(
      process.cwd(),
      "output",
      "ccmanager-graph.json"
    );

    // Create output directory
    await writeFile(
      outputPath,
      JSON.stringify(result.graph, null, 2),
      "utf-8"
    ).catch(async (err) => {
      // If directory doesn't exist, create it
      if (err.code === "ENOENT") {
        await import("fs/promises").then(({ mkdir }) =>
          mkdir(join(process.cwd(), "output"), { recursive: true })
        );
        await writeFile(
          outputPath,
          JSON.stringify(result.graph, null, 2),
          "utf-8"
        );
      } else {
        throw err;
      }
    });

    console.log(`💾 Graph exported to: ${outputPath}`);
    console.log();
    console.log("🎉 Done!");
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

main();
