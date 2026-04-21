import { execFileSync } from "node:child_process";
import { InstallError, ExitCode } from "../errors.js";

/**
 * Confirm `op` is installed and the user has a live session by running
 * `op vault list`. Throws an InstallError with precise remediation if not.
 */
export function ensureOpSignin(
  exec: typeof execFileSync = execFileSync
): void {
  try {
    exec("op", ["vault", "list", "--format", "json"], {
      stdio: "pipe",
      timeout: 5000,
    });
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === "ENOENT") {
      throw new InstallError(
        "1Password CLI (`op`) not found.",
        ExitCode.ONEPASSWORD_FAILURE,
        "Install: https://developer.1password.com/docs/cli/get-started/"
      );
    }
    const msg = e.message || "";
    if (/not currently signed in|not signed in|sign in|signin/i.test(msg)) {
      throw new InstallError(
        "1Password is not signed in.",
        ExitCode.ONEPASSWORD_FAILURE,
        "Run `op signin` OR open 1Password Desktop → Settings → Developer → enable 'Integrate with 1Password CLI', then re-run this installer."
      );
    }
    throw new InstallError(
      `1Password check failed: ${msg}`,
      ExitCode.ONEPASSWORD_FAILURE,
      "Run `op account list` manually to diagnose."
    );
  }
}
