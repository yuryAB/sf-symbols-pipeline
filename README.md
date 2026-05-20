# SF Symbols Pipeline

SF Symbols Pipeline is an Agent Skill plus a small Node.js helper CLI for custom SF Symbols workflows. It helps agents validate exported SVGs, inspect symbol geometry, compare variable symbol sources, plan SF Symbols app annotations, create Xcode `.symbolset` scaffolds, and generate SwiftUI/UIKit usage snippets.

The skill name is `sfsp`. In Codex, call it manually with:

```text
$sfsp audit this SVG for SF Symbols readiness
```

Agents can also invoke it automatically when the task mentions custom SF Symbols, Xcode symbol assets, SF Symbols SVG templates, `.symbolset` folders, rendering annotations, Draw/Variable Draw, or Swift usage for custom symbols.

## What Changed

This project is no longer an MCP server. There is no `SF_SYMBOLS_WORKSPACE`, no stdio server configuration, and no required folder under Documents. Paths may be absolute or relative to the current project.

## Install The Skill

Install from GitHub with any Agent Skills-compatible tool that supports repository skills. The portable skill lives at:

```text
skills/sfsp/SKILL.md
```

For agents that support the common skills CLI, install with:

```bash
npx skills add yuryAB/sf-symbols-pipeline --skill sfsp
```

If your agent supports project skills directly, copy or reference the `skills/sfsp` folder in the location your agent scans, such as `.agents/skills/sfsp`, `.codex/skills/sfsp`, `.claude/skills/sfsp`, `.windsurf/skills/sfsp`, or `.github/skills/sfsp`.

## Use The Helper CLI

The skill can run the helper directly from GitHub:

```bash
npx -y github:yuryAB/sf-symbols-pipeline -- validate-svg /path/to/icon.svg
```

After npm publication, the shorter command will be:

```bash
npx -y sf-symbols-pipeline -- validate-svg /path/to/icon.svg
```

Local development:

```bash
npm install
npm run build
node dist/index.js --help
```

## Commands

- `resolve-design-environment`
- `create-symbol-brief`
- `validate-svg`
- `inspect-svg`
- `compare-variable-sources`
- `annotation-plan`
- `draw-guide-plan`
- `magic-replace-plan`
- `create-symbolset`
- `swift-usage`
- `import-checklist`

Examples:

```bash
npx -y github:yuryAB/sf-symbols-pipeline -- inspect-svg ./icon.svg
npx -y github:yuryAB/sf-symbols-pipeline -- validate-svg ./final.svg --stage sf-symbol-template-svg
npx -y github:yuryAB/sf-symbols-pipeline -- compare-variable-sources --ultralight ./Ultralight-S.svg --regular ./Regular-S.svg --black ./Black-S.svg
npx -y github:yuryAB/sf-symbols-pipeline -- create-symbolset --symbol-name marquei.calendar.confirmed --source-svg ./final.svg --output-dir ./Generated
npx -y github:yuryAB/sf-symbols-pipeline -- swift-usage --symbol-name marquei.calendar.confirmed --output-dir ./Generated
```

Commands print JSON. Commands with `--output-dir` also write Markdown/JSON artifacts.

## What It Does

- Helps agents choose or set up an SVG-capable vector editor before drawing.
- Points agents toward official Apple SF Symbols template-export and validation steps.
- Validates SVG files with practical SF Symbols readiness checks.
- Inspects SVG groups, paths, ids, fills, strokes, hardcoded paint, approximate bounds, overlap risk, and path complexity.
- Compares variable symbol sources such as `Ultralight-S`, `Regular-S`, and `Black-S`.
- Generates annotation plans, Draw/Variable Draw guide plans, import checklists, Xcode asset scaffolds, and SwiftUI/UIKit snippets.

## What It Does Not Do

- It does not replace the Apple SF Symbols app.
- It does not operate Figma, Illustrator, Sketch, Affinity Designer, Inkscape, or other vector editors directly.
- It does not claim full Apple template validation.
- It does not apply final SF Symbols annotations automatically.
- It does not upload files, run telemetry, or make runtime network calls beyond the package install command you choose to run.

## Recommended Workflow

1. Use the SF Symbols app to export the template for the closest base symbol.
2. Draw or edit in an SVG-capable vector editor while preserving template structure.
3. Keep the original source SVG as the fidelity reference for conversions.
4. Export the SVG from the vector editor.
5. Run `validate-svg` and `inspect-svg`.
6. If using variable templates, run `compare-variable-sources`.
7. Generate annotation, Draw/Variable Draw, and import plans as needed.
8. Import into the SF Symbols app and validate there.
9. Apply rendering and animation annotations in the SF Symbols app.
10. Export the final symbol from the SF Symbols app.
11. Run `validate-svg --stage sf-symbol-template-svg` before Xcode handoff.
12. Run `create-symbolset` and `swift-usage` when app integration is needed.

## Requirements

- Node.js 20 or newer for the helper CLI.
- An Agent Skills-compatible coding agent for the `sfsp` skill.
- macOS with Apple's SF Symbols app for final template export, annotation, validation, and preview.

## Security And Permissions

- No workspace root is required.
- Absolute and relative paths are accepted.
- Existing generated files are not overwritten unless the command supports and receives `--overwrite`.
- Final SF Symbols app validation remains a manual Apple-toolchain step.

## Versioning

GitHub `npx` from `main` follows the branch and can change. Prefer tags or npm releases for stable external users once releases exist.
