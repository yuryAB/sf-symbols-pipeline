import path from "node:path";
import { toPrettyJson } from "../output/json.js";
import type { CreateXcassetsSymbolSetInput } from "../schemas/xcode.js";
import {
  parseSvgFromWorkspace,
  validateTemplateHeuristics,
} from "../svg/templateAnalysis.js";
import type { Workspace } from "../workspace.js";
import { normalizeSymbolName } from "./createSymbolBrief.js";

export type XcassetsSymbolSetOutput = {
  assetCatalogPath: string;
  symbolSetPath: string;
  contentsJsonPath: string;
  copiedSvgPath?: string;
  warnings: string[];
  writtenFiles: string[];
};

export async function createXcassetsSymbolSet(
  workspace: Workspace,
  input: CreateXcassetsSymbolSetInput,
): Promise<XcassetsSymbolSetOutput> {
  const symbolName = normalizeSymbolName(input.symbolName);
  const warnings: string[] = [];

  if (symbolName !== input.symbolName) {
    warnings.push(
      `Symbol folder/file name was normalized from "${input.symbolName}" to "${symbolName}".`,
    );
  }

  if (!input.sourceSvgPath) {
    warnings.push(
      "No source SVG was copied. Add the final SVG exported from the SF Symbols app before importing in Xcode.",
    );
  }

  warnings.push(
    "Contents.json is a conservative minimal symbolset scaffold. Verify the asset in Xcode.",
  );

  const assetCatalogRelative = path.join(input.outputDir, "Assets.xcassets");
  const symbolSetRelative = path.join(
    assetCatalogRelative,
    `${symbolName}.symbolset`,
  );
  const contentsJsonRelative = path.join(symbolSetRelative, "Contents.json");
  const svgFilename = `${symbolName}.svg`;
  const svgRelative = path.join(symbolSetRelative, svgFilename);
  const overwrite = input.overwrite ?? false;

  if (input.sourceSvgPath) {
    const document = await parseSvgFromWorkspace(
      workspace,
      input.sourceSvgPath,
    );
    const validation = validateTemplateHeuristics(document, {
      expectedSymbolName: symbolName,
      stage: "sf-symbol-template-svg",
    });

    if (!validation.passed) {
      throw new Error(
        `Source SVG is not an import-ready SF Symbols template: ${validation.errors.join("; ")}`,
      );
    }
  }

  await workspace.ensureDir(symbolSetRelative);

  const contentsJson = {
    symbols: input.sourceSvgPath
      ? [
          {
            idiom: "universal",
            filename: svgFilename,
          },
        ]
      : [
          {
            idiom: "universal",
          },
        ],
    info: {
      author: "xcode",
      version: 1,
    },
  };

  const writtenFiles = [
    await workspace.writeText(
      contentsJsonRelative,
      toPrettyJson(contentsJson),
      { overwrite },
    ),
  ];

  let copiedSvgPath: string | undefined;
  if (input.sourceSvgPath) {
    copiedSvgPath = await workspace.copyFile(input.sourceSvgPath, svgRelative, {
      overwrite,
    });
    writtenFiles.push(copiedSvgPath);
  }

  return {
    assetCatalogPath: workspace.resolvePath(assetCatalogRelative),
    symbolSetPath: workspace.resolvePath(symbolSetRelative),
    contentsJsonPath: workspace.resolvePath(contentsJsonRelative),
    copiedSvgPath,
    warnings,
    writtenFiles,
  };
}
