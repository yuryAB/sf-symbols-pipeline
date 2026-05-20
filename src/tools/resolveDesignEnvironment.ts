import type { ResolveDesignEnvironmentInput } from "../schemas/designEnvironment.js";

type Confidence = "high" | "medium" | "low";

type AppleOfficialLink = {
  label: string;
  url: string;
  purpose: string;
};

type EditorCandidate = {
  id: string;
  name: string;
  confidence: Confidence;
  reason: string;
};

export type ResolveDesignEnvironmentOutput = {
  symbolName: string;
  requestedEditor?: string;
  recommendedEditor: EditorCandidate;
  nextSteps: string[];
  setupInstructions: string[];
  appleOfficialLinks: AppleOfficialLink[];
  warnings: string[];
};

const appleOfficialLinks: AppleOfficialLink[] = [
  {
    label: "SF Symbols app",
    url: "https://developer.apple.com/sf-symbols/",
    purpose:
      "Download the official SF Symbols app and export the symbol/base template used for custom symbol editing.",
  },
  {
    label: "Human Interface Guidelines: SF Symbols",
    url: "https://developer.apple.com/design/human-interface-guidelines/sf-symbols",
    purpose:
      "Review Apple guidance for custom symbols, rendering modes, alignment, and design consistency.",
  },
  {
    label: "Creating custom symbol images for your app",
    url: "https://developer.apple.com/documentation/uikit/creating-custom-symbol-images-for-your-app",
    purpose:
      "Follow Apple's developer workflow for exporting, editing, importing, and using custom symbol images.",
  },
];

const editorPatterns: Array<{
  id: string;
  name: string;
  pattern: RegExp;
}> = [
  { id: "figma", name: "Figma", pattern: /\bfigma\b/i },
  {
    id: "illustrator",
    name: "Adobe Illustrator",
    pattern: /\b(illustrator|adobe illustrator)\b/i,
  },
  { id: "sketch", name: "Sketch", pattern: /\bsketch\b/i },
  { id: "affinity", name: "Affinity Designer", pattern: /\baffinity\b/i },
  { id: "inkscape", name: "Inkscape", pattern: /\binkscape\b/i },
];

function findKnownEditor(value: string): EditorCandidate | undefined {
  const match = editorPatterns.find((editor) => editor.pattern.test(value));

  if (!match) {
    return undefined;
  }

  return {
    id: match.id,
    name: match.name,
    confidence: "high",
    reason: `Matched "${match.name}" from the provided editor/tool hint.`,
  };
}

function resolveRecommendedEditor(
  input: ResolveDesignEnvironmentInput,
): EditorCandidate {
  if (input.userRequestedEditor) {
    const knownEditor = findKnownEditor(input.userRequestedEditor);

    return {
      id: knownEditor?.id ?? "user-requested-vector-editor",
      name: knownEditor?.name ?? input.userRequestedEditor,
      confidence: "high",
      reason:
        "The user explicitly requested this vector editor; use it if the agent has access to it.",
    };
  }

  for (const tool of input.availableAgentTools ?? []) {
    const knownEditor = findKnownEditor(tool);

    if (knownEditor) {
      return {
        ...knownEditor,
        confidence: "medium",
      };
    }
  }

  const hasGenericVectorTool = (input.availableAgentTools ?? []).some((tool) =>
    /\b(svg|vector|draw|canvas|path)\b/i.test(tool),
  );

  if (hasGenericVectorTool) {
    return {
      id: "generic-svg-vector-editor",
      name: "Generic SVG-capable vector editor",
      confidence: "medium",
      reason:
        "No named editor was detected, but the available tools suggest SVG/vector drawing is possible.",
    };
  }

  return {
    id: "needs-user-or-setup",
    name: "Ask user or help set up an SVG-capable vector editor",
    confidence: "low",
    reason:
      "No explicit editor or recognizable vector editing tool was provided.",
  };
}

function buildSetupInstructions(
  input: ResolveDesignEnvironmentInput,
  recommendedEditor: EditorCandidate,
): string[] {
  const instructions: string[] = [];

  if (input.needsSetupHelp || recommendedEditor.confidence === "low") {
    instructions.push(
      "Check which vector editing tools or integrations the agent can operate before drawing.",
      "If no editor is available, ask the user to choose or install an SVG-capable editor such as Figma, Illustrator, Sketch, Affinity Designer, or Inkscape.",
    );
  }

  instructions.push(
    "Open the installed official SF Symbols app on macOS; use the official Apple link only if the app is missing or outdated.",
    "In the SF Symbols app, choose the closest base symbol and export the template for the selected base symbol; do not use a generic blank SVG as the source template unless no suitable base exists.",
    "Import the exported template into the chosen vector editor, preserve template groups/layer semantics, and export SVG after converting final strokes/text to paths.",
  );

  return instructions;
}

function buildWarnings(
  input: ResolveDesignEnvironmentInput,
  recommendedEditor: EditorCandidate,
): string[] {
  const warnings: string[] = [
    "This helper cannot inspect the host agent's installed editor integrations by itself; pass availableAgentTools when possible.",
    "There is no single universal official Apple template for every custom symbol; export the template for the selected base symbol from the SF Symbols app.",
  ];

  if (recommendedEditor.confidence === "low") {
    warnings.push(
      "No vector editor is ready yet. The agent should ask the user which editor to use or help set one up before drawing.",
    );
  }

  if (input.platform && !/\b(mac|macos|darwin)\b/i.test(input.platform)) {
    warnings.push(
      "The SF Symbols app workflow assumes macOS with SF Symbols installed for template export, validation, annotation, preview, and final export.",
    );
  }

  return warnings;
}

export function resolveDesignEnvironment(
  input: ResolveDesignEnvironmentInput,
): ResolveDesignEnvironmentOutput {
  const recommendedEditor = resolveRecommendedEditor(input);

  return {
    symbolName: input.symbolName,
    requestedEditor: input.userRequestedEditor,
    recommendedEditor,
    nextSteps: [
      "If the user did not specify an editor, inspect the agent's available tools/connectors and pass them as availableAgentTools.",
      `Use ${recommendedEditor.name} for vector drawing if it is available and can export SVG.`,
      "Use the official SF Symbols app to export the template for the closest base symbol before editing.",
      "Create or update the SVG in the chosen vector editor while preserving semantic layer names, path order, and SF Symbols template structure.",
      "Run validate_svg_template and inspect_svg_geometry on the exported SVG before importing it into the SF Symbols app.",
      "After SF Symbols app validation and final export, create the Xcode .symbolset when the user provides an asset catalog or asks for app integration.",
    ],
    setupInstructions: buildSetupInstructions(input, recommendedEditor),
    appleOfficialLinks,
    warnings: buildWarnings(input, recommendedEditor),
  };
}
