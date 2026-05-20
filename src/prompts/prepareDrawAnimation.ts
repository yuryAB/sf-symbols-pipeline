import { z } from "zod";
import { SymbolNameSchema, WorkspacePathSchema } from "../schemas/common.js";

export const PrepareDrawAnimationPromptSchema = z.object({
  symbolName: SymbolNameSchema,
  svgPath: WorkspacePathSchema,
  drawBehavior: z.enum(["wholeSymbol", "byLayer", "individually"]),
  variableDraw: z.boolean().optional(),
});

export type PrepareDrawAnimationPromptInput = z.infer<
  typeof PrepareDrawAnimationPromptSchema
>;

export function prepareDrawAnimationPrompt(
  input: PrepareDrawAnimationPromptInput,
): string {
  return `Prepare Draw${input.variableDraw ? " and Variable Draw" : ""} animation for "${input.symbolName}".

SVG path: ${input.svgPath}
Draw behavior: ${input.drawBehavior}

Workflow:
1. Run inspect_svg_geometry to map groups and paths.
2. Identify which semantic parts participate in Draw.
3. Identify static parts and attachments.
4. Generate a draw guide point plan with generate_draw_guide_plan.
5. Annotate Regular first in the SF Symbols app.
6. If using variable templates, verify Ultralight and Black guide point order.
7. Test Draw/Variable Draw in the SF Symbols app and SwiftUI previews.

This skill only prepares the guide point plan. Final guide points must be applied and validated in the SF Symbols app.`;
}
