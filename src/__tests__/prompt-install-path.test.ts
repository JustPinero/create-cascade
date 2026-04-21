import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "node:path";
import os from "node:os";

const CANCEL = Symbol.for("clack.cancel");

vi.mock("@clack/prompts", () => ({
  text: vi.fn(),
  isCancel: (v: unknown) => v === CANCEL,
}));

import { text } from "@clack/prompts";
import { promptInstallPath } from "../steps/prompt-install-path.js";
import { InstallError, ExitCode } from "../errors.js";

describe("promptInstallPath", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a resolved absolute path when the user confirms", async () => {
    vi.mocked(text).mockResolvedValue("~/Code/cascade-fork");
    const result = await promptInstallPath();
    expect(path.isAbsolute(result)).toBe(true);
  });

  it("defaults to ~/Code/cascade", async () => {
    vi.mocked(text).mockImplementation(async (opts) => {
      const defaultVal = (opts as { initialValue?: string }).initialValue;
      expect(defaultVal).toBe(path.join(os.homedir(), "Code", "cascade"));
      return defaultVal ?? "";
    });
    await promptInstallPath();
  });

  it("rejects empty input via validator", async () => {
    vi.mocked(text).mockImplementation(async (opts) => {
      const validate = (opts as { validate?: (v: string) => string | undefined })
        .validate;
      expect(validate!("")).toMatch(/required/i);
      return "/some/path";
    });
    await promptInstallPath();
  });

  it("throws USER_CANCELED on cancel", async () => {
    vi.mocked(text).mockResolvedValue(CANCEL as unknown as string);
    let err: unknown;
    try {
      await promptInstallPath();
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(InstallError);
    expect((err as InstallError).code).toBe(ExitCode.USER_CANCELED);
  });
});
