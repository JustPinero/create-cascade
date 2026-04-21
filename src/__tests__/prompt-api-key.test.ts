import { describe, it, expect, vi, beforeEach } from "vitest";

const CANCEL = Symbol.for("clack.cancel");

vi.mock("@clack/prompts", () => ({
  password: vi.fn(),
  isCancel: (v: unknown) => v === CANCEL,
}));

import { password } from "@clack/prompts";
import { promptApiKey } from "../steps/prompt-api-key.js";
import { InstallError, ExitCode } from "../errors.js";

describe("promptApiKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the value when the user provides a valid key", async () => {
    vi.mocked(password).mockResolvedValue(
      "sk-ant-api03-abcdefghijklmnopqrstuvwxyz123456"
    );
    const value = await promptApiKey();
    expect(value).toBe("sk-ant-api03-abcdefghijklmnopqrstuvwxyz123456");
  });

  it("throws USER_CANCELED when the user cancels", async () => {
    vi.mocked(password).mockResolvedValue(CANCEL as unknown as string);
    let err: unknown;
    try {
      await promptApiKey();
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(InstallError);
    expect((err as InstallError).code).toBe(ExitCode.USER_CANCELED);
  });

  it("passes a validator that rejects keys without sk-ant- prefix", async () => {
    vi.mocked(password).mockImplementation(async (opts) => {
      const validate = (opts as { validate?: (v: string) => string | undefined })
        .validate;
      expect(validate).toBeDefined();
      expect(validate!("wrong-prefix-key-here-long-enough")).toMatch(
        /sk-ant-/
      );
      return "sk-ant-validkey-abcdefghijklmnop1234567890";
    });
    await promptApiKey();
  });

  it("passes a validator that rejects empty input", async () => {
    vi.mocked(password).mockImplementation(async (opts) => {
      const validate = (opts as { validate?: (v: string) => string | undefined })
        .validate;
      expect(validate!("")).toMatch(/Required/);
      return "sk-ant-validkey-abcdefghijklmnop1234567890";
    });
    await promptApiKey();
  });

  it("passes a validator that rejects keys that are too short", async () => {
    vi.mocked(password).mockImplementation(async (opts) => {
      const validate = (opts as { validate?: (v: string) => string | undefined })
        .validate;
      expect(validate!("sk-ant-short")).toMatch(/short/);
      return "sk-ant-validkey-abcdefghijklmnop1234567890";
    });
    await promptApiKey();
  });
});
