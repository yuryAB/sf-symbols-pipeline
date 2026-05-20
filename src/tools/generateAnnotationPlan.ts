import { z } from "zod";
import { bulletList, reportMarkdown } from "../output/markdown.js";
import { writeJsonArtifact, writeMarkdownArtifact } from "../output/writers.js";
import {
  RenderingModeSchema,
  SymbolNameSchema,
  WorkspacePathSchema,
} from "../schemas/common.js";
import type { Workspace } from "../workspace.js";

const SemanticPartSchema = z.object({
  name: z.string().min(1),
  role: z.enum([
    "primary",
    "secondary",
    "tertiary",
    "badge",
    "background",
    "detail",
    "motion",
    "progress",
  ]),
  description: z.string().min(1).optional(),
});

export const GenerateAnnotationPlanInputSchema = z.object({
  symbolName: SymbolNameSchema,
  geometryReportPath: WorkspacePathSchema.optional(),
  layerNames: z.array(z.string().min(1)).optional(),
  semanticParts: z.array(SemanticPartSchema).optional(),
  renderingModes: z.array(RenderingModeSchema).min(1),
  outputDir: z.string().min(1).optional(),
});

export type GenerateAnnotationPlanInput = z.infer<
  typeof GenerateAnnotationPlanInputSchema
>;

export type AnnotationPlanOutput = {
  annotationPlanMarkdown: string;
  annotationPlanJson: Record<string, unknown>;
  warnings: string[];
  writtenFiles?: string[];
};

export async function generateAnnotationPlan(
  workspace: Workspace,
  input: GenerateAnnotationPlanInput,
): Promise<AnnotationPlanOutput> {
  const warnings: string[] = [];
  const geometryLayerNames = input.geometryReportPath
    ? await readLayerNamesFromGeometryReport(
        workspace,
        input.geometryReportPath,
        warnings,
      )
    : [];
  const layerNames = unique([
    ...(input.layerNames ?? []),
    ...geometryLayerNames,
  ]);
  const semanticParts = input.semanticParts ?? [];

  if (layerNames.length === 0 && semanticParts.length === 0) {
    warnings.push(
      "No layer names or semantic parts were provided. The plan uses generic layer guidance.",
    );
  }

  const primaryParts = semanticParts.filter((part) => part.role === "primary");
  const secondaryParts = semanticParts.filter(
    (part) => part.role === "secondary",
  );
  const tertiaryParts = semanticParts.filter(
    (part) => part.role === "tertiary",
  );
  const separatedParts = semanticParts.filter((part) =>
    ["badge", "motion", "progress", "detail"].includes(part.role),
  );

  const annotationPlanJson = {
    symbolName: input.symbolName,
    renderingModes: input.renderingModes,
    layerNames,
    semanticParts,
    monochrome: {
      behavior:
        "All participating layers should render as a single foreground shape unless a layer is intentionally hidden by the final SF Symbols app annotations.",
    },
    hierarchical: {
      primary: primaryParts.map((part) => part.name),
      secondary: secondaryParts.map((part) => part.name),
      tertiary: tertiaryParts.map((part) => part.name),
      recommendation:
        "Map layers by semantic importance, not by visual position alone.",
    },
    palette: {
      recommendation:
        "Use foregroundStyle order for primary, secondary, and tertiary semantic groups. Keep badge/progress layers separate when they need independent color.",
    },
    multicolor: {
      recommendation:
        "Use multicolor only for colors that carry meaning. Verify light/dark and high-contrast behavior.",
    },
    clearBehindAndOverlapNotes: [
      "Check overlapping badges, progress marks, and foreground details in the SF Symbols app.",
      "Use clear-behind behavior only where overlap would reduce legibility.",
    ],
    shouldStaySeparated: separatedParts.map((part) => part.name),
    shouldNotBeMerged: separatedParts.map((part) => ({
      name: part.name,
      reason: `${part.role} layers often need independent rendering or animation semantics.`,
    })),
    finalValidation:
      "Apply and verify annotations in the SF Symbols app before treating them as complete.",
  };

  const annotationPlanMarkdown = reportMarkdown(
    `Annotation Plan: ${input.symbolName}`,
    "Use this as a human/agent plan for SF Symbols app annotations. It does not mean annotations are already applied.",
    [
      {
        title: "Rendering Modes",
        body: bulletList(input.renderingModes),
      },
      {
        title: "Layers To Preserve",
        body: bulletList(layerNames),
      },
      {
        title: "Hierarchical Mapping",
        body: bulletList([
          `Primary: ${primaryParts.map((part) => part.name).join(", ") || "main silhouette / core object"}`,
          `Secondary: ${secondaryParts.map((part) => part.name).join(", ") || "supporting details"}`,
          `Tertiary: ${tertiaryParts.map((part) => part.name).join(", ") || "fine details / background accents"}`,
        ]),
      },
      {
        title: "Palette And Multicolor",
        body: bulletList([
          "Palette: map foreground styles to primary, secondary, and tertiary semantic groups.",
          "Multicolor: reserve fixed colors for meaningful states and verify accessibility.",
        ]),
      },
      {
        title: "Separation Notes",
        body: bulletList([
          ...separatedParts.map(
            (part) =>
              `${part.name}: keep separate because role is ${part.role}.`,
          ),
          "Review clear-behind needs wherever badge, progress, or detail layers overlap.",
        ]),
      },
      {
        title: "Warnings",
        body: bulletList(warnings),
      },
    ],
  );

  const output: AnnotationPlanOutput = {
    annotationPlanMarkdown,
    annotationPlanJson,
    warnings,
  };

  if (input.outputDir) {
    output.writtenFiles = [
      await writeMarkdownArtifact(
        workspace,
        input.outputDir,
        "annotation-plan.md",
        annotationPlanMarkdown,
      ),
      await writeJsonArtifact(
        workspace,
        input.outputDir,
        "annotation-plan.json",
        annotationPlanJson,
      ),
    ];
  }

  return output;
}

async function readLayerNamesFromGeometryReport(
  workspace: Workspace,
  reportPath: string,
  warnings: string[],
): Promise<string[]> {
  try {
    const parsed = JSON.parse(await workspace.readText(reportPath)) as {
      groups?: Array<{ id?: string; label?: string }>;
      paths?: Array<{ id?: string; label?: string }>;
    };

    return unique([
      ...(parsed.groups ?? [])
        .map((group) => group.label || group.id)
        .filter(Boolean),
      ...(parsed.paths ?? [])
        .map((path) => path.label || path.id)
        .filter(Boolean),
    ] as string[]);
  } catch (error) {
    warnings.push(
      `Could not read geometry report "${reportPath}": ${error instanceof Error ? error.message : String(error)}`,
    );
    return [];
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
