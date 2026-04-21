import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { buildEnvContent, writeEnv } from "../steps/write-env.js";

describe("buildEnvContent", () => {
  it("uses the op:// reference for ANTHROPIC_API_KEY", () => {
    const content = buildEnvContent({
      anthropicKeyRef: "op://Cascade/Cascade Runtime/anthropic_api_key",
      projectsDir: "~/projects",
    });
    expect(content).toMatch(
      /^ANTHROPIC_API_KEY=op:\/\/Cascade\/Cascade Runtime\/anthropic_api_key$/m
    );
  });

  it("writes PROJECTS_DIR as a literal", () => {
    const content = buildEnvContent({
      anthropicKeyRef: "op://x/y/z",
      projectsDir: "/home/justin/code",
    });
    expect(content).toMatch(/^PROJECTS_DIR=\/home\/justin\/code$/m);
  });

  it("defaults knowledge dir to ./knowledge", () => {
    const content = buildEnvContent({
      anthropicKeyRef: "op://x/y/z",
      projectsDir: "~/projects",
    });
    expect(content).toMatch(/^CASCADE_KNOWLEDGE_DIR=\.\/knowledge$/m);
  });

  it("defaults DATABASE_URL to quoted file:./dev.db", () => {
    const content = buildEnvContent({
      anthropicKeyRef: "op://x/y/z",
      projectsDir: "~/projects",
    });
    expect(content).toMatch(/^DATABASE_URL="file:\.\/dev\.db"$/m);
  });
});

describe("writeEnv", () => {
  const tmpDir = path.join(os.tmpdir(), `create-cascade-env-${Date.now()}`);

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // fine
    }
  });

  it("writes .env inside the cascade dir", () => {
    fs.mkdirSync(tmpDir, { recursive: true });
    const written = writeEnv(tmpDir, {
      anthropicKeyRef: "op://Cascade/Cascade Runtime/anthropic_api_key",
      projectsDir: "~/projects",
    });
    expect(written).toBe(path.join(tmpDir, ".env"));
    const actual = fs.readFileSync(written, "utf-8");
    expect(actual).toMatch(/ANTHROPIC_API_KEY=op:\/\//);
    expect(actual).toMatch(/PROJECTS_DIR=~\/projects/);
  });
});
