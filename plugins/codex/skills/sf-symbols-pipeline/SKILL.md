---
name: sf-symbols-pipeline
description: Use the SF Symbols Pipeline MCP server to validate custom SF Symbols SVGs, inspect geometry, generate annotation/import plans, and produce Xcode or Swift helper artifacts.
---

# SF Symbols Pipeline

Use this skill when the user is working on custom SF Symbols for iOS, macOS, watchOS, visionOS, or related Apple platform asset pipelines.

## When to use

- The user has exported SVGs from Figma, Illustrator, Sketch, or another vector tool and wants SF Symbols readiness checks.
- The user needs help choosing an SVG-capable editor or setup path before drawing a custom symbol.
- The user wants geometry inspection, path/group diagnostics, variable symbol source comparison, annotation planning, Draw/Variable Draw planning, import checklists, Xcode `.symbolset` scaffolds, or Swift usage snippets.
- The user asks for repeatable pipeline artifacts for custom SF Symbols.

## When not to use

- Do not use this as a replacement for the official SF Symbols app.
- Do not use this to directly operate Figma or another design tool.
- Do not claim complete Apple template validation.
- Do not use it for unrelated SVG optimization, logo design, or general icon generation unless the target is a custom SF Symbol.

## Operating principles

- Treat the MCP server as the source of executable capabilities.
- Inspect the available MCP tools before promising a workflow.
- If a tool is missing, say which capability is unavailable and continue with a manual recommendation.
- Ask for the minimum context needed: workspace path, SVG path, symbol name, target rendering modes, variable symbol sources, and desired output files.
- Keep outputs focused on custom SF Symbols readiness and next steps in the Apple toolchain.
- For third-party icon conversion, keep the original SVG as the geometry source of truth. Do not redraw from memory or from an already-broken symbolset.
- Treat `Regular-M` as the fidelity anchor. It should visually match the original icon before extrapolating Ultralight or Black.
- For stroke-only source icons, outline strokes while preserving linecap and linejoin. For solid icons, avoid scaling the entire shape just to fake weight.
- For solid bases made from overlapping filled parts, boolean-unite static base geometry into one filled silhouette before final export; leave only intentional badges/details as separate layers.
- Final template artwork inside `Symbols` must not carry hardcoded `fill="#..."`, named colors, live `stroke`, filters, gradients, or duplicated fill+stroke visual layers.

## Diagnostic style

When producing a diagnosis:

1. State whether the input looks import-ready, needs fixes, or needs manual SF Symbols app validation.
2. List concrete blockers first.
3. Separate heuristic warnings from confirmed structural problems, especially hardcoded paint, fill/stroke duplication, overlap/seam warnings, and variable bounds drift.
4. Suggest the next MCP tool or manual app step.
5. Avoid inventing Apple-specific guarantees that the MCP server cannot verify.

## Common workflow

1. Use `resolve_design_environment` when the editor/tooling path is unclear.
2. Use `create_symbol_brief` when user intent needs structure.
3. Use `validate_svg_template` with the default `artwork-svg` stage for exported SVG preflight.
4. Use `inspect_svg_geometry` for group/path structure.
5. Use `compare_variable_sources` when variable symbol weights are available, and inspect bounds drift before accepting the weight family.
6. Use `generate_annotation_plan` for rendering mode preparation.
7. Use `generate_draw_guide_plan` for Draw or Variable Draw planning.
8. Use `generate_import_checklist` before SF Symbols app and Xcode handoff.
9. Use `validate_svg_template` with `stage: "sf-symbol-template-svg"` after final SF Symbols export and before Xcode handoff.
10. Use `create_xcassets_symbol_set` and `generate_swift_usage` after the final symbol asset is ready.

## If tools are unavailable

Do not pretend the plugin itself performs validation. Explain that the Codex Plugin is only an optional wrapper and that the independent MCP server must be installed and enabled. Provide the remote command:

```bash
npx -y github:yuryAB/sf-symbols-pipeline-mcp
```

After npm publication, the expected command is:

```bash
npx -y sf-symbols-pipeline-mcp
```
