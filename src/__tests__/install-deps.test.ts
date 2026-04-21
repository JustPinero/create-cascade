import { describe, it, expect, vi } from "vitest";
import type { execFileSync } from "node:child_process";
import { installDeps } from "../steps/install-deps.js";
import { InstallError, ExitCode } from "../errors.js";

describe("installDeps", () => {
  it("runs `pnpm install` in the given cascade directory", () => {
    const exec = vi.fn(() => Buffer.from("")) as unknown as typeof execFileSync;
    installDeps("/path/to/cascade", exec);

    const firstCall = (exec as unknown as { mock: { calls: unknown[][] } })
      .mock.calls[0];
    expect(firstCall?.[0]).toBe("pnpm");
    expect(firstCall?.[1]).toEqual(["install"]);
    const opts = firstCall?.[2] as { cwd?: string } | undefined;
    expect(opts?.cwd).toBe("/path/to/cascade");
  });

  it("wraps failures in INSTALL_FAILURE", () => {
    const exec = vi.fn(() => {
      throw new Error("network down");
    }) as unknown as typeof execFileSync;

    let err: unknown;
    try {
      installDeps("/cascade", exec);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(InstallError);
    expect((err as InstallError).code).toBe(ExitCode.INSTALL_FAILURE);
    expect((err as InstallError).message).toMatch(/network down/);
  });
});
