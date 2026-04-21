import os from "node:os";
import { InstallError, ExitCode } from "../errors.js";

export type SupportedOS = "macos" | "linux" | "wsl";

export interface DetectOSResult {
  os: SupportedOS;
  raw: string;
}

/**
 * Detect the host OS and reject pure Windows with clear WSL2 guidance.
 * Cascade's dispatcher uses tmux + bash; pure Windows has no equivalent
 * and would need a substantial native rewrite.
 */
export function detectOS(): DetectOSResult {
  const platform = os.platform();

  if (platform === "darwin") {
    return { os: "macos", raw: platform };
  }

  if (platform === "linux") {
    const release = os.release().toLowerCase();
    if (release.includes("microsoft") || release.includes("wsl")) {
      return { os: "wsl", raw: platform };
    }
    return { os: "linux", raw: platform };
  }

  if (platform === "win32") {
    throw new InstallError(
      "Pure Windows is not supported — Cascade runs under WSL2.",
      ExitCode.PREREQS_MISSING,
      "Install WSL2 first (https://learn.microsoft.com/windows/wsl/install), then open a WSL shell and re-run this installer."
    );
  }

  throw new InstallError(
    `Unsupported platform: ${platform}`,
    ExitCode.PREREQS_MISSING,
    "Cascade supports macOS, Linux, and WSL2 only."
  );
}
