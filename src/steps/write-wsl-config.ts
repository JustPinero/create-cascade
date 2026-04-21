import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export interface WslConfigOptions {
  memoryGb: number;
  swapGb: number;
  processors?: number;
}

export function buildWslConfigContent(opts: WslConfigOptions): string {
  const lines: string[] = [
    "[wsl2]",
    `memory=${opts.memoryGb}GB`,
    `swap=${opts.swapGb}GB`,
    "autoMemoryReclaim=gradual",
    "sparseVhd=true",
  ];
  if (opts.processors) {
    lines.push(`processors=${opts.processors}`);
  }
  return lines.join("\n") + "\n";
}

/**
 * Compute safe defaults from the host's total memory.
 *   reserved_for_windows = clamp(40% of host, [8GB, 16GB])
 *   wsl_memory = max(4GB, host - reserved)
 *   swap = max(8GB, half of wsl_memory)
 *
 * Windows stays stable even on 12–16GB hosts; WSL gets proportionally more
 * on bigger hosts.
 */
export function defaultWslConfig(
  totalBytes: number = os.totalmem()
): WslConfigOptions {
  const GB = 1024 ** 3;
  const totalGb = Math.floor(totalBytes / GB);
  const reserved = Math.max(8, Math.min(16, Math.floor(totalGb * 0.4)));
  const memoryGb = Math.max(4, totalGb - reserved);
  const swapGb = Math.max(8, Math.floor(memoryGb / 2));
  return { memoryGb, swapGb };
}

/**
 * Resolve the Windows user profile path for .wslconfig when run inside WSL.
 * From inside WSL, it lives under /mnt/c/Users/<user>/.wslconfig.
 * If WSLENV or WINUSERPROFILE hints aren't set, fall back to ~/.wslconfig.
 */
export function wslConfigPath(env: NodeJS.ProcessEnv = process.env): string {
  const winProfile = env.WINUSERPROFILE || env.USERPROFILE;
  if (winProfile) {
    // Translate C:\Users\justi to /mnt/c/Users/justi if needed.
    const translated = winProfile.replace(
      /^([A-Z]):\\/,
      (_m, drive: string) => `/mnt/${drive.toLowerCase()}/`
    ).replace(/\\/g, "/");
    return path.join(translated, ".wslconfig");
  }
  return path.join(os.homedir(), ".wslconfig");
}

/**
 * Write the .wslconfig file. Returns the path written.
 */
export function writeWslConfig(
  opts: WslConfigOptions,
  targetPath: string = wslConfigPath()
): string {
  const content = buildWslConfigContent(opts);
  fs.writeFileSync(targetPath, content, "utf-8");
  return targetPath;
}
