import { describe, it, expect, vi, afterEach } from "vitest";
import os from "node:os";
import { detectOS } from "../steps/detect-os.js";
import { InstallError, ExitCode } from "../errors.js";

describe("detectOS", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns macos for darwin", () => {
    vi.spyOn(os, "platform").mockReturnValue("darwin");
    const result = detectOS();
    expect(result.os).toBe("macos");
  });

  it("returns wsl for linux with microsoft kernel release", () => {
    vi.spyOn(os, "platform").mockReturnValue("linux");
    vi.spyOn(os, "release").mockReturnValue("5.15.0-microsoft-standard-WSL2");
    expect(detectOS().os).toBe("wsl");
  });

  it("returns linux for plain linux kernel", () => {
    vi.spyOn(os, "platform").mockReturnValue("linux");
    vi.spyOn(os, "release").mockReturnValue("6.2.0-generic");
    expect(detectOS().os).toBe("linux");
  });

  it("throws InstallError on pure Windows with WSL2 guidance", () => {
    vi.spyOn(os, "platform").mockReturnValue("win32");
    let err: unknown;
    try {
      detectOS();
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(InstallError);
    expect((err as InstallError).code).toBe(ExitCode.PREREQS_MISSING);
    expect((err as InstallError).remediation).toMatch(/WSL2/);
  });

  it("throws InstallError on other unsupported platforms", () => {
    vi.spyOn(os, "platform").mockReturnValue(
      "freebsd" as ReturnType<typeof os.platform>
    );
    expect(() => detectOS()).toThrow(InstallError);
  });
});
