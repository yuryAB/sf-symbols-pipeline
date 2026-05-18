import type { SvgAttributes } from "./parseSvg.js";

export type PathBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
};

export type PathCommandAnalysis = {
  commandCount: number;
  commandTypes: string[];
  estimatedPointCount: number;
  isProbablyClosed: boolean;
  bounds?: PathBounds;
  approxArea?: number;
};

const COMMAND_RE = /^[AaCcHhLlMmQqSsTtVvZz]$/;
const TOKEN_RE =
  /[AaCcHhLlMmQqSsTtVvZz]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g;

const PARAMS_BY_COMMAND: Record<string, number> = {
  M: 2,
  L: 2,
  H: 1,
  V: 1,
  C: 6,
  S: 4,
  Q: 4,
  T: 2,
  A: 7,
  Z: 0,
};

const POINTS_BY_COMMAND: Record<string, number> = {
  M: 1,
  L: 1,
  H: 1,
  V: 1,
  C: 3,
  S: 2,
  Q: 2,
  T: 1,
  A: 1,
  Z: 0,
};

export function analyzePathData(d?: string): PathCommandAnalysis {
  if (!d) {
    return {
      commandCount: 0,
      commandTypes: [],
      estimatedPointCount: 0,
      isProbablyClosed: false,
    };
  }

  const tokens = d.match(TOKEN_RE) ?? [];
  const commandTypes: string[] = [];
  let estimatedPointCount = 0;
  let index = 0;
  let currentCommand: string | undefined;
  let currentX = 0;
  let currentY = 0;
  let subpathStartX = 0;
  let subpathStartY = 0;
  const tracker = createBoundsTracker();

  const hasNumbers = (count: number): boolean =>
    index + count <= tokens.length &&
    tokens
      .slice(index, index + count)
      .every((token) => !COMMAND_RE.test(token));

  const numberAt = (offset: number): number => Number(tokens[index + offset]);

  const pushCommand = (command: string): void => {
    commandTypes.push(command);
    estimatedPointCount += POINTS_BY_COMMAND[command] ?? 0;
  };

  const absolutePoint = (
    x: number,
    y: number,
    relative: boolean,
  ): { x: number; y: number } => ({
    x: relative ? currentX + x : x,
    y: relative ? currentY + y : y,
  });

  const visitPoint = (x: number, y: number): void => {
    tracker.add(x, y);
  };

  while (index < tokens.length) {
    const token = tokens[index];

    if (COMMAND_RE.test(token)) {
      currentCommand = token;
      index += 1;
    }

    if (!currentCommand) {
      index += 1;
      continue;
    }

    const rawCommand = currentCommand;
    const command = rawCommand.toUpperCase();
    const relative = rawCommand !== command;
    const paramCount = PARAMS_BY_COMMAND[command] ?? 0;

    if (command === "Z") {
      pushCommand("Z");
      currentX = subpathStartX;
      currentY = subpathStartY;
      currentCommand = undefined;
      continue;
    }

    if (paramCount === 0 || !hasNumbers(paramCount)) {
      index += 1;
      continue;
    }

    if (command === "M") {
      let firstMove = true;
      while (hasNumbers(2)) {
        const point = absolutePoint(numberAt(0), numberAt(1), relative);
        index += 2;

        pushCommand(firstMove ? "M" : "L");
        visitPoint(point.x, point.y);
        currentX = point.x;
        currentY = point.y;

        if (firstMove) {
          subpathStartX = point.x;
          subpathStartY = point.y;
        }

        firstMove = false;
      }

      currentCommand = relative ? "l" : "L";
      continue;
    }

    while (hasNumbers(paramCount)) {
      switch (command) {
        case "L": {
          const point = absolutePoint(numberAt(0), numberAt(1), relative);
          pushCommand("L");
          visitPoint(point.x, point.y);
          currentX = point.x;
          currentY = point.y;
          break;
        }
        case "H": {
          const x = relative ? currentX + numberAt(0) : numberAt(0);
          pushCommand("H");
          visitPoint(x, currentY);
          currentX = x;
          break;
        }
        case "V": {
          const y = relative ? currentY + numberAt(0) : numberAt(0);
          pushCommand("V");
          visitPoint(currentX, y);
          currentY = y;
          break;
        }
        case "C": {
          const control1 = absolutePoint(numberAt(0), numberAt(1), relative);
          const control2 = absolutePoint(numberAt(2), numberAt(3), relative);
          const point = absolutePoint(numberAt(4), numberAt(5), relative);
          pushCommand("C");
          visitPoint(control1.x, control1.y);
          visitPoint(control2.x, control2.y);
          visitPoint(point.x, point.y);
          currentX = point.x;
          currentY = point.y;
          break;
        }
        case "S":
        case "Q": {
          const control = absolutePoint(numberAt(0), numberAt(1), relative);
          const point = absolutePoint(numberAt(2), numberAt(3), relative);
          pushCommand(command);
          visitPoint(control.x, control.y);
          visitPoint(point.x, point.y);
          currentX = point.x;
          currentY = point.y;
          break;
        }
        case "T": {
          const point = absolutePoint(numberAt(0), numberAt(1), relative);
          pushCommand("T");
          visitPoint(point.x, point.y);
          currentX = point.x;
          currentY = point.y;
          break;
        }
        case "A": {
          const radiusX = Math.abs(numberAt(0));
          const radiusY = Math.abs(numberAt(1));
          const point = absolutePoint(numberAt(5), numberAt(6), relative);
          pushCommand("A");
          visitPoint(currentX - radiusX, currentY - radiusY);
          visitPoint(currentX + radiusX, currentY + radiusY);
          visitPoint(point.x - radiusX, point.y - radiusY);
          visitPoint(point.x + radiusX, point.y + radiusY);
          visitPoint(point.x, point.y);
          currentX = point.x;
          currentY = point.y;
          break;
        }
      }

      index += paramCount;
    }
  }

  const bounds = tracker.bounds();

  return {
    commandCount: commandTypes.length,
    commandTypes,
    estimatedPointCount,
    isProbablyClosed: /[Zz]\s*$/.test(d.trim()),
    ...(bounds ? { bounds, approxArea: bounds.width * bounds.height } : {}),
  };
}

export function attrsHaveStroke(attrs: SvgAttributes): boolean {
  const stroke = styleOrAttr(attrs, "stroke");
  if (!stroke) {
    return false;
  }

  const normalized = stroke.trim().toLowerCase();
  return (
    normalized !== "none" &&
    normalized !== "transparent" &&
    normalized !== "0" &&
    !normalized.endsWith("opacity:0")
  );
}

export function attrsHaveFill(attrs: SvgAttributes): boolean {
  const fill = styleOrAttr(attrs, "fill");
  if (!fill) {
    return true;
  }

  return fill.trim().toLowerCase() !== "none";
}

export function styleOrAttr(
  attrs: SvgAttributes,
  property: string,
): string | undefined {
  if (attrs[property]) {
    return attrs[property];
  }

  const style = attrs.style;
  if (!style) {
    return undefined;
  }

  const match = style.match(new RegExp(`${property}\\s*:\\s*([^;]+)`, "i"));
  return match?.[1]?.trim();
}

function createBoundsTracker(): {
  add: (x: number, y: number) => void;
  bounds: () => PathBounds | undefined;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  return {
    add: (x: number, y: number): void => {
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return;
      }

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    },
    bounds: (): PathBounds | undefined => {
      if (
        !Number.isFinite(minX) ||
        !Number.isFinite(minY) ||
        !Number.isFinite(maxX) ||
        !Number.isFinite(maxY)
      ) {
        return undefined;
      }

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
    },
  };
}
