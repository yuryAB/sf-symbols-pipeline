import fs from "node:fs/promises";
import path from "node:path";

export class WorkspaceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceError";
  }
}

export type WriteFileOptions = {
  overwrite?: boolean;
};

export class Workspace {
  readonly root: string;

  constructor(rootPath?: string) {
    const root = rootPath?.trim() || process.cwd();
    this.root = path.resolve(root);
  }

  static fromCwd(): Workspace {
    return new Workspace(process.cwd());
  }

  resolvePath(inputPath: string): string {
    if (!inputPath || inputPath.trim().length === 0) {
      throw new WorkspaceError("Path must not be empty.");
    }

    return path.isAbsolute(inputPath)
      ? path.resolve(inputPath)
      : path.resolve(this.root, inputPath);
  }

  relativePath(absolutePath: string): string {
    return path.relative(this.root, absolutePath);
  }

  async readText(inputPath: string): Promise<string> {
    return fs.readFile(this.resolvePath(inputPath), "utf8");
  }

  async exists(inputPath: string): Promise<boolean> {
    try {
      await fs.access(this.resolvePath(inputPath));
      return true;
    } catch {
      return false;
    }
  }

  async ensureDir(inputPath: string): Promise<string> {
    const resolved = this.resolvePath(inputPath);
    await fs.mkdir(resolved, { recursive: true });
    return resolved;
  }

  async writeText(
    inputPath: string,
    content: string,
    options: WriteFileOptions = {},
  ): Promise<string> {
    const resolved = this.resolvePath(inputPath);
    await fs.mkdir(path.dirname(resolved), { recursive: true });

    if (!options.overwrite) {
      try {
        await fs.access(resolved);
        throw new WorkspaceError(
          `Refusing to overwrite existing file: ${inputPath}`,
        );
      } catch (error) {
        if (error instanceof WorkspaceError) {
          throw error;
        }
      }
    }

    await fs.writeFile(resolved, content, "utf8");
    return resolved;
  }

  async copyFile(
    sourcePath: string,
    destinationPath: string,
    options: WriteFileOptions = {},
  ): Promise<string> {
    const source = this.resolvePath(sourcePath);
    const destination = this.resolvePath(destinationPath);
    await fs.mkdir(path.dirname(destination), { recursive: true });

    if (!options.overwrite) {
      try {
        await fs.access(destination);
        throw new WorkspaceError(
          `Refusing to overwrite existing file: ${destinationPath}`,
        );
      } catch (error) {
        if (error instanceof WorkspaceError) {
          throw error;
        }
      }
    }

    await fs.copyFile(source, destination);
    return destination;
  }
}
