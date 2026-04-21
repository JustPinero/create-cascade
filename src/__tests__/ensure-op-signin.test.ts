import { describe, it, expect, vi } from "vitest";
import type { execFileSync } from "node:child_process";
import { ensureOpSignin } from "../steps/ensure-op-signin.js";
import { InstallError, ExitCode } from "../errors.js";

describe("ensureOpSignin", () => {
  it("passes when op vault list succeeds", () => {
    const exec = vi.fn(() => Buffer.from("[]")) as unknown as typeof execFileSync;
    expect(() => ensureOpSignin(exec)).not.toThrow();
  });

  it("throws with install guidance when op is not on PATH (ENOENT)", () => {
    const exec = vi.fn(() => {
      const err = new Error("command not found") as NodeJS.ErrnoException;
      err.code = "ENOENT";
      throw err;
    }) as unknown as typeof execFileSync;

    let err: unknown;
    try {
      ensureOpSignin(exec);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(InstallError);
    expect((err as InstallError).code).toBe(ExitCode.ONEPASSWORD_FAILURE);
    expect((err as InstallError).remediation).toMatch(
      /developer\.1password\.com/
    );
  });

  it("throws with signin guidance when the session is expired", () => {
    const exec = vi.fn(() => {
      throw new Error("You are not currently signed in");
    }) as unknown as typeof execFileSync;

    let err: unknown;
    try {
      ensureOpSignin(exec);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(InstallError);
    expect((err as InstallError).remediation).toMatch(/op signin/);
    expect((err as InstallError).remediation).toMatch(/Desktop/);
  });

  it("throws a generic 1P error for anything else", () => {
    const exec = vi.fn(() => {
      throw new Error("weird internal error");
    }) as unknown as typeof execFileSync;

    let err: unknown;
    try {
      ensureOpSignin(exec);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(InstallError);
    expect((err as InstallError).message).toMatch(/weird internal error/);
  });
});
