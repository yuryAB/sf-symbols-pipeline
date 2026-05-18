import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runCompareVariableSources } from "../src/tools/compareVariableSources.js";
import { Workspace } from "../src/workspace.js";

async function tempWorkspace(): Promise<{
  workspace: Workspace;
  root: string;
}> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "sf-symbols-compare-"));
  return { workspace: new Workspace(root), root };
}

async function writeFixture(
  root: string,
  name: string,
  pathCount: number,
): Promise<void> {
  const paths = Array.from(
    { length: pathCount },
    (_, index) =>
      `<path id="part-${index}" d="M${index} ${index} L9 1 L9 9 Z" />`,
  ).join("");

  await fs.writeFile(
    path.join(root, name),
    `<svg viewBox="0 0 10 10"><g id="Regular-S">${paths}</g></svg>`,
    "utf8",
  );
}

async function writeSvg(
  root: string,
  name: string,
  paths: string[],
): Promise<void> {
  await fs.writeFile(
    path.join(root, name),
    `<svg viewBox="0 0 100 100"><g id="Regular-S">${paths.join("")}</g></svg>`,
    "utf8",
  );
}

describe("compare_variable_sources", () => {
  it("detects mismatched path counts", async () => {
    const { workspace, root } = await tempWorkspace();
    await writeFixture(root, "ultralight.svg", 1);
    await writeFixture(root, "regular.svg", 2);
    await writeFixture(root, "black.svg", 1);

    const report = await runCompareVariableSources(workspace, {
      ultralightSvgPath: "ultralight.svg",
      regularSvgPath: "regular.svg",
      blackSvgPath: "black.svg",
    });

    expect(report.passed).toBe(false);
    expect(report.compatibility.pathCountMatches).toBe(false);
    expect(report.errors.join(" ")).toMatch(/Path counts differ/);
  });

  it("detects large path bounds drift across variable sources", async () => {
    const { workspace, root } = await tempWorkspace();
    await writeSvg(root, "ultralight.svg", [
      '<path id="part-0" d="M0 0 L10 0 L10 10 Z" />',
    ]);
    await writeSvg(root, "regular.svg", [
      '<path id="part-0" d="M0 0 L10 0 L10 10 Z" />',
    ]);
    await writeSvg(root, "black.svg", [
      '<path id="part-0" d="M0 0 L100 0 L100 100 Z" />',
    ]);

    const report = await runCompareVariableSources(workspace, {
      ultralightSvgPath: "ultralight.svg",
      regularSvgPath: "regular.svg",
      blackSvgPath: "black.svg",
    });

    expect(report.passed).toBe(true);
    expect(report.compatibility.boundsLikelyStable).toBe(false);
    expect(report.warnings.join(" ")).toMatch(/bounds drift/);
  });

  it("keeps bounds compatibility true when variable sources are stable", async () => {
    const { workspace, root } = await tempWorkspace();
    const paths = ['<path id="part-0" d="M0 0 L10 0 L10 10 Z" />'];
    await writeSvg(root, "ultralight.svg", paths);
    await writeSvg(root, "regular.svg", paths);
    await writeSvg(root, "black.svg", paths);

    const report = await runCompareVariableSources(workspace, {
      ultralightSvgPath: "ultralight.svg",
      regularSvgPath: "regular.svg",
      blackSvgPath: "black.svg",
    });

    expect(report.passed).toBe(true);
    expect(report.compatibility.boundsLikelyStable).toBe(true);
  });
});
