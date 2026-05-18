import type { Workspace } from "../workspace.js";
import {
  fillStrokeSignature,
  groupSignature,
  inspectGeometry,
  parseSvgFromWorkspace,
  pathCommandSignature,
  pathIdentity,
  type GeometryReport,
} from "./templateAnalysis.js";
import type { PathBounds } from "./pathAnalysis.js";

export type VariableCompatibilityReport = {
  passed: boolean;
  errors: string[];
  warnings: string[];
  compatibility: {
    pathCountMatches: boolean;
    pathOrderLikelyMatches: boolean;
    pointCountLikelyMatches: boolean;
    groupStructureLikelyMatches: boolean;
    boundsLikelyStable: boolean;
  };
  diffs: Record<string, unknown>;
  writtenFiles?: string[];
};

export async function compareVariableSources(
  workspace: Workspace,
  input: {
    ultralightSvgPath: string;
    regularSvgPath: string;
    blackSvgPath: string;
  },
): Promise<VariableCompatibilityReport> {
  const [ultralight, regular, black] = await Promise.all([
    parseSvgFromWorkspace(workspace, input.ultralightSvgPath),
    parseSvgFromWorkspace(workspace, input.regularSvgPath),
    parseSvgFromWorkspace(workspace, input.blackSvgPath),
  ]);

  return compareGeometryReports({
    ultralight: inspectGeometry(ultralight),
    regular: inspectGeometry(regular),
    black: inspectGeometry(black),
  });
}

export function compareGeometryReports(reports: {
  ultralight: GeometryReport;
  regular: GeometryReport;
  black: GeometryReport;
}): VariableCompatibilityReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  const pathCounts = {
    ultralight: reports.ultralight.paths.length,
    regular: reports.regular.paths.length,
    black: reports.black.paths.length,
  };

  const pathCountMatches =
    pathCounts.ultralight === pathCounts.regular &&
    pathCounts.regular === pathCounts.black;

  if (!pathCountMatches) {
    errors.push(
      `Path counts differ across sources: Ultralight=${pathCounts.ultralight}, Regular=${pathCounts.regular}, Black=${pathCounts.black}.`,
    );
  }

  const identitySequences = {
    ultralight: reports.ultralight.paths.map(pathIdentity),
    regular: reports.regular.paths.map(pathIdentity),
    black: reports.black.paths.map(pathIdentity),
  };

  const pathOrderLikelyMatches =
    pathCountMatches &&
    arraysEqual(identitySequences.ultralight, identitySequences.regular) &&
    arraysEqual(identitySequences.regular, identitySequences.black);

  if (!pathOrderLikelyMatches) {
    warnings.push(
      "Heuristic: path order or ids/labels differ across variable sources.",
    );
  }

  const pointCounts = {
    ultralight: reports.ultralight.paths.map(
      (path) => path.estimatedPointCount,
    ),
    regular: reports.regular.paths.map((path) => path.estimatedPointCount),
    black: reports.black.paths.map((path) => path.estimatedPointCount),
  };

  const pointCountLikelyMatches =
    pathCountMatches &&
    arraysEqual(pointCounts.ultralight, pointCounts.regular) &&
    arraysEqual(pointCounts.regular, pointCounts.black);

  if (!pointCountLikelyMatches) {
    warnings.push(
      "Heuristic: estimated point counts differ. SF Symbols variable templates usually require corresponding paths to keep point counts aligned.",
    );
  }

  const commandSignatures = {
    ultralight: reports.ultralight.paths.map(pathCommandSignature),
    regular: reports.regular.paths.map(pathCommandSignature),
    black: reports.black.paths.map(pathCommandSignature),
  };

  if (
    pathCountMatches &&
    (!arraysEqual(commandSignatures.ultralight, commandSignatures.regular) ||
      !arraysEqual(commandSignatures.regular, commandSignatures.black))
  ) {
    warnings.push(
      "Heuristic: SVG path command sequences differ across variable sources.",
    );
  }

  const fillStrokeSignatures = {
    ultralight: reports.ultralight.paths.map(fillStrokeSignature),
    regular: reports.regular.paths.map(fillStrokeSignature),
    black: reports.black.paths.map(fillStrokeSignature),
  };

  if (
    pathCountMatches &&
    (!arraysEqual(
      fillStrokeSignatures.ultralight,
      fillStrokeSignatures.regular,
    ) ||
      !arraysEqual(fillStrokeSignatures.regular, fillStrokeSignatures.black))
  ) {
    warnings.push("Fill/stroke usage differs across variable sources.");
  }

  const groupSignatures = {
    ultralight: groupSignature(reports.ultralight.groups),
    regular: groupSignature(reports.regular.groups),
    black: groupSignature(reports.black.groups),
  };

  const groupStructureLikelyMatches =
    groupSignatures.ultralight === groupSignatures.regular &&
    groupSignatures.regular === groupSignatures.black;

  if (!groupStructureLikelyMatches) {
    warnings.push(
      "Heuristic: group structures differ across variable sources.",
    );
  }

  const boundsDiffs = pathCountMatches
    ? reports.regular.paths.map((regularPath, index) => ({
        path: pathIdentity(regularPath),
        ultralight: compareBounds(
          reports.ultralight.paths[index]?.bounds,
          regularPath.bounds,
        ),
        black: compareBounds(reports.black.paths[index]?.bounds, regularPath.bounds),
      }))
    : [];
  const boundsLikelyStable =
    pathCountMatches &&
    boundsDiffs.every(
      (diff) => diff.ultralight.stable && diff.black.stable,
    );

  if (!boundsLikelyStable) {
    warnings.push(
      "Heuristic: path bounds drift significantly across variable sources. Preserve original proportions and vary weight by conservative stroke/silhouette changes.",
    );
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    compatibility: {
      pathCountMatches,
      pathOrderLikelyMatches,
      pointCountLikelyMatches,
      groupStructureLikelyMatches,
      boundsLikelyStable,
    },
    diffs: {
      pathCounts,
      identitySequences,
      pointCounts,
      commandSignatures,
      fillStrokeSignatures,
      groupSignatures,
      boundsDiffs,
    },
  };
}

function arraysEqual<T>(left: T[], right: T[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function compareBounds(
  candidate?: PathBounds,
  regular?: PathBounds,
): {
  stable: boolean;
  centerDriftRatio?: number;
  widthDeltaRatio?: number;
  heightDeltaRatio?: number;
  aspectDeltaRatio?: number;
  reason?: string;
} {
  if (!candidate || !regular) {
    return { stable: true, reason: "bounds unavailable" };
  }

  const referenceSize = Math.max(regular.width, regular.height, 0.0001);
  const centerDriftRatio =
    Math.hypot(
      candidate.centerX - regular.centerX,
      candidate.centerY - regular.centerY,
    ) / referenceSize;
  const widthDeltaRatio =
    Math.abs(candidate.width - regular.width) / Math.max(regular.width, 0.0001);
  const heightDeltaRatio =
    Math.abs(candidate.height - regular.height) /
    Math.max(regular.height, 0.0001);
  const regularAspect = regular.width / Math.max(regular.height, 0.0001);
  const candidateAspect =
    candidate.width / Math.max(candidate.height, 0.0001);
  const aspectDeltaRatio =
    Math.abs(candidateAspect - regularAspect) / Math.max(regularAspect, 0.0001);

  return {
    stable:
      centerDriftRatio <= 0.35 &&
      widthDeltaRatio <= 0.5 &&
      heightDeltaRatio <= 0.5 &&
      aspectDeltaRatio <= 0.45,
    centerDriftRatio,
    widthDeltaRatio,
    heightDeltaRatio,
    aspectDeltaRatio,
  };
}
