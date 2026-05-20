#!/usr/bin/env node
import { createXcassetsSymbolSet } from "./tools/createXcassetsSymbolSet.js";
import { createSymbolBrief } from "./tools/createSymbolBrief.js";
import { generateAnnotationPlan } from "./tools/generateAnnotationPlan.js";
import { generateDrawGuidePlan } from "./tools/generateDrawGuidePlan.js";
import { generateImportChecklist } from "./tools/generateImportChecklist.js";
import { generateMagicReplacePlan } from "./tools/generateMagicReplacePlan.js";
import { generateSwiftUsage } from "./tools/generateSwiftUsage.js";
import { runCompareVariableSources } from "./tools/compareVariableSources.js";
import { runInspectSvgGeometry } from "./tools/inspectSvgGeometry.js";
import { runValidateSvgTemplate } from "./tools/validateSvgTemplate.js";
import { resolveDesignEnvironment } from "./tools/resolveDesignEnvironment.js";
import { CompareVariableSourcesInputSchema } from "./schemas/validation.js";
import { CreateSymbolBriefInputSchema } from "./schemas/symbolBrief.js";
import {
  CreateXcassetsSymbolSetInputSchema,
  GenerateImportChecklistInputSchema,
  GenerateSwiftUsageInputSchema,
} from "./schemas/xcode.js";
import { InspectSvgGeometryInputSchema } from "./schemas/validation.js";
import { ResolveDesignEnvironmentInputSchema } from "./schemas/designEnvironment.js";
import { ValidateSvgTemplateInputSchema } from "./schemas/validation.js";
import { GenerateAnnotationPlanInputSchema } from "./tools/generateAnnotationPlan.js";
import { GenerateDrawGuidePlanInputSchema } from "./tools/generateDrawGuidePlan.js";
import { GenerateMagicReplacePlanInputSchema } from "./tools/generateMagicReplacePlan.js";
import { Workspace } from "./workspace.js";

const VERSION = "0.1.0";
const HELP_FLAGS = new Set(["--help", "-h"]);
const VERSION_FLAGS = new Set(["--version", "-v"]);

type ParsedArgs = {
  positionals: string[];
  flags: Map<string, string[] | boolean>;
};

type CommandHandler = (
  parsed: ParsedArgs,
  workspace: Workspace,
) => Promise<unknown> | unknown;

const commands: Record<string, CommandHandler> = {
  "resolve-design-environment": (parsed) =>
    resolveDesignEnvironment(
      ResolveDesignEnvironmentInputSchema.parse(
        withJsonInput(parsed, {
          symbolName: optionalFlag(parsed, "symbol-name"),
          userRequestedEditor: optionalFlag(parsed, "editor"),
          availableAgentTools: arrayFlag(parsed, "tool"),
          platform: optionalFlag(parsed, "platform"),
          needsSetupHelp: booleanFlag(parsed, "needs-setup-help"),
        }),
      ),
    ),

  "create-symbol-brief": (parsed, workspace) =>
    createSymbolBrief(
      workspace,
      CreateSymbolBriefInputSchema.parse(
        withJsonInput(parsed, {
          symbolName: optionalFlag(parsed, "symbol-name"),
          semanticIntent: optionalFlag(parsed, "semantic-intent"),
          appContext: optionalFlag(parsed, "app-context"),
          baseSymbolCandidate: optionalFlag(parsed, "base-symbol"),
          visualStyle: optionalFlag(parsed, "visual-style"),
          renderingModes: arrayFlag(parsed, "rendering-mode"),
          animationTargets: arrayFlag(parsed, "animation-target"),
          minimumOS: optionalFlag(parsed, "minimum-os"),
          outputDir: optionalFlag(parsed, "output-dir"),
        }),
      ),
    ),

  "validate-svg": (parsed, workspace) =>
    runValidateSvgTemplate(
      workspace,
      ValidateSvgTemplateInputSchema.parse(
        withJsonInput(parsed, {
          svgPath: parsed.positionals[0] ?? optionalFlag(parsed, "svg"),
          expectedSymbolName: optionalFlag(parsed, "expected-symbol-name"),
          strict: booleanFlag(parsed, "strict"),
          stage: optionalFlag(parsed, "stage"),
          targetGlyph: optionalFlag(parsed, "target-glyph"),
          requiresVariableTemplate: booleanFlag(
            parsed,
            "requires-variable-template",
          ),
          outputDir: optionalFlag(parsed, "output-dir"),
        }),
      ),
    ),

  "inspect-svg": (parsed, workspace) =>
    runInspectSvgGeometry(
      workspace,
      InspectSvgGeometryInputSchema.parse(
        withJsonInput(parsed, {
          svgPath: parsed.positionals[0] ?? optionalFlag(parsed, "svg"),
          outputDir: optionalFlag(parsed, "output-dir"),
        }),
      ),
    ),

  "compare-variable-sources": (parsed, workspace) =>
    runCompareVariableSources(
      workspace,
      CompareVariableSourcesInputSchema.parse(
        withJsonInput(parsed, {
          ultralightSvgPath: optionalFlag(parsed, "ultralight"),
          regularSvgPath: optionalFlag(parsed, "regular"),
          blackSvgPath: optionalFlag(parsed, "black"),
          outputDir: optionalFlag(parsed, "output-dir"),
        }),
      ),
    ),

  "annotation-plan": (parsed, workspace) =>
    generateAnnotationPlan(
      workspace,
      GenerateAnnotationPlanInputSchema.parse(
        withJsonInput(parsed, {
          symbolName: optionalFlag(parsed, "symbol-name"),
          geometryReportPath: optionalFlag(parsed, "geometry-report"),
          layerNames: arrayFlag(parsed, "layer-name"),
          renderingModes: arrayFlag(parsed, "rendering-mode"),
          outputDir: optionalFlag(parsed, "output-dir"),
        }),
      ),
    ),

  "draw-guide-plan": (parsed, workspace) =>
    generateDrawGuidePlan(
      workspace,
      GenerateDrawGuidePlanInputSchema.parse(
        withJsonInput(parsed, {
          symbolName: optionalFlag(parsed, "symbol-name"),
          drawBehavior: optionalFlag(parsed, "draw-behavior"),
          variableDraw: booleanFlag(parsed, "variable-draw") ?? false,
          semanticParts: jsonFlag(parsed, "semantic-parts"),
          outputDir: optionalFlag(parsed, "output-dir"),
        }),
      ),
    ),

  "magic-replace-plan": (parsed, workspace) =>
    generateMagicReplacePlan(
      workspace,
      GenerateMagicReplacePlanInputSchema.parse(
        withJsonInput(parsed, {
          familyName: optionalFlag(parsed, "family-name"),
          symbols: jsonFlag(parsed, "symbols"),
          sharedParts: arrayFlag(parsed, "shared-part"),
          outputDir: optionalFlag(parsed, "output-dir"),
        }),
      ),
    ),

  "create-symbolset": (parsed, workspace) =>
    createXcassetsSymbolSet(
      workspace,
      CreateXcassetsSymbolSetInputSchema.parse(
        withJsonInput(parsed, {
          symbolName: optionalFlag(parsed, "symbol-name"),
          sourceSvgPath: optionalFlag(parsed, "source-svg"),
          outputDir: optionalFlag(parsed, "output-dir"),
          overwrite: booleanFlag(parsed, "overwrite"),
        }),
      ),
    ),

  "swift-usage": (parsed, workspace) =>
    generateSwiftUsage(
      workspace,
      GenerateSwiftUsageInputSchema.parse(
        withJsonInput(parsed, {
          symbolName: optionalFlag(parsed, "symbol-name"),
          renderingModes: arrayFlag(parsed, "rendering-mode"),
          animationTargets: arrayFlag(parsed, "animation-target"),
          minimumOS: optionalFlag(parsed, "minimum-os"),
          outputDir: optionalFlag(parsed, "output-dir"),
        }),
      ),
    ),

  "import-checklist": (parsed, workspace) =>
    generateImportChecklist(
      workspace,
      GenerateImportChecklistInputSchema.parse(
        withJsonInput(parsed, {
          symbolName: optionalFlag(parsed, "symbol-name"),
          renderingModes: arrayFlag(parsed, "rendering-mode"),
          animationTargets: arrayFlag(parsed, "animation-target"),
          includesDraw: booleanFlag(parsed, "includes-draw"),
          includesVariableTemplate: booleanFlag(
            parsed,
            "includes-variable-template",
          ),
          outputDir: optionalFlag(parsed, "output-dir"),
        }),
      ),
    ),
};

function printHelp(): void {
  process.stdout.write(`SF Symbols Pipeline (sfsp)

Agent-skill helper CLI for custom SF Symbols validation and artifact generation.

Usage:
  sfsp <command> [options]
  npx -y github:yuryAB/sf-symbols-pipeline -- <command> [options]

Commands:
  resolve-design-environment
  create-symbol-brief
  validate-svg <svg>
  inspect-svg <svg>
  compare-variable-sources --ultralight <svg> --regular <svg> --black <svg>
  annotation-plan
  draw-guide-plan
  magic-replace-plan
  create-symbolset --symbol-name <name> --output-dir <dir>
  swift-usage --symbol-name <name>
  import-checklist --symbol-name <name>

Common options:
  --input-json <json>       Merge full JSON input into the command input.
  --output-dir <dir>        Write markdown/json artifacts to this directory.
  -h, --help                Show this help text.
  -v, --version             Show the package version.

Paths may be absolute or relative to the current directory. No workspace
environment variable is required.
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.some((arg) => HELP_FLAGS.has(arg))) {
    printHelp();
    return;
  }

  if (args.some((arg) => VERSION_FLAGS.has(arg))) {
    process.stdout.write(`${VERSION}\n`);
    return;
  }

  const [commandName, ...rest] = args;
  const command = commands[commandName];

  if (!command) {
    throw new Error(`Unknown command "${commandName}". Run sfsp --help.`);
  }

  const workspace = Workspace.fromCwd();
  const result = await command(parseArgs(rest), workspace);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

function parseArgs(args: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags = new Map<string, string[] | boolean>();

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }

    const name = arg.slice(2);
    const next = args[index + 1];
    const value = next && !next.startsWith("--") ? ((index += 1), next) : true;
    const existing = flags.get(name);

    if (Array.isArray(existing)) {
      existing.push(String(value));
    } else if (typeof existing === "string") {
      flags.set(name, [existing, String(value)]);
    } else if (existing === true) {
      flags.set(name, [String(value)]);
    } else {
      flags.set(name, value === true ? true : [String(value)]);
    }
  }

  return { positionals, flags };
}

function withJsonInput<T extends Record<string, unknown>>(
  parsed: ParsedArgs,
  fallback: T,
): T {
  const raw = optionalFlag(parsed, "input-json");
  const json = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  return pruneUndefined({ ...fallback, ...json }) as T;
}

function optionalFlag(parsed: ParsedArgs, name: string): string | undefined {
  const value = parsed.flags.get(name);
  if (Array.isArray(value)) return value[value.length - 1];
  return undefined;
}

function booleanFlag(parsed: ParsedArgs, name: string): boolean | undefined {
  return parsed.flags.get(name) === true ? true : undefined;
}

function arrayFlag(
  parsed: ParsedArgs,
  name: string,
  required = false,
): string[] | undefined {
  const value = parsed.flags.get(name);
  const values = Array.isArray(value)
    ? value.flatMap((item) => item.split(",")).filter(Boolean)
    : [];

  if (required && values.length === 0) {
    throw new Error(`Missing required option --${name}.`);
  }

  return values.length > 0 ? values : undefined;
}

function jsonFlag(parsed: ParsedArgs, name: string): unknown {
  const value = optionalFlag(parsed, name);
  return value ? JSON.parse(value) : undefined;
}

function pruneUndefined(
  input: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );
}

main().catch((error) => {
  const message =
    error instanceof Error ? error.stack || error.message : String(error);
  console.error(message);
  process.exit(1);
});
