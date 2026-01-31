import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { generateMermaidDoc } from "./mermaid";
import type { DataFlowGraphData } from "./types";

/**
 * Generate Mermaid visualization from a graph JSON file
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: bun run src/generate-viz.ts <input-json> [output-md]");
    console.log("\nExample:");
    console.log(
      "  bun run src/generate-viz.ts output/ccmanager-graph.json output/visualization.md"
    );
    process.exit(1);
  }

  const inputPath = args[0];
  const outputPath = args[1] || inputPath.replace(".json", ".md");

  try {
    console.log(`📖 Reading graph from ${inputPath}...`);
    const jsonContent = await readFile(inputPath, "utf-8");
    const graph: DataFlowGraphData = JSON.parse(jsonContent);

    console.log(`🎨 Generating Mermaid visualization...`);
    const title = `Data Flow: ${graph.sourceFile.split("/").pop()}`;
    const markdown = generateMermaidDoc(graph, title);

    console.log(`💾 Writing visualization to ${outputPath}...`);
    await writeFile(outputPath, markdown, "utf-8");

    console.log(`✅ Done! Mermaid visualization created at ${outputPath}`);
    console.log("\nYou can now:");
    console.log("  1. View it in VS Code with Mermaid extension");
    console.log("  2. Copy to GitHub/GitLab markdown");
    console.log("  3. Use in documentation");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
