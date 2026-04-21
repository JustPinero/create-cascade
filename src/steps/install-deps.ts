import { execFileSync } from "node:child_process";
import { InstallError, ExitCode } from "../errors.js";

/**
 * Run `pnpm install` inside the cloned Cascade directory.
 */
export function installDeps(
  cascadeDir: string,
  exec: typeof execFileSync = execFileSync
): void {
  try {
    exec("pnpm", ["install"], { stdio: "pipe", cwd: cascadeDir });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new InstallError(
      `pnpm install failed in ${cascadeDir}: ${msg}`,
      ExitCode.INSTALL_FAILURE,
      "Check the pnpm output, resolve the underlying error, and re-run."
    );
  }
}
