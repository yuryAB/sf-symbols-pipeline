import { Workspace } from "../workspace.js";
import {
  elementLabel,
  flattenSvgElements,
  getAttr,
  parseSvgDocument,
  type SvgDocument,
  type SvgElement,
} from "./parseSvg.js";
import {
  analyzePathData,
  attrsHaveFill,
  attrsHaveStroke,
  type PathBounds,
  styleOrAttr,
} from "./pathAnalysis.js";

export type GeometryGroup = {
  id?: string;
  label?: string;
  depth: number;
  childCount: number;
};

export type GeometryPath = {
  id?: string;
  label?: string;
  index: number;
  parentGroup?: string;
  commandCount?: number;
  estimatedPointCount?: number;
  commandTypes?: string[];
  hasStroke: boolean;
  hasFill: boolean;
  fillValue?: string;
  strokeValue?: string;
  hasHardcodedPaint: boolean;
  isProbablyClosed?: boolean;
  bounds?: PathBounds;
  approxArea?: number;
  parentGroups?: string[];
};

export type GeometryReport = {
  groups: GeometryGroup[];
  paths: GeometryPath[];
  warnings: string[];
};

export type SvgStats = {
  pathCount: number;
  groupCount: number;
  hasViewBox: boolean;
  hasImages: boolean;
  hasText: boolean;
  hasFilters: boolean;
  hasGradients: boolean;
  hasStrokes: boolean;
};

export type ValidationStage = "artwork-svg" | "sf-symbol-template-svg";

export type ValidateTemplateOptions = {
  expectedSymbolName?: string;
  strict?: boolean;
  stage?: ValidationStage;
  targetGlyph?: string;
  requiresVariableTemplate?: boolean;
};

export type TemplateTextSummary = {
  id?: string;
  text?: string;
  parentGroups: string[];
};

export type SfSymbolTemplateReport = {
  targetGlyph: string;
  requiredGroups: Record<"Notes" | "Guides" | "Symbols", boolean>;
  metadata: {
    hasTemplateVersion: boolean;
    templateVersion?: string;
    hasDescriptiveName: boolean;
    descriptiveName?: string;
  };
  guides: {
    required: string[];
    present: string[];
    missing: string[];
  };
  margins: {
    targetGlyph: string;
    required: string[];
    present: string[];
    missing: string[];
  };
  glyphs: {
    targetGlyph: string;
    required: string[];
    present: string[];
    missing: string[];
    pathCounts: Record<string, number>;
    variableRequired: boolean;
  };
  text: {
    allowedInNotes: TemplateTextSummary[];
    disallowedOutsideNotes: TemplateTextSummary[];
  };
};

export type GlyphQualityReport = {
  glyph: string;
  pathCount: number;
  filledPathCount: number;
  strokedPathCount: number;
  hardcodedPaintPathCount: number;
  bounds?: PathBounds;
  paths: Array<{
    id?: string;
    label?: string;
    index: number;
    hasFill: boolean;
    hasStroke: boolean;
    hasHardcodedPaint: boolean;
    fillValue?: string;
    strokeValue?: string;
    bounds?: PathBounds;
  }>;
  warnings: string[];
};

export type SvgQualityReport = {
  glyphs: GlyphQualityReport[];
  warnings: string[];
};

export type ValidationReport = {
  stage: ValidationStage;
  passed: boolean;
  errors: string[];
  warnings: string[];
  stats: SvgStats;
  quality?: SvgQualityReport;
  template?: SfSymbolTemplateReport;
  writtenFiles?: string[];
};

const DEFAULT_VALIDATION_STAGE: ValidationStage = "artwork-svg";
const DEFAULT_TARGET_GLYPH = "Regular-M";
const REQUIRED_TEMPLATE_GROUPS = ["Notes", "Guides", "Symbols"] as const;
const REQUIRED_GUIDES = [
  "Baseline-S",
  "Baseline-M",
  "Baseline-L",
  "Capline-S",
  "Capline-M",
  "Capline-L",
];
const VARIABLE_TEMPLATE_GLYPHS = ["Ultralight-S", "Regular-S", "Black-S"];

export async function parseSvgFromWorkspace(
  workspace: Workspace,
  svgPath: string,
): Promise<SvgDocument> {
  if (!svgPath.toLowerCase().endsWith(".svg")) {
    throw new Error("Expected an .svg file path.");
  }

  const svgText = await workspace.readText(svgPath);
  return parseSvgDocument(svgText, svgPath);
}

export function inspectGeometry(document: SvgDocument): GeometryReport {
  const groups: GeometryGroup[] = [];
  const paths: GeometryPath[] = [];
  const warnings: string[] = [];

  const visit = (
    node: SvgElement,
    depth: number,
    parentGroup?: string,
    parentGroups: string[] = [],
  ): void => {
    const name = node.name.toLowerCase();
    const id = node.attrs.id;
    const label = elementLabel(node);
    const groupName = label || id;

    if (name === "g") {
      groups.push({
        id,
        label,
        depth,
        childCount: node.children.length,
      });
    }

    if (name === "path") {
      paths.push(pathGeometry(node, paths.length, parentGroup, parentGroups));
    }

    const nextParentGroup =
      name === "g" ? groupName || parentGroup : parentGroup;
    const nextParentGroups =
      name === "g" && groupName ? [...parentGroups, groupName] : parentGroups;
    for (const child of node.children) {
      visit(child, depth + 1, nextParentGroup, nextParentGroups);
    }
  };

  visit(document.root, 0);

  if (paths.length === 0) {
    warnings.push("No <path> elements were found.");
  }

  if (groups.length === 0) {
    warnings.push(
      "No groups were found; SF Symbols layer semantics may be lost.",
    );
  }

  return { groups, paths, warnings };
}

export function validateTemplateHeuristics(
  document: SvgDocument,
  options: ValidateTemplateOptions = {},
): ValidationReport {
  const stage = options.stage ?? DEFAULT_VALIDATION_STAGE;
  const strict = options.strict ?? false;
  const elements = flattenSvgElements(document.root);
  const geometry = inspectGeometry(document);
  const rootAttrs = document.root.attrs;
  const warnings = [...geometry.warnings];
  const errors: string[] = [];
  let template: SfSymbolTemplateReport | undefined;
  let quality: SvgQualityReport | undefined;

  const stats: SvgStats = {
    pathCount: geometry.paths.length,
    groupCount: geometry.groups.length,
    hasViewBox: Boolean(rootAttrs.viewBox),
    hasImages: elements.some(
      (element) => element.name.toLowerCase() === "image",
    ),
    hasText: elements.some((element) =>
      ["text", "tspan", "textpath"].includes(element.name.toLowerCase()),
    ),
    hasFilters: elements.some(hasFilterSignal),
    hasGradients: elements.some((element) =>
      ["lineargradient", "radialgradient", "meshgradient"].includes(
        element.name.toLowerCase(),
      ),
    ),
    hasStrokes: geometry.paths.some((path) => path.hasStroke),
  };

  if (stats.hasImages) {
    errors.push(
      "Raster <image> elements are not allowed in a custom symbol SVG.",
    );
  }

  if (stats.hasText && stage === "artwork-svg") {
    errors.push(
      "Live text elements are not allowed; convert text to outlined paths.",
    );
  }

  if (stats.pathCount === 0) {
    errors.push("The SVG does not contain any paths.");
  }

  const strictIssuesAreErrors = strict || stage === "sf-symbol-template-svg";

  if (stats.hasFilters) {
    const message =
      "Filters, blurs, shadows, and filter references are fragile in SF Symbols templates.";
    pushStrictIssue(strictIssuesAreErrors, errors, warnings, message);
  }

  if (stats.hasGradients) {
    const message =
      "Gradients were found. Prefer rendering annotations over manual gradients in the template SVG.";
    pushStrictIssue(strictIssuesAreErrors, errors, warnings, message);
  }

  if (stats.hasStrokes) {
    const message =
      "Live strokes were found. Convert strokes to outlined filled paths before final export.";
    pushStrictIssue(strictIssuesAreErrors, errors, warnings, message);
  }

  if (!stats.hasViewBox) {
    const message = "The SVG is missing a viewBox.";
    pushStrictIssue(strictIssuesAreErrors, errors, warnings, message);
  }

  const openPaths = geometry.paths.filter(
    (path) => path.isProbablyClosed === false,
  );
  if (openPaths.length > 0) {
    warnings.push(
      `Heuristic: ${openPaths.length} path(s) do not end with Z/z and may be open.`,
    );
  }

  const missingPathNames = geometry.paths.filter(
    (path) => !path.id && !path.label,
  );
  if (missingPathNames.length > 0) {
    warnings.push(
      `Heuristic: ${missingPathNames.length} path(s) are missing ids or labels. Preserve semantic layer names when possible.`,
    );
  }

  const meaninglessNames = geometry.paths.filter((path) =>
    isMeaninglessName(path.id || path.label),
  );
  if (meaninglessNames.length > 0) {
    warnings.push(
      "Heuristic: some path ids look generic, such as path1/path2. Rename important layers semantically.",
    );
  }

  if (stats.pathCount < 2) {
    warnings.push(
      "Heuristic: very low path count may indicate a generic SVG rather than an SF Symbols template export.",
    );
  }

  if (!hasTemplateLikeGroupName(geometry.groups)) {
    warnings.push(
      "Heuristic: expected SF Symbols-style template groups were not detected. Start from an official template whenever possible.",
    );
  }

  if (
    options.expectedSymbolName &&
    !document.sourcePath?.includes(options.expectedSymbolName)
  ) {
    warnings.push(
      `Expected symbol name "${options.expectedSymbolName}" was not found in the SVG file path.`,
    );
  }

  if (stage === "sf-symbol-template-svg") {
    const templateResult = analyzeSfSymbolTemplate(document, {
      targetGlyph: options.targetGlyph ?? DEFAULT_TARGET_GLYPH,
      requiresVariableTemplate: options.requiresVariableTemplate ?? false,
    });
    template = templateResult.report;
    quality = templateResult.quality;
    errors.push(...templateResult.errors);
    warnings.push(...templateResult.warnings);
  }

  return {
    stage,
    passed: errors.length === 0,
    errors,
    warnings,
    stats,
    ...(quality ? { quality } : {}),
    ...(template ? { template } : {}),
  };
}

type TextElementContext = {
  element: SvgElement;
  parentGroups: string[];
};

type SfSymbolTemplateAnalysis = {
  report: SfSymbolTemplateReport;
  quality: SvgQualityReport;
  errors: string[];
  warnings: string[];
};

function analyzeSfSymbolTemplate(
  document: SvgDocument,
  input: {
    targetGlyph: string;
    requiresVariableTemplate: boolean;
  },
): SfSymbolTemplateAnalysis {
  const errors: string[] = [];
  const warnings: string[] = [];
  const notesGroup = findNamedGroup(document.root, "Notes");
  const guidesGroup = findNamedGroup(document.root, "Guides");
  const symbolsGroup = findNamedGroup(document.root, "Symbols");
  const quality = analyzeSymbolsQuality(symbolsGroup);
  const requiredGroups = {
    Notes: Boolean(notesGroup),
    Guides: Boolean(guidesGroup),
    Symbols: Boolean(symbolsGroup),
  };

  for (const group of REQUIRED_TEMPLATE_GROUPS) {
    if (!requiredGroups[group]) {
      errors.push(`missing ${group} group`);
    }
  }

  const textContexts = collectTextContexts(document.root);
  const allowedText = textContexts.filter((context) =>
    hasParentGroup(context, "Notes"),
  );
  const disallowedText = textContexts.filter(
    (context) => !hasParentGroup(context, "Notes"),
  );

  if (disallowedText.length > 0) {
    errors.push(
      "Live text outside Notes is not allowed; convert artwork text to outlined paths.",
    );
  }

  const templateVersion = allowedText.find((context) =>
    elementMatchesIdentifier(context.element, "template-version"),
  );
  const descriptiveName = allowedText.find((context) =>
    elementMatchesIdentifier(context.element, "descriptive-name"),
  );

  if (!templateVersion) {
    errors.push("missing template-version");
  } else if (
    !/^Template v\.\d+(?:\.\d+)*$/i.test(templateVersion.element.text ?? "")
  ) {
    errors.push("invalid template-version; expected Template v.x.x");
  }

  const presentGuides = guidesGroup
    ? REQUIRED_GUIDES.filter((guide) => hasElementNamed(guidesGroup, guide))
    : [];
  const missingGuides = REQUIRED_GUIDES.filter(
    (guide) => !presentGuides.includes(guide),
  );

  for (const guide of missingGuides) {
    errors.push(`missing ${guide}`);
  }

  const requiredMargins = [
    `left-margin-${input.targetGlyph}`,
    `right-margin-${input.targetGlyph}`,
  ];
  const presentMargins = guidesGroup
    ? requiredMargins.filter((margin) => hasElementNamed(guidesGroup, margin))
    : [];
  const missingMargins = requiredMargins.filter(
    (margin) => !presentMargins.includes(margin),
  );

  for (const margin of missingMargins) {
    errors.push(`missing ${margin}`);
  }

  const requiredGlyphs = uniqueValues([
    input.targetGlyph,
    ...(input.requiresVariableTemplate ? VARIABLE_TEMPLATE_GLYPHS : []),
  ]);
  const presentGlyphs: string[] = [];
  const missingGlyphs: string[] = [];
  const pathCounts: Record<string, number> = {};

  for (const glyph of requiredGlyphs) {
    const glyphGroup = symbolsGroup
      ? findNamedGroup(symbolsGroup, glyph)
      : undefined;
    const pathCount = glyphGroup ? countDescendantPaths(glyphGroup) : 0;
    pathCounts[glyph] = pathCount;

    if (!glyphGroup) {
      missingGlyphs.push(glyph);
      errors.push(`missing glyph for ${glyph}`);
      continue;
    }

    if (pathCount === 0) {
      missingGlyphs.push(glyph);
      errors.push(`missing glyph paths for ${glyph}`);
      continue;
    }

    presentGlyphs.push(glyph);
  }

  if (input.requiresVariableTemplate) {
    const comparablePathCounts = VARIABLE_TEMPLATE_GLYPHS.map(
      (glyph) => pathCounts[glyph] ?? 0,
    ).filter((pathCount) => pathCount > 0);
    const uniquePathCounts = uniqueValues(
      comparablePathCounts.map((pathCount) => String(pathCount)),
    );

    if (uniquePathCounts.length > 1) {
      errors.push(
        `variable glyph path counts differ: ${VARIABLE_TEMPLATE_GLYPHS.map((glyph) => `${glyph}=${pathCounts[glyph] ?? 0}`).join(", ")}`,
      );
    }
  }

  if (quality.glyphs.some((glyph) => glyph.hardcodedPaintPathCount > 0)) {
    errors.push(
      "hardcoded fill/stroke colors were found inside Symbols; final templates must rely on SF Symbols classes/annotations for tinting.",
    );
  }

  warnings.push(...quality.warnings);

  return {
    report: {
      targetGlyph: input.targetGlyph,
      requiredGroups,
      metadata: {
        hasTemplateVersion: Boolean(templateVersion),
        ...(templateVersion?.element.text
          ? { templateVersion: templateVersion.element.text }
          : {}),
        hasDescriptiveName: Boolean(descriptiveName),
        ...(descriptiveName?.element.text
          ? { descriptiveName: descriptiveName.element.text }
          : {}),
      },
      guides: {
        required: REQUIRED_GUIDES,
        present: presentGuides,
        missing: missingGuides,
      },
      margins: {
        targetGlyph: input.targetGlyph,
        required: requiredMargins,
        present: presentMargins,
        missing: missingMargins,
      },
      glyphs: {
        targetGlyph: input.targetGlyph,
        required: requiredGlyphs,
        present: presentGlyphs,
        missing: missingGlyphs,
        pathCounts,
        variableRequired: input.requiresVariableTemplate,
      },
      text: {
        allowedInNotes: allowedText.map(textSummary),
        disallowedOutsideNotes: disallowedText.map(textSummary),
      },
    },
    quality,
    errors,
    warnings,
  };
}

function analyzeSymbolsQuality(symbolsGroup?: SvgElement): SvgQualityReport {
  if (!symbolsGroup) {
    return { glyphs: [], warnings: [] };
  }

  const glyphs = symbolsGroup.children
    .filter((child) => child.name.toLowerCase() === "g")
    .map((glyphGroup) => {
      const glyphName = elementIdentifier(glyphGroup) ?? "unnamed";
      const pathElements = flattenSvgElements(glyphGroup).filter(
        (element) =>
          element.name.toLowerCase() === "path" &&
          typeof element.attrs.d === "string" &&
          element.attrs.d.trim().length > 0,
      );
      const paths = pathElements.map((pathElement, index) =>
        pathGeometry(pathElement, index, glyphName, ["Symbols", glyphName]),
      );
      const glyphWarnings = glyphQualityWarnings(glyphName, paths);

      return {
        glyph: glyphName,
        pathCount: paths.length,
        filledPathCount: paths.filter((path) => path.hasFill).length,
        strokedPathCount: paths.filter((path) => path.hasStroke).length,
        hardcodedPaintPathCount: paths.filter((path) => path.hasHardcodedPaint)
          .length,
        ...(unionBounds(paths.map((path) => path.bounds))
          ? { bounds: unionBounds(paths.map((path) => path.bounds)) }
          : {}),
        paths: paths.map((path) => ({
          ...(path.id ? { id: path.id } : {}),
          ...(path.label ? { label: path.label } : {}),
          index: path.index,
          hasFill: path.hasFill,
          hasStroke: path.hasStroke,
          hasHardcodedPaint: path.hasHardcodedPaint,
          ...(path.fillValue ? { fillValue: path.fillValue } : {}),
          ...(path.strokeValue ? { strokeValue: path.strokeValue } : {}),
          ...(path.bounds ? { bounds: path.bounds } : {}),
        })),
        warnings: glyphWarnings,
      };
    });

  return {
    glyphs,
    warnings: glyphs.flatMap((glyph) => glyph.warnings),
  };
}

function pathGeometry(
  node: SvgElement,
  index: number,
  parentGroup?: string,
  parentGroups: string[] = [],
): GeometryPath {
  const pathAnalysis = analyzePathData(node.attrs.d);
  const fillValue = styleOrAttr(node.attrs, "fill");
  const strokeValue = styleOrAttr(node.attrs, "stroke");
  const hasStroke = attrsHaveStroke(node.attrs);
  const hasFill = attrsHaveFill(node.attrs);

  return {
    id: node.attrs.id,
    label: elementLabel(node),
    index,
    parentGroup,
    parentGroups,
    commandCount: pathAnalysis.commandCount,
    estimatedPointCount: pathAnalysis.estimatedPointCount,
    commandTypes: pathAnalysis.commandTypes,
    hasStroke,
    hasFill,
    ...(fillValue ? { fillValue } : {}),
    ...(strokeValue ? { strokeValue } : {}),
    hasHardcodedPaint:
      hasHardcodedPaint(fillValue, hasFill) ||
      hasHardcodedPaint(strokeValue, hasStroke),
    isProbablyClosed: pathAnalysis.isProbablyClosed,
    ...(pathAnalysis.bounds ? { bounds: pathAnalysis.bounds } : {}),
    ...(pathAnalysis.approxArea !== undefined
      ? { approxArea: pathAnalysis.approxArea }
      : {}),
  };
}

function glyphQualityWarnings(
  glyphName: string,
  paths: GeometryPath[],
): string[] {
  const warnings: string[] = [];
  const hardcodedPaintPaths = paths.filter((path) => path.hasHardcodedPaint);
  const fillStrokePaths = paths.filter((path) => path.hasFill && path.hasStroke);
  const filledPaths = paths.filter((path) => path.hasFill && path.bounds);

  if (hardcodedPaintPaths.length > 0) {
    warnings.push(
      `Glyph ${glyphName}: ${hardcodedPaintPaths.length} path(s) use hardcoded fill/stroke paint; final Symbols artwork should stay tintable.`,
    );
  }

  if (fillStrokePaths.length > 0) {
    warnings.push(
      `Glyph ${glyphName}: ${fillStrokePaths.length} path(s) combine fill and stroke; convert to one filled silhouette per visual part before final export.`,
    );
  }

  for (let leftIndex = 0; leftIndex < filledPaths.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < filledPaths.length;
      rightIndex += 1
    ) {
      const left = filledPaths[leftIndex];
      const right = filledPaths[rightIndex];
      const overlap = boundsOverlap(left.bounds, right.bounds);
      const smallerArea = Math.min(
        Math.max(boundsArea(left.bounds), 0.0001),
        Math.max(boundsArea(right.bounds), 0.0001),
      );
      const overlapRatio = overlap.area / smallerArea;

      if (overlapRatio > 0.55) {
        warnings.push(
          `Glyph ${glyphName}: filled path bounds overlap heavily (${pathIdentity(left)} with ${pathIdentity(right)}). Solid bases may need boolean union to avoid visual cuts.`,
        );
      } else if (boundsTouchAtSeam(left.bounds, right.bounds)) {
        warnings.push(
          `Glyph ${glyphName}: filled path bounds touch along an edge (${pathIdentity(left)} with ${pathIdentity(right)}). Check for SF Symbols preview seams; boolean-unite static solid bases when possible.`,
        );
      }
    }
  }

  return warnings;
}

function hasHardcodedPaint(
  value: string | undefined,
  isActivePaint: boolean,
): boolean {
  if (!value || !isActivePaint) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  if (
    normalized === "none" ||
    normalized === "transparent" ||
    normalized === "currentcolor" ||
    normalized === "inherit" ||
    normalized === "context-fill" ||
    normalized === "context-stroke" ||
    normalized.startsWith("var(") ||
    normalized.startsWith("url(")
  ) {
    return false;
  }

  return (
    normalized.startsWith("#") ||
    normalized.startsWith("rgb(") ||
    normalized.startsWith("rgba(") ||
    normalized.startsWith("hsl(") ||
    normalized.startsWith("hsla(") ||
    normalized.startsWith("color(") ||
    /^[a-z]+$/i.test(normalized)
  );
}

function unionBounds(
  boundsList: Array<PathBounds | undefined>,
): PathBounds | undefined {
  const concreteBounds = boundsList.filter(
    (bounds): bounds is PathBounds => Boolean(bounds),
  );

  if (concreteBounds.length === 0) {
    return undefined;
  }

  const minX = Math.min(...concreteBounds.map((bounds) => bounds.minX));
  const minY = Math.min(...concreteBounds.map((bounds) => bounds.minY));
  const maxX = Math.max(...concreteBounds.map((bounds) => bounds.maxX));
  const maxY = Math.max(...concreteBounds.map((bounds) => bounds.maxY));
  const width = maxX - minX;
  const height = maxY - minY;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    centerX: minX + width / 2,
    centerY: minY + height / 2,
  };
}

function boundsArea(bounds?: PathBounds): number {
  if (!bounds) {
    return 0;
  }

  return Math.max(bounds.width, 0) * Math.max(bounds.height, 0);
}

function boundsOverlap(
  left?: PathBounds,
  right?: PathBounds,
): { area: number; width: number; height: number } {
  if (!left || !right) {
    return { area: 0, width: 0, height: 0 };
  }

  const width = Math.max(
    0,
    Math.min(left.maxX, right.maxX) - Math.max(left.minX, right.minX),
  );
  const height = Math.max(
    0,
    Math.min(left.maxY, right.maxY) - Math.max(left.minY, right.minY),
  );

  return {
    area: width * height,
    width,
    height,
  };
}

function boundsTouchAtSeam(
  left?: PathBounds,
  right?: PathBounds,
): boolean {
  if (!left || !right) {
    return false;
  }

  const epsilon = 0.05;
  const horizontalOverlap = Math.max(
    0,
    Math.min(left.maxX, right.maxX) - Math.max(left.minX, right.minX),
  );
  const verticalOverlap = Math.max(
    0,
    Math.min(left.maxY, right.maxY) - Math.max(left.minY, right.minY),
  );
  const minWidth = Math.max(Math.min(left.width, right.width), 0.0001);
  const minHeight = Math.max(Math.min(left.height, right.height), 0.0001);
  const verticalSeam =
    Math.abs(left.maxY - right.minY) <= epsilon ||
    Math.abs(right.maxY - left.minY) <= epsilon;
  const horizontalSeam =
    Math.abs(left.maxX - right.minX) <= epsilon ||
    Math.abs(right.maxX - left.minX) <= epsilon;

  return (
    (verticalSeam && horizontalOverlap / minWidth > 0.35) ||
    (horizontalSeam && verticalOverlap / minHeight > 0.35)
  );
}

function collectTextContexts(root: SvgElement): TextElementContext[] {
  const contexts: TextElementContext[] = [];

  const visit = (node: SvgElement, parentGroups: string[]): void => {
    const name = node.name.toLowerCase();

    if (["text", "tspan", "textpath"].includes(name)) {
      contexts.push({ element: node, parentGroups });
    }

    const groupName = name === "g" ? elementIdentifier(node) : undefined;
    const nextParentGroups = groupName
      ? [...parentGroups, groupName]
      : parentGroups;

    for (const child of node.children) {
      visit(child, nextParentGroups);
    }
  };

  visit(root, []);
  return contexts;
}

function hasParentGroup(
  context: TextElementContext,
  groupName: string,
): boolean {
  return context.parentGroups.some(
    (parentGroup) => parentGroup.toLowerCase() === groupName.toLowerCase(),
  );
}

function textSummary(context: TextElementContext): TemplateTextSummary {
  return {
    ...(elementIdentifier(context.element)
      ? { id: elementIdentifier(context.element) }
      : {}),
    ...(context.element.text ? { text: context.element.text } : {}),
    parentGroups: context.parentGroups,
  };
}

function findNamedGroup(
  root: SvgElement,
  groupName: string,
): SvgElement | undefined {
  return flattenSvgElements(root).find(
    (element) =>
      element.name.toLowerCase() === "g" &&
      elementMatchesIdentifier(element, groupName),
  );
}

function hasElementNamed(root: SvgElement, elementName: string): boolean {
  return flattenSvgElements(root).some((element) =>
    elementMatchesIdentifier(element, elementName),
  );
}

function elementMatchesIdentifier(
  element: SvgElement,
  expectedIdentifier: string,
): boolean {
  const expected = expectedIdentifier.toLowerCase();
  return [element.attrs.id, elementLabel(element)]
    .filter(Boolean)
    .some((identifier) => identifier?.toLowerCase() === expected);
}

function elementIdentifier(element: SvgElement): string | undefined {
  return element.attrs.id || elementLabel(element);
}

function countDescendantPaths(root: SvgElement): number {
  return flattenSvgElements(root).filter(
    (element) =>
      element.name.toLowerCase() === "path" &&
      typeof element.attrs.d === "string" &&
      element.attrs.d.trim().length > 0,
  ).length;
}

function uniqueValues(values: string[]): string[] {
  return [...new Set(values)];
}

function hasFilterSignal(element: SvgElement): boolean {
  const name = element.name.toLowerCase();
  if (
    name === "filter" ||
    name === "fegaussianblur" ||
    name === "fedropshadow"
  ) {
    return true;
  }

  const filter = getAttr(element.attrs, ["filter"]);
  if (filter) {
    return true;
  }

  const style = element.attrs.style;
  return Boolean(style && /filter\s*:|blur\s*\(|drop-shadow\s*\(/i.test(style));
}

function pushStrictIssue(
  strict: boolean,
  errors: string[],
  warnings: string[],
  message: string,
): void {
  if (strict) {
    errors.push(message);
    return;
  }

  warnings.push(message);
}

function hasTemplateLikeGroupName(groups: GeometryGroup[]): boolean {
  const groupNames = groups
    .map((group) => `${group.id ?? ""} ${group.label ?? ""}`.trim())
    .filter(Boolean);

  if (groupNames.length === 0) {
    return false;
  }

  return groupNames.some((name) =>
    /(regular|ultralight|black|small|large|symbols?|template|layers?)/i.test(
      name,
    ),
  );
}

function isMeaninglessName(name?: string): boolean {
  return Boolean(name && /^(path|shape|group|layer)[-_ ]?\d*$/i.test(name));
}

export function pathIdentity(path: GeometryPath): string {
  return path.label || path.id || `index:${path.index}`;
}

export function pathCommandSignature(path: GeometryPath): string {
  return path.commandTypes?.join("") ?? "";
}

export function groupSignature(groups: GeometryGroup[]): string {
  return groups
    .map(
      (group) =>
        `${group.depth}:${group.label || group.id || "unnamed"}:${group.childCount}`,
    )
    .join("|");
}

export function fillStrokeSignature(path: GeometryPath): string {
  return `${path.hasFill ? "fill" : "nofill"}:${path.hasStroke ? "stroke" : "nostroke"}`;
}

export function findStyleProperty(
  attrs: Record<string, string>,
  property: string,
): string | undefined {
  return styleOrAttr(attrs, property);
}
