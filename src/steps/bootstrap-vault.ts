import { execFileSync } from "node:child_process";
import { InstallError, ExitCode } from "../errors.js";

export const CASCADE_VAULT = "Cascade";
export const CASCADE_RUNTIME_ITEM = "Cascade Runtime";

/**
 * Ensure a "Cascade" vault exists in 1P. Creates it if missing.
 */
export function ensureCascadeVault(
  exec: typeof execFileSync = execFileSync
): void {
  let vaults: Array<{ name: string }> = [];
  try {
    const out = exec("op", ["vault", "list", "--format", "json"], {
      stdio: "pipe",
      timeout: 10000,
    }).toString();
    vaults = JSON.parse(out);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new InstallError(
      `Could not list 1P vaults: ${msg}`,
      ExitCode.ONEPASSWORD_FAILURE,
      "Confirm you are signed in with `op account list`."
    );
  }

  if (vaults.some((v) => v.name === CASCADE_VAULT)) return;

  try {
    exec("op", ["vault", "create", CASCADE_VAULT], {
      stdio: "pipe",
      timeout: 10000,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new InstallError(
      `Could not create 1P vault "${CASCADE_VAULT}": ${msg}`,
      ExitCode.ONEPASSWORD_FAILURE,
      "Create the vault manually in 1Password and re-run."
    );
  }
}

/**
 * Create or update the "Cascade Runtime" 1P item with the given secrets.
 * Returns the op:// reference for `anthropic_api_key`, ready to drop in .env.
 */
export function bootstrapCascadeRuntimeItem(
  secrets: Record<string, string>,
  exec: typeof execFileSync = execFileSync
): string {
  let existingId: string | null = null;
  try {
    const out = exec(
      "op",
      [
        "item",
        "get",
        CASCADE_RUNTIME_ITEM,
        "--vault",
        CASCADE_VAULT,
        "--format",
        "json",
      ],
      { stdio: "pipe", timeout: 10000 }
    ).toString();
    const parsed = JSON.parse(out) as { id?: string };
    existingId = parsed.id ?? null;
  } catch {
    existingId = null;
  }

  const fieldArgs = Object.entries(secrets).map(
    ([k, v]) => `${k}[password]=${v}`
  );

  try {
    if (existingId) {
      exec(
        "op",
        ["item", "edit", existingId, "--vault", CASCADE_VAULT, ...fieldArgs],
        { stdio: "pipe", timeout: 10000 }
      );
    } else {
      exec(
        "op",
        [
          "item",
          "create",
          "--category=API Credential",
          `--title=${CASCADE_RUNTIME_ITEM}`,
          `--vault=${CASCADE_VAULT}`,
          ...fieldArgs,
        ],
        { stdio: "pipe", timeout: 10000 }
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new InstallError(
      `Could not write 1P item "${CASCADE_RUNTIME_ITEM}": ${msg}`,
      ExitCode.ONEPASSWORD_FAILURE,
      "Create the item manually via `op item create` and re-run."
    );
  }

  return `op://${CASCADE_VAULT}/${CASCADE_RUNTIME_ITEM}/anthropic_api_key`;
}
