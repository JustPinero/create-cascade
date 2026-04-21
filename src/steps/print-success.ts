export interface SuccessDetails {
  url: string;
  installPath: string;
  vaultItem: string;
}

/**
 * Build the final success banner printed after a successful install.
 * Kept pure (returns a string) so it's testable and doesn't couple to stdout.
 */
export function buildSuccessBanner(details: SuccessDetails): string {
  const { url, installPath, vaultItem } = details;
  const lines = [
    "",
    "╔══════════════════════════════════════════════════════════════╗",
    "║  Cascade is ready.                                           ║",
    "╚══════════════════════════════════════════════════════════════╝",
    "",
    `  → Open ${url} in your browser`,
    `  → Installed at ${installPath}`,
    `  → Secrets live in 1Password: ${vaultItem}`,
    "",
    "  Next:",
    "  • Scan your projects directory to import existing work",
    "  • Read CLAUDE.md for the dispatch action loop",
    "  • Dispatch your first project from the dashboard",
    "",
  ];
  return lines.join("\n");
}

export function printSuccess(
  details: SuccessDetails,
  out: (s: string) => void = (s) => process.stdout.write(s + "\n")
): void {
  out(buildSuccessBanner(details));
}
