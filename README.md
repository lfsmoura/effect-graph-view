# Effect Graph View - VSCode Extension

A Visual Studio Code extension to visualize Effect programs  

## Features

- 🔍 **Parse Effect Code**: Automatically analyzes TypeScript files using Effect
- 📊 **Interactive Visualization**: Beautiful Mermaid diagrams showing data flow
- 🎯 **Click-to-Navigate**: Click on nodes to jump to source code location
- 🔄 **Live Refresh**: Update visualization when code changes
- 📈 **Statistics**: See counts of Effect/Stream operations, nodes, and edges
- 💾 **Export**: Save visualizations as SVG files

## How to Test Locally

### Prerequisites

- VSCode (version 1.80.0 or higher)
- Bun runtime installed
- The `effect-parser` package built in `../effect-parser`

### Method 1: Press F5 (Easiest)

1. **Open the extension folder in VSCode**:
   ```bash
   cd /Users/leonardomoura/dotfiles/apps/effect-parser-vscode
   code .
   ```

2. **Press F5**:
   - This will build the extension and open a new "Extension Development Host" window
   - The extension is automatically loaded in this window

3. **Test the extension**:
   - In the new window, open a TypeScript file with Effect code (e.g., `../ccmanager/index.ts`)
   - Open Command Palette (Cmd+Shift+P / Ctrl+Shift+P)
   - Type "Effect: Visualize Data Flow"
   - Press Enter

4. **See the visualization**:
   - A new panel will open showing the Mermaid diagram
   - Click on nodes to navigate to their source code
   - Use the refresh button to update after code changes

### Method 2: Manual Build and Run

1. **Build the extension**:
   ```bash
   cd /Users/leonardomoura/dotfiles/apps/effect-parser-vscode
   bun run build
   ```

2. **Open in VSCode**:
   ```bash
   code .
   ```

3. **Run Extension**:
   - Press F5, or
   - Go to "Run and Debug" panel (Cmd+Shift+D)
   - Click "Run Extension"

### Method 3: Install as VSIX (For Testing Like Real Extension)

1. **Package the extension**:
   ```bash
   cd /Users/leonardomoura/dotfiles/apps/effect-parser-vscode
   bun run package
   ```

2. **Install the .vsix file**:
   - Open VSCode
   - Go to Extensions (Cmd+Shift+X)
   - Click "..." menu → "Install from VSIX..."
   - Select `effect-data-flow-visualizer-0.1.0.vsix`

3. **Use it**:
   - Open any TypeScript file with Effect code
   - Right-click → "Effect: Visualize Current File"
   - Or use Command Palette → "Effect: Visualize Data Flow"

## Usage

### Commands

The extension provides two commands:

1. **Effect: Visualize Data Flow**
   - Opens visualization for the currently active file
   - Keyboard shortcut: (not set by default)

2. **Effect: Visualize Current File**
   - Same as above, also available in editor context menu
   - Right-click in any TypeScript file to access

### Using the Visualization

Once the visualization panel opens:

- **📊 Statistics**: See node/edge counts and operation types at the top
- **🎨 Legend**: Understand what different node colors and shapes mean
- **🖱️ Click Nodes**: Click any node in the diagram to jump to its source code
- **🔄 Refresh**: Click the refresh button to re-analyze after code changes
- **💾 Export**: Click export to save the diagram as SVG

### Color Coding

- 🟢 **Green**: Entry points (start of pipe expressions)
- 🔴 **Red**: Exit points (final operations)
- 🔵 **Blue Rounded**: Effect operations (Effect.try, Effect.flatMap, etc.)
- 🔵 **Blue Subroutine**: Stream operations (Stream.filter, Stream.mapEffect, etc.)
- 🟠 **Orange Diamonds**: Lambda functions
- ⬜ **White Rectangles**: Pipe containers (named variables)

## Development

### File Structure

```
apps/effect-parser-vscode/
├── package.json           # Extension manifest
├── tsconfig.json         # TypeScript configuration
├── src/
│   └── extension.ts      # Main extension code
├── dist/                 # Compiled output
│   └── extension.js
└── .vscode/
    ├── launch.json       # Debug configuration
    └── tasks.json        # Build tasks
```

### Making Changes

1. **Edit code**: Modify `src/extension.ts`
2. **Rebuild**: Run `bun run build` or use watch mode `bun run watch`
3. **Reload**: In the Extension Development Host, press Cmd+R (Ctrl+R) to reload
4. **Debug**: Set breakpoints in `src/extension.ts` and use F5

### Watch Mode

For continuous development:

```bash
bun run watch
```

This will automatically rebuild when you save files. You still need to reload the Extension Development Host (Cmd+R).

## Debugging

### Extension Host Logs

- Open "Output" panel in the Extension Development Host
- Select "Extension Host" from the dropdown
- See console.log output from the extension

### Debugging the Analyzer

The extension spawns a Bun process to run the analyzer. To debug analyzer issues:

1. Check the terminal output in the Extension Development Host
2. Run the analyzer directly:
   ```bash
   bun run ../effect-parser/src/analyze-script.ts path/to/file.ts
   ```

### Common Issues

**Issue**: "Analyzer failed with code 1"
- **Solution**: Make sure the `effect-parser` package is built: `cd ../effect-parser && bun install`

**Issue**: "No active editor found"
- **Solution**: Make sure you have a TypeScript file open and active

**Issue**: Diagram doesn't show
- **Solution**: Check the webview console (right-click webview → "Open Webview Developer Tools")

## Troubleshooting

### Extension doesn't activate
1. Check VSCode version (needs 1.80.0+)
2. Make sure you opened a TypeScript file
3. Check Output → Extension Host for errors

### Bun not found
1. Install Bun: `curl -fsSL https://bun.sh/install | bash`
2. Make sure Bun is in your PATH
3. Restart VSCode

### Build fails
1. Run `bun install` in the extension directory
2. Check for TypeScript errors: `bun run build`
3. Make sure `@types/vscode` is installed

## Contributing

This extension uses:
- **VSCode Extension API**: For integration with VSCode
- **Effect Parser**: Your custom Effect data flow analyzer
- **Mermaid.js**: For diagram rendering
- **Bun**: For running the analyzer

## License

MIT
