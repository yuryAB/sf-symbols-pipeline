import { z } from "zod";
import { bulletList, reportMarkdown } from "../output/markdown.js";
import { writeJsonArtifact, writeMarkdownArtifact } from "../output/writers.js";
import { SymbolNameSchema } from "../schemas/common.js";
import type { Workspace } from "../workspace.js";

const DrawSemanticPartSchema = z.object({
  name: z.string().min(1),
  role: z.enum([
    "strokePath",
    "attachment",
    "static",
    "progress",
    "badge",
    "detail",
  ]),
  drawDirection: z
    .enum(["startToEnd", "endToStart", "centerOut", "custom"])
    .optional(),
  notes: z.string().min(1).optional(),
});

export const GenerateDrawGuidePlanInputSchema = z.object({
  symbolName: SymbolNameSchema,
  drawBehavior: z.enum(["wholeSymbol", "byLayer", "individually"]),
  variableDraw: z.boolean(),
  semanticParts: z.array(DrawSemanticPartSchema).min(1),
  outputDir: z.string().min(1).optional(),
});

export type GenerateDrawGuidePlanInput = z.infer<
  typeof GenerateDrawGuidePlanInputSchema
>;

export type DrawGuidePlanOutput = {
  drawGuidePlanMarkdown: string;
  drawGuidePlanJson: Record<string, unknown>;
  warnings: string[];
  writtenFiles?: string[];
};

export async function generateDrawGuidePlan(
  workspace: Workspace,
  input: GenerateDrawGuidePlanInput,
): Promise<DrawGuidePlanOutput> {
  const warnings: string[] = [];
  const drawingParts = input.semanticParts.filter((part) =>
    ["strokePath", "progress"].includes(part.role),
  );
  const staticParts = input.semanticParts.filter(
    (part) => part.role === "static",
  );
  const attachments = input.semanticParts.filter((part) =>
    ["attachment", "badge", "detail"].includes(part.role),
  );

  if (drawingParts.length === 0) {
    warnings.push("No strokePath/progress parts were provided for Draw.");
  }

  if (input.variableDraw && input.drawBehavior === "wholeSymbol") {
    warnings.push(
      "Variable Draw often benefits from by-layer or individual planning when progress semantics matter.",
    );
  }

  const drawGuidePlanJson = {
    symbolName: input.symbolName,
    drawBehavior: input.drawBehavior,
    variableDraw: input.variableDraw,
    participatingLayers: drawingParts.map((part) => part.name),
    staticLayers: staticParts.map((part) => part.name),
    attachmentLayers: attachments.map((part) => part.name),
    guidePointNeeds: drawingParts.map((part) => ({
      layer: part.name,
      direction: part.drawDirection ?? "startToEnd",
      notes:
        part.notes ??
        "Place guide points in the intended visual drawing order.",
    })),
    regularFirstWorkflow: [
      "Apply guide points to Regular first in the SF Symbols app.",
      "Preview Draw behavior before propagating assumptions to other weights.",
      "If using variable templates, verify Ultralight and Black guide point order.",
    ],
    variableDrawNotes: input.variableDraw
      ? [
          "Decide which layers represent variable progress.",
          "Keep static attachments out of the variable draw path unless intentional.",
          "Verify participation and ordering in the SF Symbols app.",
        ]
      : [],
    finalValidation:
      "This plan does not apply guide points. Final annotations must be applied and validated in the SF Symbols app.",
  };

  const drawGuidePlanMarkdown = reportMarkdown(
    `Draw Guide Plan: ${input.symbolName}`,
    "Use this to apply Draw/Variable Draw guide points in the SF Symbols app.",
    [
      {
        title: "Draw Participation",
        body: bulletList([
          `Behavior: ${input.drawBehavior}`,
          `Variable Draw: ${input.variableDraw ? "yes" : "no"}`,
          `Participating layers: ${drawingParts.map((part) => part.name).join(", ") || "None"}`,
          `Static layers: ${staticParts.map((part) => part.name).join(", ") || "None"}`,
          `Attachments: ${attachments.map((part) => part.name).join(", ") || "None"}`,
        ]),
      },
      {
        title: "Guide Point Needs",
        body: bulletList(
          drawingParts.map(
            (part) =>
              `${part.name}: ${part.drawDirection ?? "startToEnd"}${part.notes ? `; ${part.notes}` : ""}`,
          ),
        ),
      },
      {
        title: "Regular First Workflow",
        body: bulletList(drawGuidePlanJson.regularFirstWorkflow),
      },
      {
        title: "Warnings",
        body: bulletList(warnings),
      },
    ],
  );

  const output: DrawGuidePlanOutput = {
    drawGuidePlanMarkdown,
    drawGuidePlanJson,
    warnings,
  };

  if (input.outputDir) {
    output.writtenFiles = [
      await writeMarkdownArtifact(
        workspace,
        input.outputDir,
        "draw-guide-plan.md",
        drawGuidePlanMarkdown,
      ),
      await writeJsonArtifact(
        workspace,
        input.outputDir,
        "draw-guide-plan.json",
        drawGuidePlanJson,
      ),
    ];
  }

  return output;
}
