import { z } from "zod";
import {
  AnimationTargetsArraySchema,
  RenderingModesArraySchema,
  SymbolNameSchema,
  VisualStyleSchema,
} from "../schemas/common.js";

export const CreateCustomSymbolPromptSchema = z.object({
  symbolName: SymbolNameSchema,
  semanticIntent: z.string().min(1),
  appContext: z.string().min(1).optional(),
  baseSymbolCandidate: z.string().min(1).optional(),
  visualStyle: VisualStyleSchema.optional(),
  renderingModes: RenderingModesArraySchema,
  animationTargets: AnimationTargetsArraySchema,
  minimumOS: z.string().min(1).optional(),
});

export type CreateCustomSymbolPromptInput = z.infer<
  typeof CreateCustomSymbolPromptSchema
>;

export function createCustomSymbolPrompt(
  input: CreateCustomSymbolPromptInput,
): string {
  return `Create a custom SF Symbol named "${input.symbolName}".

Intent: ${input.semanticIntent}
App context: ${input.appContext ?? "Not provided"}
Base SF Symbol candidate: ${input.baseSymbolCandidate ?? "Choose a close official SF Symbol template if possible"}
Visual style: ${input.visualStyle ?? "Match the base symbol and app context"}
Rendering modes: ${(input.renderingModes ?? ["monochrome", "hierarchical", "palette"]).join(", ")}
Animation targets: ${(input.animationTargets ?? []).join(", ") || "None specified"}
Minimum OS: ${input.minimumOS ?? "Not specified"}

Workflow:
1. Run resolve_design_environment to determine the vector editor/tooling and Apple SF Symbols setup.
2. Create a normalized symbol brief with create_symbol_brief.
3. Choose an official SF Symbols template/base strategy before drawing.
4. Use the SF Symbols app to export the template for the closest base symbol when possible.
5. Draw/edit in the selected SVG-capable vector editor.
6. Preserve semantic layer names and path order while editing.
7. If converting an existing icon, use the original SVG as the geometry reference and make Regular-M the fidelity anchor.
8. For stroke-only sources, outline strokes with original linecap/linejoin; for solid sources, avoid scaling the whole base and boolean-unite overlapping static masses.
9. Export SVG from the selected vector editor.
10. Run validate_svg_template and inspect_svg_geometry on the exported SVG.
11. If using variable templates, compare Ultralight-S, Regular-S, and Black-S sources with compare_variable_sources and inspect bounds drift.
12. Generate an annotation plan for requested rendering modes.
13. Generate a Draw/Variable Draw guide plan if draw or variableDraw is requested.
14. Generate an import checklist.
15. Import and validate in the SF Symbols app.
16. Apply rendering and animation annotations in the SF Symbols app; do not claim they are applied until validated there.
17. Export the final symbol from the SF Symbols app.
18. Prepare the Xcode asset catalog and Swift examples.

Important constraints:
- Treat this as an SF Symbols template pipeline, not generic SVG creation.
- This MCP does not operate vector editors directly; use the agent's available editor/MCP/tooling.
- Prefer closed filled paths and outlined strokes.
- Do not leave hardcoded fill/stroke colors, duplicated fill+stroke visual layers, or fragile overlapping solid bases inside final Symbols artwork.
- Avoid raster images, live text, filters, blur, shadows, fragile masks, and manual gradients.
- Use Xcode asset catalogs as the app delivery mechanism.`;
}
