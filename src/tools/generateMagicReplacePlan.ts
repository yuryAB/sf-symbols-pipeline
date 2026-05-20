import { z } from "zod";
import { bulletList, reportMarkdown } from "../output/markdown.js";
import { writeJsonArtifact, writeMarkdownArtifact } from "../output/writers.js";
import type { Workspace } from "../workspace.js";

export const GenerateMagicReplacePlanInputSchema = z.object({
  familyName: z.string().min(1),
  symbols: z
    .array(
      z.object({
        symbolName: z.string().min(1),
        state: z.string().min(1),
        uniqueParts: z.array(z.string().min(1)).optional(),
      }),
    )
    .min(2),
  sharedParts: z.array(z.string().min(1)).min(1),
  outputDir: z.string().min(1).optional(),
});

export type GenerateMagicReplacePlanInput = z.infer<
  typeof GenerateMagicReplacePlanInputSchema
>;

export type MagicReplacePlanOutput = {
  magicReplacePlanMarkdown: string;
  magicReplacePlanJson: Record<string, unknown>;
  warnings: string[];
  writtenFiles?: string[];
};

export async function generateMagicReplacePlan(
  workspace: Workspace,
  input: GenerateMagicReplacePlanInput,
): Promise<MagicReplacePlanOutput> {
  const warnings: string[] = [];

  if (input.sharedParts.length < 2) {
    warnings.push(
      "Only one shared part was provided. Replace transitions usually improve when enclosure/base/detail layers are stable.",
    );
  }

  const changingLayers = input.symbols.flatMap((symbol) =>
    (symbol.uniqueParts ?? []).map((part) => ({
      symbolName: symbol.symbolName,
      state: symbol.state,
      part,
    })),
  );

  const magicReplacePlanJson = {
    familyName: input.familyName,
    sharedParts: input.sharedParts,
    symbols: input.symbols,
    stableLayerRules: [
      "Preserve shared enclosure/base layers across all symbols.",
      "Use stable path names for shared layers.",
      "Keep shared layers in the same order.",
      "Change only state-specific layers when possible.",
    ],
    changingLayers,
    swiftUITestCases: [
      "Toggle between every adjacent state.",
      "Toggle from first to last state.",
      "Test replace transition at small and large sizes.",
      "Test palette/hierarchical rendering while replacing.",
    ],
    finalValidation:
      "Replace behavior must be checked in SwiftUI/Xcode; structural similarity improves results but does not guarantee a perfect transition.",
  };

  const magicReplacePlanMarkdown = reportMarkdown(
    `Magic Replace Plan: ${input.familyName}`,
    "Use this structure plan for a related custom symbol family.",
    [
      {
        title: "Shared Layers",
        body: bulletList(input.sharedParts),
      },
      {
        title: "State-Specific Layers",
        body: bulletList(
          changingLayers.map(
            (layer) => `${layer.symbolName} (${layer.state}): ${layer.part}`,
          ),
        ),
      },
      {
        title: "Preservation Rules",
        body: bulletList(magicReplacePlanJson.stableLayerRules),
      },
      {
        title: "SwiftUI Test Cases",
        body: bulletList(magicReplacePlanJson.swiftUITestCases),
      },
      {
        title: "Warnings",
        body: bulletList(warnings),
      },
    ],
  );

  const output: MagicReplacePlanOutput = {
    magicReplacePlanMarkdown,
    magicReplacePlanJson,
    warnings,
  };

  if (input.outputDir) {
    output.writtenFiles = [
      await writeMarkdownArtifact(
        workspace,
        input.outputDir,
        "magic-replace-plan.md",
        magicReplacePlanMarkdown,
      ),
      await writeJsonArtifact(
        workspace,
        input.outputDir,
        "magic-replace-plan.json",
        magicReplacePlanJson,
      ),
    ];
  }

  return output;
}
