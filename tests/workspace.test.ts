import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { writeMarkdownArtifact } from "../src/output/writers.js";
import { Workspace } from "../src/workspace.js";

async function tempWorkspace(): Promise<Workspace> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "sf-symbols-ws-"));
  return new Workspace(root);
}

describe("Workspace", () => {
  it("resolves parent segments relative to the current base directory", async () => {
    const workspace = await tempWorkspace();

    expect(workspace.resolvePath("../outside.svg")).toMatch(/outside\.svg$/);
  });

  it("allows absolute paths without requiring a configured workspace", async () => {
    const workspace = await tempWorkspace();

    expect(workspace.resolvePath("/tmp/outside.svg")).toBe("/tmp/outside.svg");
  });

  it("refuses to overwrite writer output unless allowed", async () => {
    const workspace = await tempWorkspace();

    await writeMarkdownArtifact(workspace, "reports", "report.md", "one");

    await expect(
      writeMarkdownArtifact(workspace, "reports", "report.md", "two"),
    ).rejects.toThrow(/Refusing to overwrite/);

    await expect(
      writeMarkdownArtifact(workspace, "reports", "report.md", "two", {
        overwrite: true,
      }),
    ).resolves.toContain("report.md");
  });
});
