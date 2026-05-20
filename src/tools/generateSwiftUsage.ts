import {
  animationCategoryByTarget,
  DEFAULT_RENDERING_MODES,
  type AnimationTarget,
  type RenderingMode,
} from "../schemas/common.js";
import type { GenerateSwiftUsageInput } from "../schemas/xcode.js";
import { bulletList, reportMarkdown } from "../output/markdown.js";
import { writeArtifacts } from "../output/writers.js";
import type { Workspace } from "../workspace.js";

export type SwiftUsageOutput = {
  swiftMarkdown: string;
  swiftFiles: Array<{ filename: string; content: string }>;
  warnings: string[];
  writtenFiles?: string[];
};

export async function generateSwiftUsage(
  workspace: Workspace,
  input: GenerateSwiftUsageInput,
): Promise<SwiftUsageOutput> {
  const renderingModes = input.renderingModes ?? DEFAULT_RENDERING_MODES;
  const animationTargets = input.animationTargets ?? [];
  const warnings = swiftAvailabilityWarnings(input.minimumOS, animationTargets);
  const usageSwift = symbolUsageExamplesSwift(input.symbolName, renderingModes);
  const animationSwift = symbolAnimationPreviewSwift(
    input.symbolName,
    animationTargets,
  );

  const swiftMarkdown = reportMarkdown(
    `Swift Usage: ${input.symbolName}`,
    `Use custom asset catalog symbols with Image("${input.symbolName}") in SwiftUI and UIImage(named:) in UIKit.`,
    [
      {
        title: "Important Rules",
        body: bulletList([
          `SwiftUI custom symbol: Image("${input.symbolName}")`,
          "Do not use Image(systemName:) for custom asset catalog symbols.",
          `UIKit custom symbol: UIImage(named: "${input.symbolName}")`,
          "Verify rendering and animation behavior in Xcode previews and on device.",
        ]),
      },
      {
        title: "Rendering Modes",
        body: bulletList(renderingModes.map(renderingSnippet)),
      },
      {
        title: "Animation Notes",
        body: bulletList(
          animationTargets.map(
            (target) =>
              `${target}: ${animationCategoryByTarget[target]} effect`,
          ),
        ),
      },
      {
        title: "Availability Notes",
        body: bulletList(warnings),
      },
    ],
  );

  const swiftFiles = [
    { filename: "SwiftUsage.md", content: swiftMarkdown },
    { filename: "SymbolUsageExamples.swift", content: usageSwift },
    { filename: "SymbolAnimationPreview.swift", content: animationSwift },
  ];

  const output: SwiftUsageOutput = {
    swiftMarkdown,
    swiftFiles,
    warnings,
  };

  if (input.outputDir) {
    output.writtenFiles = await writeArtifacts(
      workspace,
      input.outputDir,
      swiftFiles,
    );
  }

  return output;
}

function renderingSnippet(mode: RenderingMode): string {
  switch (mode) {
    case "monochrome":
      return 'Monochrome: Image("symbolName").foregroundStyle(.primary)';
    case "hierarchical":
      return 'Hierarchical: Image("symbolName").symbolRenderingMode(.hierarchical).foregroundStyle(.blue)';
    case "palette":
      return 'Palette: Image("symbolName").symbolRenderingMode(.palette).foregroundStyle(.green, .secondary, .tertiary)';
    case "multicolor":
      return 'Multicolor: Image("symbolName").symbolRenderingMode(.multicolor)';
  }
}

function symbolUsageExamplesSwift(
  symbolName: string,
  renderingModes: RenderingMode[],
): string {
  const renderingExamples = renderingModes
    .map((mode) => swiftRenderingExample(symbolName, mode))
    .join("\n\n");

  return `import SwiftUI
import UIKit

struct SymbolUsageExamples: View {
    var body: some View {
        VStack(spacing: 16) {
${indent(renderingExamples, 12)}
        }
        .padding()
    }
}

func makeCustomSymbolImageView() -> UIImageView {
    let image = UIImage(named: "${symbolName}")
    let imageView = UIImageView(image: image)
    imageView.preferredSymbolConfiguration = UIImage.SymbolConfiguration(pointSize: 28, weight: .regular)
    imageView.tintColor = .label
    return imageView
}
`;
}

function swiftRenderingExample(
  symbolName: string,
  mode: RenderingMode,
): string {
  switch (mode) {
    case "monochrome":
      return `Image("${symbolName}")
    .font(.system(size: 32, weight: .regular))
    .foregroundStyle(.primary)`;
    case "hierarchical":
      return `Image("${symbolName}")
    .font(.system(size: 32, weight: .regular))
    .symbolRenderingMode(.hierarchical)
    .foregroundStyle(.blue)`;
    case "palette":
      return `Image("${symbolName}")
    .font(.system(size: 32, weight: .regular))
    .symbolRenderingMode(.palette)
    .foregroundStyle(.green, .secondary, .tertiary)`;
    case "multicolor":
      return `Image("${symbolName}")
    .font(.system(size: 32, weight: .regular))
    .symbolRenderingMode(.multicolor)`;
  }
}

function symbolAnimationPreviewSwift(
  symbolName: string,
  animationTargets: AnimationTarget[],
): string {
  const examples =
    animationTargets.length > 0
      ? animationTargets
          .map((target) => animationExample(symbolName, target))
          .join("\n\n")
      : `Image("${symbolName}")
    .font(.system(size: 44))`;

  return `import SwiftUI

struct SymbolAnimationPreview: View {
    @State private var trigger = false

    var body: some View {
        VStack(spacing: 20) {
${indent(examples, 12)}
        }
        .padding()
        .onTapGesture {
            trigger.toggle()
        }
    }
}
`;
}

function animationExample(symbolName: string, target: AnimationTarget): string {
  switch (target) {
    case "replace":
      return `Image("${symbolName}")
    .font(.system(size: 44))
    .contentTransition(.symbolEffect(.replace))
    .id(trigger)`;
    case "draw":
      return `if #available(iOS 18.0, *) {
    Image("${symbolName}")
        .font(.system(size: 44))
        .symbolEffect(.drawOn, value: trigger)
}`;
    case "variableDraw":
      return `if #available(iOS 18.0, *) {
    Image("${symbolName}")
        .font(.system(size: 44))
        .symbolEffect(.drawOn, options: .repeating, value: trigger)
}`;
    default:
      return `if #available(iOS 17.0, *) {
    Image("${symbolName}")
        .font(.system(size: 44))
        .symbolEffect(.${target}, value: trigger)
}`;
  }
}

function swiftAvailabilityWarnings(
  minimumOS: string | undefined,
  animationTargets: AnimationTarget[],
): string[] {
  const warnings = [
    `Minimum OS: ${minimumOS ?? "not specified"}. Confirm exact symbolEffect API availability against the target SDK.`,
  ];

  if (animationTargets.length > 0) {
    warnings.push(
      "Most symbolEffect APIs require iOS 17 or later; newer effects such as Draw/Variable Draw may require newer SDKs.",
    );
  }

  if (
    animationTargets.includes("draw") ||
    animationTargets.includes("variableDraw")
  ) {
    warnings.push(
      "Draw/Variable Draw snippets are starter examples. Verify final API spelling and behavior in Xcode for the selected SDK.",
    );
  }

  return warnings;
}

function indent(text: string, spaces: number): string {
  const prefix = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
}
