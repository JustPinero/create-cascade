# create-cascade

One-command installer for **Cascade** — the AI-powered multi-project orchestration dashboard.

```bash
npx @justpinero/create-cascade
```

## What it does

1. **Detects your OS** — refuses pure Windows with clear WSL2 guidance.
2. **Checks prerequisites** — Node 22+, pnpm, Claude Code CLI, tmux, 1Password CLI. Prints per-OS install commands for anything missing and exits.
3. **(WSL2 only)** Offers to write safe `.wslconfig` defaults that prevent the "terminal dies under load" failure mode.
4. **Prompts for install path** (default: `~/Code/cascade`).
5. **Clones** `github.com/JustPinero/Cascade`.
6. **Runs `pnpm install`.**
7. **Verifies your 1Password CLI is signed in.** If not, prints the exact next step.
8. **Creates the `Cascade` 1P vault** (if missing) and a `Cascade Runtime` item holding your Anthropic API key.
9. **Writes `.env`** with `op://` references — no plaintext secrets on disk.
10. **Wires the Claude Code Stop hook** to Cascade's webhook.
11. **Initializes the SQLite DB** (`prisma db push` + seed).
12. **Smoke tests** — starts Cascade, confirms `/api/health`, fires a single ~10-token Haiku call to verify end-to-end auth.
13. **Prints the URL and next steps.**

## Prerequisites (you install these yourself, the installer just checks)

### macOS
```bash
brew install node@22 tmux
corepack enable pnpm
npm install -g @anthropic-ai/claude-code
brew install --cask 1password-cli
```

### Linux / WSL2
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash && sudo apt-get install -y nodejs tmux
corepack enable pnpm
npm install -g @anthropic-ai/claude-code
# 1Password CLI: see https://developer.1password.com/docs/cli/get-started/
```

### Windows
Install **WSL2** first (`wsl --install`), then run this installer inside a WSL shell.

## 1Password setup

Cascade requires a 1Password account (any plan) to store its runtime secrets. After install:

- Open **1Password Desktop → Settings → Developer** → enable **"Integrate with 1Password CLI"** for biometric re-auth.
- From WSL2: also ensure the Windows Desktop app is running when you use `op`.

## Flags

- `--skip-smoke` — skip the live Anthropic call (useful offline or when the account has no balance).

## Exit codes

| Code | Meaning |
|------|---------|
| 0    | Success |
| 1    | Prerequisites missing |
| 2    | 1Password failure |
| 3    | Clone failure |
| 4    | pnpm / DB / hook install failure |
| 5    | Smoke test failure |
| 6    | User canceled |
| 99   | Unknown |

## Development

```bash
pnpm install
pnpm test       # vitest
pnpm dev        # tsx src/index.ts
pnpm build      # bundle to dist/ for publish
```

## License

MIT
