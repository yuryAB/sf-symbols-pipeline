import { bulletList, fencedJson, reportMarkdown } from "../output/markdown.js";
import { writeJsonArtifact, writeMarkdownArtifact } from "../output/writers.js";
import type { CompareVariableSourcesInput } from "../schemas/validation.js";
import type { Workspace } from "../workspace.js";
import {
  compareVariableSources,
  type VariableCompatibilityReport,
} from "../svg/compatibility.js";

export async function runCompareVariableSources(
  workspace: Workspace,
  input: CompareVariableSourcesInput,
): Promise<VariableCompatibilityReport> {
  const report = await compareVariableSources(workspace, input);

  if (input.outputDir) {
    const markdown = reportMarkdown(
      "Variable Source Compatibility Report",
      `Passed: ${report.passed ? "yes" : "no"}. Point compatibility is heuristic.`,
      [
        { title: "Errors", body: bulletList(report.errors) },
        { title: "Warnings", body: bulletList(report.warnings) },
        { title: "Compatibility", body: fencedJson(report.compatibility) },
        { title: "Diffs", body: fencedJson(report.diffs) },
      ],
    );

    report.writtenFiles = [
      await writeJsonArtifact(
        workspace,
        input.outputDir,
        "variable-compatibility-report.json",
        report,
      ),
      await writeMarkdownArtifact(
        workspace,
        input.outputDir,
        "variable-compatibility-report.md",
        markdown,
      ),
    ];
  }

  return report;
}
