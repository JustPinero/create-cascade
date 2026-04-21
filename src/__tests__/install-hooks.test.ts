import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { execFileSync } from "node:child_process";
import { installClaudeHooks } from "../steps/install-hooks.js";
import { InstallError, ExitCode } from "../errors.js";

describe("installClaudeHooks", () => {
  const tmpDir = path.join(os.tmpdir(), `install-hooks-test-${Date.now()}`);

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // fine
    }
  });

  it("invokes `pnpm exec tsx scripts/install-hooks.ts` in the cascade dir", () => {
    fs.mkdirSync(path.join(tmpDir, "scripts"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, "scripts", "install-hooks.ts"),
      "// stub"
    );

    const exec = vi.fn(() => Buffer.from("")) as unknown as typeof execFileSync;
    installClaudeHooks(tmpDir, exec);

    const firstCall = (exec as unknown as { mock: { calls: unknown[][] } })
      .mock.calls[0];
    expect(firstCall?.[0]).toBe("pnpm");
    expect(firstCall?.[1]).toEqual([
      "exec",
      "tsx",
      path.join(tmpDir, "scripts", "install-hooks.ts"),
    ]);
    const opts = firstCall?.[2] as { cwd?: string } | undefined;
    expect(opts?.cwd).toBe(tmpDir);
  });

  it("throws INSTALL_FAILURE when install-hooks.ts is missing", () => {
    fs.mkdirSync(tmpDir, { recursive: true });
    const exec = vi.fn(() => Buffer.from("")) as unknown as typeof execFileSync;

    let err: unknown;
    try {
      installClaudeHooks(tmpDir, exec);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(InstallError);
    expect((err as InstallError).code).toBe(ExitCode.INSTALL_FAILURE);
    expect((err as InstallError).remediation).toMatch(/re-clone/);
    expect(exec).not.toHaveBeenCalled();
  });

  it("wraps exec failures as INSTALL_FAILURE", () => {
    fs.mkdirSync(path.join(tmpDir, "scripts"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, "scripts", "install-hooks.ts"),
      "// stub"
    );

    const exec = vi.fn(() => {
      throw new Error("tsx blew up");
    }) as unknown as typeof execFileSync;

    let err: unknown;
    try {
      installClaudeHooks(tmpDir, exec);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(InstallError);
    expect((err as InstallError).code).toBe(ExitCode.INSTALL_FAILURE);
    expect((err as InstallError).message).toMatch(/tsx blew up/);
  });
});
