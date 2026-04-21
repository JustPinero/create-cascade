import { describe, it, expect, vi } from "vitest";
import type { execFileSync } from "node:child_process";
import {
  checkPrereqs,
  probePrereq,
  PREREQS,
} from "../steps/check-prereqs.js";

function mockExec(responses: Record<string, string | Error>): typeof execFileSync {
  return ((cmd: string) => {
    const r = responses[cmd];
    if (r instanceof Error) throw r;
    if (r === undefined) throw new Error(`command not found: ${cmd}`);
    return Buffer.from(r);
  }) as typeof execFileSync;
}

describe("probePrereq", () => {
  it("reports installed + version when command succeeds", () => {
    const node = PREREQS.find((p) => p.name === "node")!;
    const exec = mockExec({ node: "v22.10.0" });
    const status = probePrereq(node, "macos", exec);
    expect(status.installed).toBe(true);
    expect(status.version).toBe("v22.10.0");
  });

  it("reports not installed when command throws", () => {
    const op = PREREQS.find((p) => p.name === "op")!;
    const exec = mockExec({});
    const status = probePrereq(op, "wsl", exec);
    expect(status.installed).toBe(false);
    expect(status.version).toBeNull();
  });

  it("attaches an OS-specific install hint", () => {
    const tmux = PREREQS.find((p) => p.name === "tmux")!;
    const exec = mockExec({});
    const mac = probePrereq(tmux, "macos", exec).installHint;
    const wsl = probePrereq(tmux, "wsl", exec).installHint;
    expect(mac).toMatch(/brew install tmux/);
    expect(wsl).toMatch(/apt-get install -y tmux/);
  });
});

describe("checkPrereqs", () => {
  it("returns a status for every registered prereq", () => {
    const exec = mockExec({});
    const results = checkPrereqs("macos", exec);
    expect(results).toHaveLength(PREREQS.length);
    const names = results.map((r) => r.name);
    expect(names).toEqual(["node", "pnpm", "claude", "tmux", "op"]);
  });

  it("marks each independently", () => {
    const exec = mockExec({
      node: "v22.10.0",
      pnpm: "10.33.0",
      op: "2.33.1",
    });
    const results = checkPrereqs("wsl", exec);
    const byName = Object.fromEntries(results.map((r) => [r.name, r.installed]));
    expect(byName).toEqual({
      node: true,
      pnpm: true,
      claude: false,
      tmux: false,
      op: true,
    });
  });
});
