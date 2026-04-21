import { execFileSync } from "node:child_process";
import type { SupportedOS } from "./detect-os.js";

export interface Prereq {
  name: string;
  command: string;
  versionArg: string;
  installHint: (os: SupportedOS) => string;
}

export interface PrereqStatus {
  name: string;
  installed: boolean;
  version: string | null;
  installHint: string;
}

const INSTALL_HINTS = {
  node: {
    macos: "brew install node@22",
    linux: "curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash && sudo apt-get install -y nodejs",
    wsl: "curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash && sudo apt-get install -y nodejs",
  },
  pnpm: {
    macos: "corepack enable pnpm",
    linux: "corepack enable pnpm",
    wsl: "corepack enable pnpm",
  },
  claude: {
    macos: "npm install -g @anthropic-ai/claude-code",
    linux: "npm install -g @anthropic-ai/claude-code",
    wsl: "npm install -g @anthropic-ai/claude-code",
  },
  tmux: {
    macos: "brew install tmux",
    linux: "sudo apt-get install -y tmux",
    wsl: "sudo apt-get install -y tmux",
  },
  op: {
    macos: "brew install --cask 1password-cli",
    linux: "See https://developer.1password.com/docs/cli/get-started/",
    wsl: "See https://developer.1password.com/docs/cli/get-started/ — install the Linux CLI inside WSL, then enable 1P Desktop → Developer → Integrate with 1Password CLI",
  },
} as const satisfies Record<string, Record<SupportedOS, string>>;

export const PREREQS: Prereq[] = [
  { name: "node", command: "node", versionArg: "--version", installHint: (os) => INSTALL_HINTS.node[os] },
  { name: "pnpm", command: "pnpm", versionArg: "--version", installHint: (os) => INSTALL_HINTS.pnpm[os] },
  { name: "claude", command: "claude", versionArg: "--version", installHint: (os) => INSTALL_HINTS.claude[os] },
  { name: "tmux", command: "tmux", versionArg: "-V", installHint: (os) => INSTALL_HINTS.tmux[os] },
  { name: "op", command: "op", versionArg: "--version", installHint: (os) => INSTALL_HINTS.op[os] },
];

/**
 * Probe a single prereq by running `<command> <versionArg>`.
 * Exported for testability; orchestrator uses `checkPrereqs`.
 */
export function probePrereq(
  prereq: Prereq,
  hostOS: SupportedOS,
  exec: typeof execFileSync = execFileSync
): PrereqStatus {
  try {
    const output = exec(prereq.command, [prereq.versionArg], {
      stdio: "pipe",
      timeout: 5000,
    })
      .toString()
      .trim();
    return {
      name: prereq.name,
      installed: true,
      version: output,
      installHint: prereq.installHint(hostOS),
    };
  } catch {
    return {
      name: prereq.name,
      installed: false,
      version: null,
      installHint: prereq.installHint(hostOS),
    };
  }
}

/**
 * Check every prereq; return an array of statuses. Does not throw.
 * Orchestrator decides what to do with missing prereqs.
 */
export function checkPrereqs(
  hostOS: SupportedOS,
  exec: typeof execFileSync = execFileSync
): PrereqStatus[] {
  return PREREQS.map((p) => probePrereq(p, hostOS, exec));
}
