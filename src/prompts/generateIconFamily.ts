import { z } from "zod";

export const GenerateIconFamilyPromptSchema = z.object({
  namespace: z.string().min(1),
  theme: z.string().min(1),
  symbols: z
    .array(
      z.object({
        name: z.string().min(1),
        intent: z.string().min(1),
        state: z.string().min(1).optional(),
      }),
    )
    .min(1),
});

export type GenerateIconFamilyPromptInput = z.infer<
  typeof GenerateIconFamilyPromptSchema
>;

export function generateIconFamilyPrompt(
  input: GenerateIconFamilyPromptInput,
): string {
  return `Plan a coherent custom SF Symbols family.

Namespace: ${input.namespace}
Theme: ${input.theme}

Symbols:
${input.symbols
  .map(
    (symbol) =>
      `- ${input.namespace}.${symbol.name}: ${symbol.intent}${symbol.state ? ` (state: ${symbol.state})` : ""}`,
  )
  .join("\n")}

Planning workflow:
1. Normalize names into lowercase dot-separated symbol names.
2. Choose shared base geometry and layer conventions.
3. Recommend base SF Symbols candidates for each symbol where possible.
4. Keep rendering mode strategy consistent across the family.
5. Identify which symbols should support replace, variableColor, Draw, or whole-symbol effects.
6. For converted icon families, use original source SVGs as fidelity references and make Regular-M match before deriving weights.
7. Resolve the vector editing environment and create symbol briefs before drawing.
8. Validate each exported SVG, inspect hardcoded paint/overlap/seam warnings, compare variable bounds drift, generate annotation plans, and test in Xcode.

Preserve consistency, but do not flatten meaningful semantic differences just to force identical geometry. Solid bases should stay stable; badges and details may carry conservative weight variation.`;
}
