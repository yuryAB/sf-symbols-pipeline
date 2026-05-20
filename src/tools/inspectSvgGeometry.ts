import { fencedJson, reportMarkdown } from "../output/markdown.js";
import { writeJsonArtifact, writeMarkdownArtifact } from "../output/writers.js";
import type { InspectSvgGeometryInput } from "../schemas/validation.js";
import type { Workspace } from "../workspace.js";
import {
  inspectGeometry,
  parseSvgFromWorkspace,
  type GeometryReport,
} from "../svg/templateAnalysis.js";

export async function runInspectSvgGeometry(
  workspace: Workspace,
  input: InspectSvgGeometryInput,
): Promise<GeometryReport & { writtenFiles?: string[] }> {
  const document = await parseSvgFromWorkspace(workspace, input.svgPath);
  const report = inspectGeometry(document) as GeometryReport & {
    writtenFiles?: string[];
  };

  if (input.outputDir) {
    const markdown = reportMarkdown(
      `SVG Geometry Report: ${input.svgPath}`,
      `${report.paths.length} path(s), ${report.groups.length} group(s).`,
      [
        { title: "Groups", body: fencedJson(report.groups) },
        { title: "Paths", body: fencedJson(report.paths) },
        {
          title: "Warnings",
          body: report.warnings.map((w) => `- ${w}`).join("\n") || "- None",
        },
      ],
    );

    report.writtenFiles = [
      await writeJsonArtifact(
        workspace,
        input.outputDir,
        "geometry-report.json",
        report,
      ),
      await writeMarkdownArtifact(
        workspace,
        input.outputDir,
        "geometry-report.md",
        markdown,
      ),
    ];
  }

  return report;
}
