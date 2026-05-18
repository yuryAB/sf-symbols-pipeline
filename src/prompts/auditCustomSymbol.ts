import { z } from "zod";
import { SymbolNameSchema, WorkspacePathSchema } from "../schemas/common.js";

export const AuditCustomSymbolPromptSchema = z.object({
  symbolName: SymbolNameSchema,
  svgPath: WorkspacePathSchema,
  expectedRenderingModes: z.array(z.string().min(1)).optional(),
  expectedAnimationTargets: z.array(z.string().min(1)).optional(),
});

export type AuditCustomSymbolPromptInput = z.infer<
  typeof AuditCustomSymbolPromptSchema
>;

export function auditCustomSymbolPrompt(
  input: AuditCustomSymbolPromptInput,
): string {
  return `Audit the custom SF Symbol "${input.symbolName}" at "${input.svgPath}".

Expected rendering modes: ${(input.expectedRenderingModes ?? []).join(", ") || "Not specified"}
Expected animation targets: ${(input.expectedAnimationTargets ?? []).join(", ") || "Not specified"}

Audit workflow:
1. Run validate_svg_template with expectedSymbolName.
2. Run inspect_svg_geometry and inspect group/path names, fills, strokes, hardcoded paint, bounds, open-path heuristics, and path order.
3. Check whether the SVG looks template-like, not generic.
4. Check Regular-M against the original source icon when one exists; do not treat a regenerated symbolset as the fidelity source.
5. For solid icons, flag overlapping or edge-touching filled bases that should be boolean-united, and flag duplicated fill+stroke visual layers.
6. If variable template sources exist, run compare_variable_sources and inspect bounds drift across weights.
7. Generate or update an annotation plan for the expected rendering modes.
8. Generate a Draw/Variable Draw plan if requested.
9. Produce a prioritized fix plan for vector-editor edits, SF Symbols app annotations, and Xcode import.

Do not claim the symbol is SF Symbols-app validated unless the user provides evidence from the SF Symbols app.`;
}
