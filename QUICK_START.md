# Quick Start Guide

## 🚀 Test the Extension in 60 Seconds

### Step 1: Open the Extension

```bash
cd /Users/leonardomoura/dotfiles/apps/effect-parser-vscode
code .
```

### Step 2: Press F5

- This opens a new VSCode window with the extension loaded
- Wait for the build to complete (~2 seconds)

### Step 3: Open a Test File

In the new window that opened:

```bash
# Use Command Palette (Cmd+Shift+P):
> Open File...

# Navigate to:
/Users/leonardomoura/dotfiles/apps/ccmanager/index.ts
```

### Step 4: Run the Visualizer

- Press **Cmd+Shift+P** (or Ctrl+Shift+P)
- Type: **"Effect: Visualize Data Flow"**
- Press Enter

### Step 5: Explore! 🎉

You should now see:
- A Mermaid diagram with your Effect data flow
- Statistics showing node counts
- Color-coded nodes (green = entry, red = exit)

**Try clicking on nodes** - it will jump to that code location!

---

## 📝 What You're Looking At

The diagram shows:

- **program** - Your main pipe expression (named variable)
- **onSessionFileChange** - Another pipe expression
- **processFileEvent** - Third pipe expression
- All the operations flowing through them

### Node Types:

- 📦 **Rectangles**: Pipe containers (program, onSessionFileChange, etc.)
- 🔵 **Rounded rectangles**: Effect operations (Effect.try, Effect.flatMap)
- 🔵 **Subroutines**: Stream operations (Stream.filter, Stream.mapEffect)
- 💎 **Diamonds**: Lambda functions (callbacks)

### Edge Labels:

- Show the **type** flowing between operations
- e.g., `string`, `void`, `[string, string]`

---

## 🔧 Troubleshooting

### "Extension Development Host" doesn't open?
- Make sure you pressed F5 while in the `effect-parser-vscode` folder
- Check the "Terminal" panel for build errors

### No diagram appears?
- Check if the file is TypeScript (.ts)
- Open the Output panel → "Extension Host" to see logs
- Make sure the file has Effect code (pipe expressions)

### "Analyzer failed" error?
- Build the analyzer: `cd ../effect-parser && bun install`
- Test it manually: `bun run ../effect-parser/src/analyze-script.ts ../ccmanager/index.ts`

---

## 🎯 Next Steps

### Try Your Own Code

Create a simple Effect file:

```typescript
import { Effect, pipe } from "effect";

export const myProgram = pipe(
  Effect.succeed(42),
  Effect.map(n => n * 2),
  Effect.tap(n => Effect.log(`Result: ${n}`))
);
```

Visualize it!

### Make Changes

1. Edit the extension code in `src/extension.ts`
2. The extension will rebuild automatically (if using watch mode)
3. Press **Cmd+R** in the Extension Development Host to reload
4. Run the visualizer again

### Package for Installation

```bash
bun run package
```

This creates a `.vsix` file you can install in any VSCode instance.

---

## 💡 Pro Tips

- **Right-click** in any TypeScript file → "Effect: Visualize Current File"
- **Export SVG** button to save diagrams
- **Refresh** button to re-analyze after editing code
- Click nodes to **jump to source code**

---

## 🐛 Debug Mode

Want to debug the extension itself?

1. Set a breakpoint in `src/extension.ts`
2. Press F5
3. Run the visualizer command
4. VSCode will stop at your breakpoint!

---

## ✨ That's It!

You now have a working VSCode extension that visualizes Effect data flows!

Questions? Check the full README.md or the source code in `src/extension.ts`.
