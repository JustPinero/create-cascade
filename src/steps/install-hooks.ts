import { execFileSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { InstallError, ExitCode } from "../errors.js";

/**
 * Run Cascade's own hook installer (`scripts/install-hooks.ts`).
 * That script wires Claude Code's Stop hook to `http://localhost:3000/api/webhook/session-complete`
 * and auto-repairs the hook config format.
 */
export function installClaudeHooks(
  cascadeDir: string,
  exec: typeof execFileSync = execFileSync
): void {
  const hookScript = path.join(cascadeDir, "scripts", "install-hooks.ts");
  if (!fs.existsSync(hookScript)) {
    throw new InstallError(
      `install-hooks.ts missing at ${hookScript}.`,
      ExitCode.INSTALL_FAILURE,
      "Cascade repo may be incomplete — re-clone and retry."
    );
  }
  try {
    exec("pnpm", ["exec", "tsx", hookScript], {
      stdio: "pipe",
      cwd: cascadeDir,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new InstallError(
      `Hook installation failed: ${msg}`,
      ExitCode.INSTALL_FAILURE,
      "Check ~/.claude/settings.json manually, then re-run."
    );
  }
}
