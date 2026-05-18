# SF Symbols Pipeline MCP

SF Symbols Pipeline MCP is a platform-agnostic Model Context Protocol server for custom SF Symbols workflows. It helps agents and MCP clients choose an SVG-capable vector workflow, validate exported SVGs, inspect symbol geometry, create repeatable pipeline reports, and generate Xcode and Swift helper artifacts.

The project is MCP first. Codex Plugin support is an optional integration layer for discovery and branding inside Codex, not the core distribution model.

## What is SF Symbols Pipeline MCP

This repository packages a TypeScript/Node MCP server that runs over stdio. Any MCP client that can launch a local command can use it with:

```bash
npx -y github:yuryAB/sf-symbols-pipeline-mcp
```

The server exposes MCP tools, resources, and prompts for iOS and macOS teams preparing custom SF Symbols from design exports.

## What it does

- Helps agents choose or set up an SVG-capable vector editor before drawing.
- Points agents to official Apple SF Symbols resources and template-export guidance.
- Validates exported SVG files with practical SF Symbols readiness checks.
- Inspects SVG groups, paths, ids, fills, strokes, hardcoded paint, approximate bounds, overlap risk, and path complexity.
- Compares variable symbol sources such as Ultralight-S, Regular-S, and Black-S, including structural compatibility and approximate bounds drift.
- Generates annotation plans, Draw and Variable Draw guide plans, import checklists, Xcode asset scaffolds, and SwiftUI/UIKit snippets.
- Constrains all file reads and writes to `SF_SYMBOLS_WORKSPACE` or the process current working directory.

## What it does not do

- It does not replace editor-specific MCPs or design tools.
- It does not operate Figma, Illustrator, Sketch, Affinity Designer, Inkscape, or other vector editors directly.
- It does not replace the Apple SF Symbols app.
- It does not claim full Apple template validation.
- It does not apply final SF Symbols annotations automatically.
- It does not upload files, run telemetry, execute arbitrary shell commands, or access files outside the configured workspace.

## Who it is for

Use this server if you build custom symbols for Apple platforms and want repeatable checks between design tools, the SF Symbols app, Xcode asset catalogs, SwiftUI, and UIKit.

It is useful for Codex, Claude Desktop, Claude Code, Cursor, Windsurf, other MCP clients, and custom agents.

## Vector editor relationship

Use whichever SVG-capable vector editor the agent can reliably operate: Figma, Illustrator, Sketch, Affinity Designer, Inkscape, or another tool that preserves SVG paths and layer structure. This MCP can guide editor selection with `resolve_design_environment`, but it does not inspect the host agent's tools by itself. Pass available editor/tool hints when possible.

Treat the selected vector editor as a drawing surface. The SF Symbols app remains the authority for template export, import, validation, annotation, preview, and final export.

## Use with any MCP client

Configure a stdio MCP server with:

```json
{
  "mcpServers": {
    "sf-symbols-pipeline": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "github:yuryAB/sf-symbols-pipeline-mcp"],
      "env": {
        "SF_SYMBOLS_WORKSPACE": "/absolute/path/to/icon-workspace"
      }
    }
  }
}
```

If `SF_SYMBOLS_WORKSPACE` is omitted, the server uses the process current working directory. Many desktop clients spawn MCP servers from their own app directory, so an explicit workspace is recommended.

## Use with Claude Desktop

Claude Desktop local MCP configuration uses `claude_desktop_config.json`. Add the server under `mcpServers`:

```json
{
  "mcpServers": {
    "sf-symbols-pipeline": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "github:yuryAB/sf-symbols-pipeline-mcp"],
      "env": {
        "SF_SYMBOLS_WORKSPACE": "/absolute/path/to/icon-workspace"
      }
    }
  }
}
```

Remote Claude connectors are separate from local `claude_desktop_config.json` servers. This package currently documents the stdio command path.

## Use with Cursor

Create `.cursor/mcp.json` in a project or `~/.cursor/mcp.json` globally:

```json
{
  "mcpServers": {
    "sf-symbols-pipeline": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "github:yuryAB/sf-symbols-pipeline-mcp"],
      "env": {
        "SF_SYMBOLS_WORKSPACE": "/absolute/path/to/icon-workspace"
      }
    }
  }
}
```

## Use with Windsurf

Open Windsurf Cascade's raw MCP config, usually `~/.codeium/windsurf/mcp_config.json`, and add:

```json
{
  "mcpServers": {
    "sf-symbols-pipeline": {
      "command": "npx",
      "args": ["-y", "github:yuryAB/sf-symbols-pipeline-mcp"],
      "env": {
        "SF_SYMBOLS_WORKSPACE": "/absolute/path/to/icon-workspace"
      }
    }
  }
}
```

## Use with Codex

As a normal MCP server, configure Codex to launch:

```bash
npx -y github:yuryAB/sf-symbols-pipeline-mcp
```

The optional Codex Plugin lives in `plugins/codex/`. It bundles a Codex skill and `.mcp.json` that point back to this same independent MCP server.

## Use directly with npx from GitHub

```bash
SF_SYMBOLS_WORKSPACE=/absolute/path/to/icon-workspace \
npx -y github:yuryAB/sf-symbols-pipeline-mcp
```

For help:

```bash
npx -y github:yuryAB/sf-symbols-pipeline-mcp --help
```

## Future npm usage

The package is prepared for npm publication but is not published by this repository change. After publication, the simpler command should be:

```bash
npx -y sf-symbols-pipeline-mcp
```

Until then, use the GitHub `npx` command.

## Available tools

- `resolve_design_environment`
- `create_symbol_brief`
- `validate_svg_template`
- `inspect_svg_geometry`
- `compare_variable_sources`
- `generate_annotation_plan`
- `generate_draw_guide_plan`
- `generate_magic_replace_plan`
- `create_xcassets_symbol_set`
- `generate_swift_usage`
- `generate_import_checklist`

## Example workflow

1. Run `resolve_design_environment` to choose the vector editor/tooling and get official Apple links.
2. Use the SF Symbols app to export the template for the closest base symbol.
3. Create or edit the symbol design in the selected SVG-capable vector editor.
4. When converting an existing icon, keep the original SVG as the geometry reference and make Regular-M the fidelity anchor.
5. For stroke-only sources, outline strokes while preserving linecap/linejoin; for solid sources, boolean-unite static overlapping bases instead of scaling or duplicating fill+stroke layers.
6. Export the SVG from the selected vector editor.
7. Run `validate_svg_template` with the default `artwork-svg` stage for vector-editor preflight.
8. Run `inspect_svg_geometry`.
9. If using variable templates, run `compare_variable_sources` and inspect bounds drift.
10. Run `generate_annotation_plan`.
11. If using Draw/Variable Draw, run `generate_draw_guide_plan`.
12. Run `generate_import_checklist`.
13. Import the SVG into the SF Symbols app.
14. Validate the template in the SF Symbols app.
15. Apply rendering/animation annotations manually or semi-manually.
16. Export final symbol from SF Symbols app.
17. Run `validate_svg_template` with `stage: "sf-symbol-template-svg"` before Xcode handoff.
18. Run `create_xcassets_symbol_set` when an asset catalog or Xcode integration is needed.
19. Run `generate_swift_usage`.
20. Test in Xcode previews/device.

## Resources

- `sf-symbols://guidelines/custom-symbols`
- `sf-symbols://guidelines/vector-editor-to-sf-symbols`
- `sf-symbols://guidelines/figma-to-sf-symbols`
- `sf-symbols://guidelines/path-compatibility`
- `sf-symbols://guidelines/rendering-modes`
- `sf-symbols://guidelines/animation-readiness`
- `sf-symbols://guidelines/draw-and-variable-draw`
- `sf-symbols://guidelines/xcode-import`
- `sf-symbols://resources/apple-official-links`
- `sf-symbols://checklists/import-ready`
- `sf-symbols://checklists/animation-ready`
- `sf-symbols://checklists/qa`
- `sf-symbols://project/naming-conventions`
- `sf-symbols://project/output-structure`

## Prompts

- `create_custom_symbol`: create a structured workflow from brief to import.
- `audit_custom_symbol`: validate, inspect, and plan fixes for an exported SVG.
- `prepare_draw_animation`: plan Draw or Variable Draw preparation.
- `prepare_magic_replace_family`: plan a replace-friendly symbol family.
- `generate_icon_family`: plan coherent naming, structure, rendering, and animation for a family.

## Tool reference

### `resolve_design_environment`

Returns structured guidance for the agent before drawing: recommended vector editor, confidence, next steps, setup instructions, official Apple links, and warnings.

Inputs include `symbolName`, optional `userRequestedEditor`, optional `availableAgentTools`, optional `platform`, and optional `needsSetupHelp`.

### `create_symbol_brief`

Creates a normalized brief from user intent. Optionally writes `brief.md` and `brief.json`.

### `validate_svg_template`

Validates an exported SVG with practical SF Symbols readiness heuristics. The default stage is `artwork-svg`, intended for vector-editor exports before final SF Symbols app import:

- file exists and is SVG
- XML parses safely
- no raster `<image>` tags
- no live text
- detects filters, gradients, strokes, missing `viewBox`, missing groups, missing IDs, generic IDs, and likely open paths
- estimates path bounds and reports final-template quality diagnostics for hardcoded paint, fill/stroke duplication, overlapping filled paths, and edge-touching filled paths that may preview as cuts or seams

Use `stage: "sf-symbol-template-svg"` for final SVGs intended for SF Symbols/Xcode import. This stage requires `Notes`, `Guides`, `Symbols`, `template-version`, `Baseline-S/M/L`, `Capline-S/M/L`, target margins such as `left-margin-Regular-M`, and a target glyph group such as `Regular-M` with path data. Text is allowed only inside `Notes` in this stage. Final Symbols artwork with hardcoded fill/stroke colors is rejected so custom symbols remain tintable in Xcode.

Optionally writes `validation-report.json` and `validation-report.md`.

### `inspect_svg_geometry`

Returns a readable structural map of groups and paths, including ids, labels, parent groups, command counts, estimated point counts, fill/stroke flags, paint values, hardcoded-paint flags, approximate bounds/area, and likely closed-path status. Optionally writes `geometry-report.json` and `geometry-report.md`.

### `compare_variable_sources`

Compares Ultralight-S, Regular-S, and Black-S SVG sources. It checks path counts, likely path order, estimated point counts, fill/stroke consistency, command signatures, group structure, and approximate path-bounds stability. Point and bounds checks are heuristic and reported as `pointCountLikelyMatches` and `boundsLikelyStable`.

Optionally writes `variable-compatibility-report.json` and `variable-compatibility-report.md`.

### `generate_annotation_plan`

Generates a human/agent-readable SF Symbols app annotation plan for monochrome, hierarchical, palette, and multicolor rendering. It includes layer separation, clear-behind/overlap notes, and warnings. Optionally writes `annotation-plan.md` and `annotation-plan.json`.

### `generate_draw_guide_plan`

Generates a Draw/Variable Draw guide point plan, including participating layers, static layers, attachments, Regular-first workflow, and variable-template reminders. Optionally writes `draw-guide-plan.md` and `draw-guide-plan.json`.

### `generate_magic_replace_plan`

Generates a structure plan for related symbols that should transition well with replace effects. Optionally writes `magic-replace-plan.md` and `magic-replace-plan.json`.

### `create_xcassets_symbol_set`

Creates:

```text
Assets.xcassets/
  <symbolName>.symbolset/
    Contents.json
    <symbolName>.svg
```

The SVG is copied only when `sourceSvgPath` is provided. When a source is provided, the tool first validates it with `stage: "sf-symbol-template-svg"` and refuses to write a partial `.symbolset` if final template blockers are found. Existing files are not overwritten unless `overwrite: true` is passed. The generated `Contents.json` is intentionally conservative; verify/import in Xcode.

### `generate_swift_usage`

Generates SwiftUI and UIKit snippets. SwiftUI examples use `Image("symbolName")`, not `Image(systemName:)`. UIKit examples use `UIImage(named:)`, not system-name loading.

### `generate_import_checklist`

Generates a final import/testing checklist covering vector editor export, SVG sanity, SF Symbols app validation, rendering annotations, draw annotations, Xcode import, SwiftUI usage, animation tests, accessibility, light/dark mode, and QA sign-off.

## Requirements

- Node.js 20 or newer.
- An MCP client that supports stdio command servers.
- A workspace folder containing exported SVGs and generated reports.

## Troubleshooting

- If the client cannot start the server, verify `node`, `npm`, and `npx` are available in the environment used by the desktop app.
- If tools cannot find files, set `SF_SYMBOLS_WORKSPACE` to an absolute workspace path.
- If GitHub `npx` is slow, publish to npm or pin a GitHub tag once releases are created.
- If a client ignores visual metadata, that is client-dependent behavior.

## Security / permissions

- No runtime network calls are made by the MCP tools.
- No telemetry, uploads, arbitrary shell execution, or `eval`.
- File reads and writes are constrained to the configured workspace root.
- Existing generated files are not overwritten unless a tool explicitly supports and receives `overwrite: true`.

## Versioning

GitHub `npx` from `main` follows the branch and can change. Prefer tags or npm releases for stable external users.

Future npm releases should follow semver and be validated with:

```bash
npm install
npm run build
npm test
npm pack --dry-run
```

## Assets / branding

Public MCP metadata references PNG icons under `assets/`. MCP clients may display or ignore these icons. The optional Codex Plugin has its own `composerIcon`, `logo`, `brandColor`, and `displayName` metadata under `plugins/codex/`.

## Difference between MCP server and Codex Plugin

The MCP server is the product: a reusable, client-agnostic tool server.

The Codex Plugin is an optional wrapper that improves discovery and usage inside Codex by bundling a skill, plugin metadata, and an MCP server config. It does not replace npm/GitHub distribution and should not be required by Claude, Cursor, Windsurf, or custom MCP clients.

## Documentation

- `docs/compatibility.md`
- `docs/publishing.md`
- `docs/clients/claude-desktop.md`
- `docs/clients/cursor.md`
- `docs/clients/windsurf.md`
- `docs/clients/generic-mcp.md`
