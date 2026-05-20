---
name: sfsp
description: "Use this skill for SF Symbols Pipeline work: custom SF Symbols, exported SVG validation, symbol geometry inspection, variable symbol source comparison, rendering or animation annotation planning, Xcode .symbolset assets, and SwiftUI/UIKit usage snippets."
---

# SF Symbols Pipeline

Use this skill when the user is creating, converting, auditing, or integrating custom SF Symbols for Apple platforms.

## Core Workflow

1. Clarify the symbol name, source SVG path, target rendering modes, animation targets, and desired output folder only when missing.
2. Treat the selected vector editor as the drawing surface. The SF Symbols app remains the authority for template export, import, validation, annotations, preview, and final export.
3. Keep the original source SVG as the fidelity reference for conversions. Make `Regular-M` match before deriving lighter or heavier weights.
4. Run deterministic helper checks when an SVG path is available.
5. Report blockers first, then heuristic warnings, then the next SF Symbols app or Xcode step.
6. Do not claim Apple/SF Symbols app validation is complete unless the user provides evidence from that app.

## Helper CLI

Use the remote helper when deterministic parsing, validation, report writing, or asset scaffolding is useful:

```bash
npx -y github:yuryAB/sf-symbols-pipeline -- validate-svg /path/to/icon.svg
```

Common commands:

```bash
npx -y github:yuryAB/sf-symbols-pipeline -- inspect-svg /path/to/icon.svg
npx -y github:yuryAB/sf-symbols-pipeline -- validate-svg /path/to/final.svg --stage sf-symbol-template-svg
npx -y github:yuryAB/sf-symbols-pipeline -- compare-variable-sources --ultralight Ultralight-S.svg --regular Regular-S.svg --black Black-S.svg
npx -y github:yuryAB/sf-symbols-pipeline -- create-symbolset --symbol-name marquei.calendar.confirmed --source-svg final.svg --output-dir ./Generated
npx -y github:yuryAB/sf-symbols-pipeline -- swift-usage --symbol-name marquei.calendar.confirmed --output-dir ./Generated
```

Paths can be absolute or relative to the current project. No workspace environment variable is required.

## Diagnostic Rules

- Final symbol artwork should not contain raster images, live text, filters, gradients, live strokes, hardcoded paint, or duplicated fill+stroke visual layers.
- For stroke-only source icons, outline strokes while preserving linecap and linejoin.
- For solid icons, boolean-unite overlapping static base geometry into one filled silhouette; leave badges and intentional details separate.
- Separate confirmed structural blockers from heuristic warnings such as overlap risk, possible open paths, and bounds drift.
- SwiftUI custom symbols use `Image("symbolName")`, not `Image(systemName:)`.
- UIKit custom symbols use `UIImage(named:)`, not system-name loading.

## References

Read these only when the task needs more detail:

- `references/workflow.md` for the full SF Symbols pipeline.
- `references/checklists.md` for import, animation, and QA checklists.
- `references/cli.md` for helper command details.
