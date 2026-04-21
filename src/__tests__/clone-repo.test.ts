import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { execFileSync } from "node:child_process";
import { cloneRepo } from "../steps/clone-repo.js";
import { InstallError, ExitCode } from "../errors.js";

describe("cloneRepo", () => {
  const tmpDir = path.join(os.tmpdir(), `clone-test-${Date.now()}`);

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // fine
    }
  });

  it("tries `gh repo clone` first", () => {
    const exec = vi.fn(() => Buffer.from("")) as unknown as typeof execFileSync;
    cloneRepo({ targetPath: path.join(tmpDir, "a") }, exec);
    expect(exec).toHaveBeenCalledTimes(1);
    const firstCall = (exec as unknown as { mock: { calls: unknown[][] } }).mock
      .calls[0];
    expect(firstCall?.[0]).toBe("gh");
    expect(firstCall?.[1]).toContain("JustPinero/Cascade");
  });

  it("falls back to `git clone https://…` if gh fails", () => {
    let callCount = 0;
    const exec = vi.fn(() => {
      callCount++;
      if (callCount === 1) throw new Error("gh not installed");
      return Buffer.from("");
    }) as unknown as typeof execFileSync;

    cloneRepo({ targetPath: path.join(tmpDir, "b") }, exec);
    expect(callCount).toBe(2);
    const secondCall = (exec as unknown as { mock: { calls: unknown[][] } })
      .mock.calls[1];
    expect(secondCall?.[0]).toBe("git");
    expect(secondCall?.[1]).toContain(
      "https://github.com/JustPinero/Cascade.git"
    );
  });

  it("throws CLONE_FAILURE if both gh and git fail", () => {
    const exec = vi.fn(() => {
      throw new Error("nope");
    }) as unknown as typeof execFileSync;

    let err: unknown;
    try {
      cloneRepo({ targetPath: path.join(tmpDir, "c") }, exec);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(InstallError);
    expect((err as InstallError).code).toBe(ExitCode.CLONE_FAILURE);
  });

  it("refuses to clobber a non-empty target directory", () => {
    const target = path.join(tmpDir, "has-stuff");
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(path.join(target, "file.txt"), "exists");
    const exec = vi.fn(() => Buffer.from("")) as unknown as typeof execFileSync;

    expect(() => cloneRepo({ targetPath: target }, exec)).toThrow(InstallError);
    expect(exec).not.toHaveBeenCalled();
  });

  it("accepts a custom repo", () => {
    const exec = vi.fn(() => Buffer.from("")) as unknown as typeof execFileSync;
    cloneRepo(
      { targetPath: path.join(tmpDir, "d"), repo: "owner/fork" },
      exec
    );
    const firstCall = (exec as unknown as { mock: { calls: unknown[][] } })
      .mock.calls[0];
    expect(firstCall?.[1]).toContain("owner/fork");
  });
});
