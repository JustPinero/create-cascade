import { describe, it, expect, vi, beforeEach } from "vitest";

const CANCEL = Symbol.for("clack.cancel");

vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  note: vi.fn(),
  confirm: vi.fn(async () => false),
  isCancel: (v: unknown) => v === CANCEL,
  log: {
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    step: vi.fn(),
  },
}));

vi.mock("../steps/detect-os.js", () => ({
  detectOS: vi.fn(() => ({ os: "macos", raw: "darwin" })),
}));

vi.mock("../steps/check-prereqs.js", () => ({
  checkPrereqs: vi.fn(() => [
    { name: "node", installed: true, version: "v22", installHint: "" },
    { name: "pnpm", installed: true, version: "10", installHint: "" },
    { name: "claude", installed: true, version: "1", installHint: "" },
    { name: "tmux", installed: true, version: "3", installHint: "" },
    { name: "op", installed: true, version: "2", installHint: "" },
  ]),
}));

vi.mock("../steps/write-wsl-config.js", () => ({
  defaultWslConfig: vi.fn(() => ({ memoryGb: 16, swapGb: 8 })),
  writeWslConfig: vi.fn(() => "/fake/.wslconfig"),
  wslConfigPath: vi.fn(() => "/fake/.wslconfig"),
}));

vi.mock("../steps/prompt-install-path.js", () => ({
  promptInstallPath: vi.fn(async () => "/install/cascade"),
}));

vi.mock("../steps/clone-repo.js", () => ({
  cloneRepo: vi.fn(),
}));

vi.mock("../steps/install-deps.js", () => ({
  installDeps: vi.fn(),
}));

vi.mock("../steps/ensure-op-signin.js", () => ({
  ensureOpSignin: vi.fn(),
}));

vi.mock("../steps/prompt-api-key.js", () => ({
  promptApiKey: vi.fn(async () => "sk-ant-abc1234567890abcdefghijklmnop"),
}));

vi.mock("../steps/bootstrap-vault.js", () => ({
  ensureCascadeVault: vi.fn(),
  bootstrapCascadeRuntimeItem: vi.fn(
    () => "op://Cascade/Cascade Runtime/anthropic_api_key"
  ),
}));

vi.mock("../steps/write-env.js", () => ({
  writeEnv: vi.fn(() => "/install/cascade/.env"),
}));

vi.mock("../steps/install-hooks.js", () => ({
  installClaudeHooks: vi.fn(),
}));

vi.mock("../steps/init-db.js", () => ({
  initDb: vi.fn(),
}));

vi.mock("../steps/smoke-test.js", () => ({
  smokeTest: vi.fn(async () => undefined),
}));

vi.mock("../steps/print-success.js", () => ({
  printSuccess: vi.fn(),
}));

import { run } from "../index.js";
import { detectOS } from "../steps/detect-os.js";
import { checkPrereqs } from "../steps/check-prereqs.js";
import { promptInstallPath } from "../steps/prompt-install-path.js";
import { cloneRepo } from "../steps/clone-repo.js";
import { installDeps } from "../steps/install-deps.js";
import { ensureOpSignin } from "../steps/ensure-op-signin.js";
import { promptApiKey } from "../steps/prompt-api-key.js";
import {
  ensureCascadeVault,
  bootstrapCascadeRuntimeItem,
} from "../steps/bootstrap-vault.js";
import { writeEnv } from "../steps/write-env.js";
import { installClaudeHooks } from "../steps/install-hooks.js";
import { initDb } from "../steps/init-db.js";
import { smokeTest } from "../steps/smoke-test.js";
import { printSuccess } from "../steps/print-success.js";
import { ExitCode, InstallError } from "../errors.js";

describe("orchestrator (happy path)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(detectOS).mockReturnValue({ os: "macos", raw: "darwin" });
    vi.mocked(checkPrereqs).mockReturnValue([
      { name: "node", installed: true, version: "v22", installHint: "" },
      { name: "pnpm", installed: true, version: "10", installHint: "" },
      { name: "claude", installed: true, version: "1", installHint: "" },
      { name: "tmux", installed: true, version: "3", installHint: "" },
      { name: "op", installed: true, version: "2", installHint: "" },
    ]);
    vi.mocked(bootstrapCascadeRuntimeItem).mockReturnValue(
      "op://Cascade/Cascade Runtime/anthropic_api_key"
    );
    vi.mocked(promptInstallPath).mockResolvedValue("/install/cascade");
    vi.mocked(promptApiKey).mockResolvedValue(
      "sk-ant-abc1234567890abcdefghijklmnop"
    );
  });

  it("exits 0 on success and runs every step in order", async () => {
    const code = await run(["--skip-smoke"]);
    expect(code).toBe(ExitCode.OK);

    expect(detectOS).toHaveBeenCalled();
    expect(checkPrereqs).toHaveBeenCalled();
    expect(promptInstallPath).toHaveBeenCalled();
    expect(cloneRepo).toHaveBeenCalledWith(
      expect.objectContaining({ targetPath: "/install/cascade" })
    );
    expect(installDeps).toHaveBeenCalledWith("/install/cascade");
    expect(ensureOpSignin).toHaveBeenCalled();
    expect(ensureCascadeVault).toHaveBeenCalled();
    expect(promptApiKey).toHaveBeenCalled();
    expect(bootstrapCascadeRuntimeItem).toHaveBeenCalledWith({
      anthropic_api_key: "sk-ant-abc1234567890abcdefghijklmnop",
    });
    expect(writeEnv).toHaveBeenCalledWith(
      "/install/cascade",
      expect.objectContaining({
        anthropicKeyRef: "op://Cascade/Cascade Runtime/anthropic_api_key",
      })
    );
    expect(installClaudeHooks).toHaveBeenCalledWith("/install/cascade");
    expect(initDb).toHaveBeenCalledWith("/install/cascade");
    expect(printSuccess).toHaveBeenCalled();
  });

  it("skips the smoke test when --skip-smoke is passed", async () => {
    await run(["--skip-smoke"]);
    expect(smokeTest).not.toHaveBeenCalled();
  });

  it("runs the smoke test by default", async () => {
    await run([]);
    expect(smokeTest).toHaveBeenCalledWith(
      expect.objectContaining({ cascadeDir: "/install/cascade" })
    );
  });
});

describe("orchestrator (failure paths)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exits with PREREQS_MISSING when detectOS rejects the platform", async () => {
    vi.mocked(detectOS).mockImplementation(() => {
      throw new InstallError(
        "Unsupported",
        ExitCode.PREREQS_MISSING,
        "Install WSL2"
      );
    });
    const code = await run([]);
    expect(code).toBe(ExitCode.PREREQS_MISSING);
  });

  it("exits with PREREQS_MISSING when any prereq is missing", async () => {
    vi.mocked(detectOS).mockReturnValue({ os: "macos", raw: "darwin" });
    vi.mocked(checkPrereqs).mockReturnValue([
      { name: "node", installed: true, version: "v22", installHint: "" },
      { name: "pnpm", installed: false, version: null, installHint: "install pnpm" },
      { name: "claude", installed: true, version: "1", installHint: "" },
      { name: "tmux", installed: true, version: "3", installHint: "" },
      { name: "op", installed: true, version: "2", installHint: "" },
    ]);
    const code = await run([]);
    expect(code).toBe(ExitCode.PREREQS_MISSING);
  });

  it("exits with ONEPASSWORD_FAILURE when op signin check fails", async () => {
    vi.mocked(detectOS).mockReturnValue({ os: "macos", raw: "darwin" });
    vi.mocked(checkPrereqs).mockReturnValue([
      { name: "node", installed: true, version: "v22", installHint: "" },
      { name: "pnpm", installed: true, version: "10", installHint: "" },
      { name: "claude", installed: true, version: "1", installHint: "" },
      { name: "tmux", installed: true, version: "3", installHint: "" },
      { name: "op", installed: true, version: "2", installHint: "" },
    ]);
    vi.mocked(promptInstallPath).mockResolvedValue("/install/cascade");
    vi.mocked(ensureOpSignin).mockImplementation(() => {
      throw new InstallError(
        "1Password not signed in",
        ExitCode.ONEPASSWORD_FAILURE,
        "Run op signin"
      );
    });

    const code = await run([]);
    expect(code).toBe(ExitCode.ONEPASSWORD_FAILURE);
  });

  it("exits with UNKNOWN on unexpected errors", async () => {
    vi.mocked(detectOS).mockImplementation(() => {
      throw new Error("surprise");
    });
    const code = await run([]);
    expect(code).toBe(ExitCode.UNKNOWN);
  });
});
