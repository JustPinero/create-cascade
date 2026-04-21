import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { InstallError, ExitCode } from "../errors.js";

export interface CloneOptions {
  targetPath: string;
  repo?: string;
}

const DEFAULT_REPO = "JustPinero/Cascade";

/**
 * Clone Cascade into targetPath. Prefers `gh repo clone` for HTTPS + auth integration;
 * falls back to `git clone https://github.com/<repo>.git` if gh is missing.
 * Refuses to clobber an existing non-empty directory.
 */
export function cloneRepo(
  opts: CloneOptions,
  exec: typeof execFileSync = execFileSync
): void {
  const { targetPath, repo = DEFAULT_REPO } = opts;

  if (fs.existsSync(targetPath) && fs.readdirSync(targetPath).length > 0) {
    throw new InstallError(
      `Target directory ${targetPath} already exists and is not empty.`,
      ExitCode.CLONE_FAILURE,
      `Choose a different path, or remove ${targetPath} and re-run.`
    );
  }

  try {
    exec("gh", ["repo", "clone", repo, targetPath], { stdio: "pipe" });
    return;
  } catch {
    // Fall back to git
  }

  try {
    exec("git", ["clone", `https://github.com/${repo}.git`, targetPath], {
      stdio: "pipe",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new InstallError(
      `Failed to clone ${repo}: ${msg}`,
      ExitCode.CLONE_FAILURE,
      "Ensure you have network access and either `gh` (preferred) or `git` on your PATH."
    );
  }
}
