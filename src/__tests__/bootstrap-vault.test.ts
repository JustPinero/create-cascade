import { describe, it, expect, vi } from "vitest";
import type { execFileSync } from "node:child_process";
import {
  ensureCascadeVault,
  bootstrapCascadeRuntimeItem,
  CASCADE_VAULT,
  CASCADE_RUNTIME_ITEM,
} from "../steps/bootstrap-vault.js";
import { InstallError, ExitCode } from "../errors.js";

function mockExec(
  handler: (cmd: string, args: readonly string[]) => string | Error
): typeof execFileSync {
  return ((cmd: string, args: readonly string[]) => {
    const result = handler(cmd, args);
    if (result instanceof Error) throw result;
    return Buffer.from(result);
  }) as typeof execFileSync;
}

describe("ensureCascadeVault", () => {
  it("no-ops when Cascade vault exists", () => {
    const calls: string[][] = [];
    const exec = mockExec((cmd, args) => {
      calls.push([cmd, ...args]);
      if (args.includes("list")) {
        return JSON.stringify([{ name: CASCADE_VAULT, id: "v1" }]);
      }
      return "";
    });
    ensureCascadeVault(exec);
    const createCall = calls.find((c) => c.includes("create"));
    expect(createCall).toBeUndefined();
  });

  it("creates the Cascade vault when absent", () => {
    const calls: string[][] = [];
    const exec = mockExec((cmd, args) => {
      calls.push([cmd, ...args]);
      if (args.includes("list")) return "[]";
      return "";
    });
    ensureCascadeVault(exec);
    const createCall = calls.find((c) => c.includes("create"));
    expect(createCall).toBeDefined();
    expect(createCall).toContain(CASCADE_VAULT);
  });

  it("throws ONEPASSWORD_FAILURE when vault list fails", () => {
    const exec = mockExec(() => new Error("signin required"));
    let err: unknown;
    try {
      ensureCascadeVault(exec);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(InstallError);
    expect((err as InstallError).code).toBe(ExitCode.ONEPASSWORD_FAILURE);
  });
});

describe("bootstrapCascadeRuntimeItem", () => {
  it("creates a new item when none exists and returns the op:// ref", () => {
    const calls: string[][] = [];
    const exec = mockExec((cmd, args) => {
      calls.push([cmd, ...args]);
      if (args.includes("get")) {
        return new Error("not found");
      }
      return "";
    });

    const ref = bootstrapCascadeRuntimeItem(
      { anthropic_api_key: "sk-ant-xyz" },
      exec
    );

    expect(ref).toBe(
      `op://${CASCADE_VAULT}/${CASCADE_RUNTIME_ITEM}/anthropic_api_key`
    );
    const createCall = calls.find((c) => c.includes("create"));
    expect(createCall).toBeDefined();
    expect(createCall).toContain("anthropic_api_key[password]=sk-ant-xyz");
    expect(createCall).toContain("--category=API Credential");
  });

  it("updates the existing item when it already exists", () => {
    const calls: string[][] = [];
    const exec = mockExec((cmd, args) => {
      calls.push([cmd, ...args]);
      if (args.includes("get")) {
        return JSON.stringify({ id: "item1" });
      }
      return "";
    });

    bootstrapCascadeRuntimeItem({ anthropic_api_key: "sk-ant-new" }, exec);

    const editCall = calls.find((c) => c.includes("edit"));
    expect(editCall).toBeDefined();
    expect(editCall).toContain("item1");
    expect(editCall).toContain("anthropic_api_key[password]=sk-ant-new");
  });

  it("throws ONEPASSWORD_FAILURE when write fails", () => {
    let callIdx = 0;
    const exec = mockExec((_cmd, args) => {
      callIdx++;
      if (args.includes("get") && callIdx === 1) {
        return new Error("not found");
      }
      return new Error("write refused");
    });

    let err: unknown;
    try {
      bootstrapCascadeRuntimeItem({ k: "v" }, exec);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(InstallError);
    expect((err as InstallError).code).toBe(ExitCode.ONEPASSWORD_FAILURE);
  });
});
