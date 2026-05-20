# Helper CLI Reference

Run the helper directly from GitHub:

```bash
npx -y github:yuryAB/sf-symbols-pipeline -- <command> [options]
```

After npm publication, prefer:

```bash
npx -y sf-symbols-pipeline -- <command> [options]
```

## Commands

- `validate-svg <svg>`: validate an exported SVG with SF Symbols readiness heuristics.
- `inspect-svg <svg>`: inspect groups, paths, fills, strokes, hardcoded paint, bounds, and path complexity.
- `compare-variable-sources`: compare Ultralight-S, Regular-S, and Black-S sources.
- `annotation-plan`: generate a rendering annotation plan.
- `draw-guide-plan`: generate a Draw or Variable Draw guide point plan.
- `magic-replace-plan`: plan replace-friendly symbol families.
- `create-symbolset`: create an Xcode `Assets.xcassets/<name>.symbolset` scaffold.
- `swift-usage`: generate SwiftUI and UIKit snippets.
- `import-checklist`: generate final import and QA checklist artifacts.

All commands print JSON. Commands that accept `--output-dir` also write Markdown/JSON artifacts. Paths may be absolute or relative to the current directory.
