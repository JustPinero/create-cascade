import { spawn, type ChildProcess, execFileSync } from "node:child_process";
import { InstallError, ExitCode } from "../errors.js";

export interface SmokeTestOptions {
  cascadeDir: string;
  port?: number;
  withLiveAnthropicCheck?: boolean;
  timeoutMs?: number;
}

/**
 * Spin up Cascade in dev mode, wait for /api/health, optionally fire a single
 * ~10-token Anthropic call to verify end-to-end auth. Kills the process on return.
 */
export async function smokeTest(opts: SmokeTestOptions): Promise<void> {
  const {
    cascadeDir,
    port = 3000,
    withLiveAnthropicCheck = true,
    timeoutMs = 60000,
  } = opts;

  let server: ChildProcess | null = null;
  try {
    server = spawn("pnpm", ["dev"], {
      cwd: cascadeDir,
      stdio: "pipe",
      detached: false,
    });

    const ready = await waitForHealth(`http://localhost:${port}/api/health`, timeoutMs);
    if (!ready) {
      throw new InstallError(
        `Cascade did not respond at /api/health within ${timeoutMs}ms.`,
        ExitCode.SMOKE_FAILURE,
        "Check logs in the cascade directory; confirm port 3000 is free."
      );
    }

    if (withLiveAnthropicCheck) {
      await liveAnthropicPing(cascadeDir);
    }
  } finally {
    if (server && !server.killed) {
      try {
        server.kill("SIGTERM");
      } catch {
        // best effort
      }
    }
  }
}

export async function waitForHealth(
  url: string,
  timeoutMs: number,
  pollMs: number = 500,
  fetchImpl: typeof fetch = fetch
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetchImpl(url);
      if (res.ok) return true;
    } catch {
      // not yet
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return false;
}

/**
 * Fire a tiny Anthropic request via Cascade's env to confirm the key works.
 * Uses Haiku (cheap) with a 10-token max.
 */
async function liveAnthropicPing(cascadeDir: string): Promise<void> {
  const script = `
    import Anthropic from "@anthropic-ai/sdk";
    const c = new Anthropic();
    const r = await c.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 10,
      messages: [{ role: "user", content: "hi" }],
    });
    process.exit(r.content && r.content.length ? 0 : 2);
  `;
  try {
    execFileSync("pnpm", ["exec", "tsx", "-e", script], {
      stdio: "pipe",
      cwd: cascadeDir,
      timeout: 15000,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new InstallError(
      `Anthropic API smoke test failed: ${msg}`,
      ExitCode.SMOKE_FAILURE,
      "Confirm your ANTHROPIC_API_KEY is valid and `op run` can resolve it."
    );
  }
}
