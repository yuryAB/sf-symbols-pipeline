export type StaticResource = {
  uri: string;
  name: string;
  title: string;
  text: string;
};

export const guidelineResources: StaticResource[] = [
  {
    uri: "sf-symbols://guidelines/custom-symbols",
    name: "custom-symbols-guidelines",
    title: "Custom SF Symbols Guidelines",
    text: `# Custom SF Symbols Guidelines

A custom SF Symbol is not a generic SVG. It should begin from an official SF Symbols template whenever possible and should preserve symbol semantics throughout editing.

Use the selected vector editor for drawing only, not as the final source of truth. The SF Symbols app remains responsible for template export, import, validation, annotations, previews, and final export. Xcode asset catalogs are the final app delivery mechanism.

Core rules:
- Preserve semantic layer names and path order.
- Prefer closed filled paths.
- Convert live strokes to outlined paths before final export.
- Avoid open paths, raster images, masks with fragile output, filters, blur, shadows, and manual gradients.
- Do not leave hardcoded fill/stroke colors inside final Symbols artwork; rely on SF Symbols rendering classes and annotations so the symbol remains tintable.
- Keep the original source SVG as the fidelity reference for conversions. Regular-M should match the source before generating lighter or heavier weights.
- For solid icons, avoid weight changes that scale or distort the whole base. Keep static base geometry stable and vary badges/details conservatively.
- Boolean-unite overlapping or edge-touching solid base parts into a single filled silhouette when they represent one visual mass.
- Validate in the SF Symbols app before treating the symbol as ready.
`,
  },
  {
    uri: "sf-symbols://guidelines/vector-editor-to-sf-symbols",
    name: "vector-editor-to-sf-symbols-guidelines",
    title: "Vector Editor To SF Symbols Workflow",
    text: `# Vector Editor To SF Symbols Workflow

Use any SVG-capable vector editor that the agent can reliably operate. This can be Figma, Illustrator, Sketch, Affinity Designer, Inkscape, or another tool that preserves SVG paths and layer structure.

Recommended flow:
- If the user did not specify an editor, inspect the agent's available tools/connectors and choose the best available SVG-capable vector editor.
- Open the installed official SF Symbols app; use Apple's official download page only if the app is missing or outdated.
- Choose the closest base symbol in the SF Symbols app and export its template before drawing.
- Draw Regular-S first unless a variable template requires coordinated Ultralight-S, Regular-S, and Black-S sources.
- Keep layers named by semantic part, not by visual accident.
- Convert final strokes and text to paths before export.
- For stroke-only sources, outline the original strokes and preserve linecap/linejoin.
- For solid sources, avoid duplicating fill and stroke as separate visible layers; generate one final silhouette per visual part.
- Before final handoff, check Regular-M against the source icon and preview Ultralight, Regular, and Black for clipping, seams, and unintended shape drift.
- Export SVG from the selected vector editor.
- Run validation and geometry inspection here.
- Import into the SF Symbols app for template validation and annotation.
- Export the final symbol from the SF Symbols app.
- Add the final SVG to an Xcode asset catalog when the user wants app integration.
`,
  },
  {
    uri: "sf-symbols://guidelines/figma-to-sf-symbols",
    name: "figma-to-sf-symbols-guidelines",
    title: "Figma To SF Symbols Workflow",
    text: `# Figma To SF Symbols Workflow

Compatibility resource for existing Figma-oriented workflows. Prefer sf-symbols://guidelines/vector-editor-to-sf-symbols for new editor-agnostic workflows.

Use the official Figma MCP for Figma operations when Figma is the selected editor. This server works with exported SVG files, JSON manifests, and local project folders.

Recommended flow:
- Start from an official SF Symbols template exported from the SF Symbols app or a close base symbol.
- Draw Regular-S first.
- Keep layers named by semantic part, not by visual accident.
- Keep Regular-M visually faithful to the original source icon before deriving other weights.
- Avoid hardcoded paint in final Symbols artwork so Xcode tinting and rendering modes continue to work.
- Export SVG from Figma.
- Run validation and geometry inspection here.
- Import into the SF Symbols app for template validation and annotation.
- Export the final symbol from the SF Symbols app.
- Add the final SVG to an Xcode asset catalog.
`,
  },
  {
    uri: "sf-symbols://resources/apple-official-links",
    name: "apple-official-links",
    title: "Apple Official Links",
    text: `# Apple Official Links

- SF Symbols app: https://developer.apple.com/sf-symbols/
- Human Interface Guidelines: SF Symbols: https://developer.apple.com/design/human-interface-guidelines/sf-symbols
- Creating custom symbol images for your app: https://developer.apple.com/documentation/uikit/creating-custom-symbol-images-for-your-app

Template guidance:
- There is no single universal official Apple template for every custom symbol.
- Open the installed SF Symbols app, choose the closest base symbol, and export that symbol's template.
- Use Apple's official SF Symbols download page only if the app is missing or outdated.
- Use the exported template as the source for vector editing.
- Return to the SF Symbols app for validation, annotation, preview, and final export.
`,
  },
  {
    uri: "sf-symbols://guidelines/path-compatibility",
    name: "path-compatibility-guidelines",
    title: "Path Compatibility Guidelines",
    text: `# Path Compatibility Guidelines

Path compatibility matters most for variable templates and animation readiness.

Rules:
- Prefer closed filled paths.
- Convert live strokes to outlined paths before final export.
- Avoid open paths in final SVG.
- Preserve path order.
- Preserve semantic layer names.
- Keep corresponding paths structurally compatible across weights.
- Do not mix live stroke and fill on the same final visual part. Convert to one filled path or one filled silhouette per part.
- For static solid bases, boolean-unite overlapping/edge-touching pieces to prevent SF Symbols preview cuts or seams.
- Use bounds drift warnings as a cue to compare against the original source before accepting variable weights.

Variable template rules:
- Prefer a variable template when multiple weights/scales matter.
- Draw Regular-S first.
- Duplicate Regular-S to Ultralight-S and Black-S.
- Adjust by moving existing points.
- Do not add or remove points independently across weights.
- Keep path count equal.
- Keep path order equal.
- Keep corresponding path point counts equal.
- Keep Regular-M as the visual anchor. Weight differences can be subtle if larger changes would deform a solid icon.
`,
  },
  {
    uri: "sf-symbols://guidelines/rendering-modes",
    name: "rendering-modes-guidelines",
    title: "Rendering Modes Guidelines",
    text: `# Rendering Modes Guidelines

Plan custom symbols for:
- Monochrome
- Hierarchical
- Palette
- Multicolor

This MCP can generate annotation plans, but it must not claim annotations are already applied unless a file format actually contains them and they were validated.

Use monochrome as the baseline. For hierarchical, group primary, secondary, and tertiary layers by semantic importance. For palette, plan foregroundStyle mapping. For multicolor, keep colors intentional, sparse, and readable in light/dark and high-contrast environments.
`,
  },
  {
    uri: "sf-symbols://guidelines/animation-readiness",
    name: "animation-readiness-guidelines",
    title: "Animation Readiness Guidelines",
    text: `# Animation Readiness Guidelines

Symbol effects fall into three categories:

1. Whole-symbol effects:
- bounce
- pulse
- scale
- appear
- disappear

2. Layer-sensitive effects:
- variableColor
- replace
- rotate
- wiggle
- breathe

3. Annotation-heavy effects:
- draw
- variableDraw

Layer-sensitive effects benefit from stable, named, semantically separated layers. Draw and Variable Draw require guide point planning and final application/validation in the SF Symbols app.
`,
  },
  {
    uri: "sf-symbols://guidelines/draw-and-variable-draw",
    name: "draw-and-variable-draw-guidelines",
    title: "Draw And Variable Draw Guidelines",
    text: `# Draw And Variable Draw Guidelines

For Draw and Variable Draw, this MCP generates a guide point plan only. Final guide points must be applied and validated in the SF Symbols app.

Recommended workflow:
- Annotate Regular first.
- Decide whether the draw behavior is whole-symbol, by-layer, or individual.
- Identify static layers, drawn layers, attachments, details, badges, and progress elements.
- Place guide points in the intended visual order.
- Verify Ultralight and Black guide point order.
- Test Draw and Variable Draw behavior in the SF Symbols app and Xcode previews.
`,
  },
  {
    uri: "sf-symbols://guidelines/xcode-import",
    name: "xcode-import-guidelines",
    title: "Xcode Import Guidelines",
    text: `# Xcode Import Guidelines

Xcode asset catalogs are the final delivery mechanism for custom symbols in an iOS app.

Rules:
- Import the final SVG exported from the SF Symbols app.
- Use Image("symbolName") in SwiftUI for custom asset catalog symbols.
- Do not use Image(systemName:) for custom symbols.
- Use asset-based UIImage loading in UIKit, not systemName loading.
- Verify rendering modes, symbol effects, accessibility contrast, light/dark mode, and device behavior.
`,
  },
];
