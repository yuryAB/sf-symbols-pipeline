import { bulletList, reportMarkdown } from "../output/markdown.js";
import { writeJsonArtifact, writeMarkdownArtifact } from "../output/writers.js";
import type { GenerateImportChecklistInput } from "../schemas/xcode.js";
import type { Workspace } from "../workspace.js";

export type ImportChecklistOutput = {
  checklistMarkdown: string;
  checklistJson: Record<string, unknown>;
  writtenFiles?: string[];
};

export async function generateImportChecklist(
  workspace: Workspace,
  input: GenerateImportChecklistInput,
): Promise<ImportChecklistOutput> {
  const sections = {
    vectorExport: [
      "Start from or align to an official SF Symbols template.",
      "Preserve semantic layer names and path order.",
      "Export SVG from the selected vector editor after converting final strokes/text to paths.",
    ],
    svgSanity: [
      "Run validate_svg_template.",
      "Run inspect_svg_geometry.",
      "Confirm no raster images, live text, filters, blur, shadows, or fragile masks are required.",
    ],
    sfSymbolsAppImport: [
      "Import the SVG into the SF Symbols app.",
      "Run template validation in the SF Symbols app.",
      "Preview weights, scales, and rendering modes.",
    ],
    templateValidation: [
      "Resolve SF Symbols app validation errors before Xcode import.",
      "For variable templates, verify Ultralight-S, Regular-S, and Black-S compatibility.",
    ],
    renderingAnnotations: [
      `Planned rendering modes: ${(input.renderingModes ?? []).join(", ") || "not specified"}.`,
      "Apply monochrome, hierarchical, palette, and multicolor annotations as needed.",
      "Do not claim annotations are complete until validated in the SF Symbols app.",
    ],
    drawAnnotations: input.includesDraw
      ? [
          "Use generate_draw_guide_plan before applying guide points.",
          "Apply Regular guide points first.",
          "Verify Ultralight and Black guide point order if variable template sources are used.",
        ]
      : ["No Draw/Variable Draw annotation requirement was declared."],
    xcodeImport: [
      "Export the final symbol from the SF Symbols app.",
      "Create or update the Xcode .symbolset asset.",
      "Verify the asset catalog in Xcode.",
    ],
    swiftUIUsage: [
      `Use Image("${input.symbolName}") in SwiftUI.`,
      "Do not use Image(systemName:) for custom asset catalog symbols.",
      `Use UIImage(named: "${input.symbolName}") in UIKit.`,
    ],
    animationTests: [
      `Planned animation targets: ${(input.animationTargets ?? []).join(", ") || "not specified"}.`,
      "Test whole-symbol effects.",
      "Test layer-sensitive effects with rendering modes.",
      "Test Draw/Variable Draw in Xcode when included.",
    ],
    accessibilityHighContrast: [
      "Check legibility at small sizes.",
      "Check high contrast and increased contrast settings.",
      "Check VoiceOver labels where the symbol appears in UI.",
    ],
    lightDarkMode: [
      "Verify light mode.",
      "Verify dark mode.",
      "Verify palette/multicolor choices against app backgrounds.",
    ],
    qaSignOff: [
      "Confirm vector editor source, SF Symbols app export, Xcode asset, and Swift snippets are aligned.",
      "Record any known limitations.",
      "Designer/engineer sign-off complete.",
    ],
  };

  const checklistJson = {
    symbolName: input.symbolName,
    renderingModes: input.renderingModes ?? [],
    animationTargets: input.animationTargets ?? [],
    includesDraw: input.includesDraw ?? false,
    includesVariableTemplate: input.includesVariableTemplate ?? false,
    sections,
  };

  const checklistMarkdown = reportMarkdown(
    `Import Checklist: ${input.symbolName}`,
    "Use this checklist before treating a custom SF Symbol as app-ready.",
    Object.entries(sections).map(([title, items]) => ({
      title: title
        .replace(/[A-Z]/g, (letter) => ` ${letter}`)
        .replace(/^./, (letter) => letter.toUpperCase()),
      body: bulletList(items),
    })),
  );

  const output: ImportChecklistOutput = {
    checklistMarkdown,
    checklistJson,
  };

  if (input.outputDir) {
    output.writtenFiles = [
      await writeMarkdownArtifact(
        workspace,
        input.outputDir,
        "import-checklist.md",
        checklistMarkdown,
      ),
      await writeJsonArtifact(
        workspace,
        input.outputDir,
        "import-checklist.json",
        checklistJson,
      ),
    ];
  }

  return output;
}
