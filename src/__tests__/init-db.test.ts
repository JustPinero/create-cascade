import { describe, it, expect, vi } from "vitest";
import type { execFileSync } from "node:child_process";
import { initDb } from "../steps/init-db.js";
import { InstallError, ExitCode } from "../errors.js";

describe("initDb", () => {
  it("runs prisma generate, then db push, then seed — in order", () => {
    const calls: string[][] = [];
    const exec = vi.fn(
      (cmd: string, args: readonly string[]) => {
        calls.push([cmd, ...args]);
        return Buffer.from("");
      }
    ) as unknown as typeof execFileSync;

    initDb("/cascade", exec);

    expect(calls[0]).toEqual(["pnpm", "exec", "prisma", "generate"]);
    expect(calls[1]).toEqual(["pnpm", "exec", "prisma", "db", "push"]);
    expect(calls[2]).toEqual(["pnpm", "db:seed"]);
  });

  it("passes cwd to each exec", () => {
    const exec = vi.fn(() => Buffer.from("")) as unknown as typeof execFileSync;
    initDb("/cascade", exec);

    const allCalls = (
      exec as unknown as { mock: { calls: unknown[][] } }
    ).mock.calls;
    for (const call of allCalls) {
      const opts = call[2] as { cwd?: string } | undefined;
      expect(opts?.cwd).toBe("/cascade");
    }
  });

  it("throws INSTALL_FAILURE when generate fails", () => {
    const exec = vi.fn(
      (_cmd: string, args: readonly string[]) => {
        if (args.includes("generate")) throw new Error("prisma borked");
        return Buffer.from("");
      }
    ) as unknown as typeof execFileSync;

    let err: unknown;
    try {
      initDb("/cascade", exec);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(InstallError);
    expect((err as InstallError).code).toBe(ExitCode.INSTALL_FAILURE);
  });

  it("swallows seed failures as non-fatal", () => {
    const exec = vi.fn(
      (_cmd: string, args: readonly string[]) => {
        if (args.includes("db:seed")) throw new Error("no seed data");
        return Buffer.from("");
      }
    ) as unknown as typeof execFileSync;

    expect(() => initDb("/cascade", exec)).not.toThrow();
  });
});
