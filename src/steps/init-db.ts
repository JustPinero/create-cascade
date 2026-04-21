import { execFileSync } from "node:child_process";
import { InstallError, ExitCode } from "../errors.js";

/**
 * Initialize Cascade's SQLite DB: prisma generate + db push + optional seed.
 * Seed failure is non-fatal — users can re-run `pnpm db:seed` later.
 */
export function initDb(
  cascadeDir: string,
  exec: typeof execFileSync = execFileSync
): void {
  try {
    exec("pnpm", ["exec", "prisma", "generate"], {
      stdio: "pipe",
      cwd: cascadeDir,
    });
    exec("pnpm", ["exec", "prisma", "db", "push"], {
      stdio: "pipe",
      cwd: cascadeDir,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new InstallError(
      `DB initialization failed: ${msg}`,
      ExitCode.INSTALL_FAILURE,
      "Run `pnpm db:push` manually inside the Cascade directory and re-run."
    );
  }

  try {
    exec("pnpm", ["db:seed"], { stdio: "pipe", cwd: cascadeDir });
  } catch {
    // Non-fatal — seeding is optional.
  }
}
