import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  buildWslConfigContent,
  defaultWslConfig,
  writeWslConfig,
} from "../steps/write-wsl-config.js";

describe("buildWslConfigContent", () => {
  it("includes memory, swap, autoMemoryReclaim, sparseVhd", () => {
    const content = buildWslConfigContent({ memoryGb: 16, swapGb: 8 });
    expect(content).toMatch(/\[wsl2\]/);
    expect(content).toMatch(/memory=16GB/);
    expect(content).toMatch(/swap=8GB/);
    expect(content).toMatch(/autoMemoryReclaim=gradual/);
    expect(content).toMatch(/sparseVhd=true/);
  });

  it("includes processors when provided", () => {
    const content = buildWslConfigContent({
      memoryGb: 20,
      swapGb: 16,
      processors: 8,
    });
    expect(content).toMatch(/processors=8/);
  });

  it("omits processors when not provided", () => {
    const content = buildWslConfigContent({ memoryGb: 16, swapGb: 8 });
    expect(content).not.toMatch(/processors/);
  });
});

describe("defaultWslConfig", () => {
  const GB = 1024 ** 3;

  it("reserves 8GB for Windows on 16GB hosts (WSL gets 8GB)", () => {
    const cfg = defaultWslConfig(16 * GB);
    expect(cfg.memoryGb).toBe(8);
  });

  it("floors WSL memory at 4GB on very small hosts", () => {
    const cfg = defaultWslConfig(12 * GB);
    expect(cfg.memoryGb).toBeGreaterThanOrEqual(4);
  });

  it("gives WSL ~20GB on 32GB hosts", () => {
    const cfg = defaultWslConfig(32 * GB);
    expect(cfg.memoryGb).toBeGreaterThanOrEqual(18);
    expect(cfg.memoryGb).toBeLessThanOrEqual(24);
  });

  it("caps Windows reservation at 16GB on huge hosts", () => {
    const cfg = defaultWslConfig(64 * GB);
    expect(cfg.memoryGb).toBeGreaterThanOrEqual(48);
  });

  it("scales swap to ~half of memory, floor 8GB", () => {
    const cfg = defaultWslConfig(32 * GB);
    expect(cfg.swapGb).toBeGreaterThanOrEqual(8);
    expect(cfg.swapGb).toBeLessThanOrEqual(cfg.memoryGb);
  });
});

describe("writeWslConfig", () => {
  const tmpDir = path.join(os.tmpdir(), `create-cascade-test-${Date.now()}`);
  const tmpPath = path.join(tmpDir, ".wslconfig");

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // fine
    }
  });

  it("writes the config to the given path", () => {
    fs.mkdirSync(tmpDir, { recursive: true });
    const written = writeWslConfig({ memoryGb: 20, swapGb: 16 }, tmpPath);
    expect(written).toBe(tmpPath);
    const actual = fs.readFileSync(tmpPath, "utf-8");
    expect(actual).toMatch(/memory=20GB/);
    expect(actual).toMatch(/autoMemoryReclaim=gradual/);
  });
});
