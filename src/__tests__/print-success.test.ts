import { describe, it, expect, vi } from "vitest";
import { buildSuccessBanner, printSuccess } from "../steps/print-success.js";

const details = {
  url: "http://localhost:3000",
  installPath: "/home/justin/Code/cascade",
  vaultItem: "Cascade/Cascade Runtime",
};

describe("buildSuccessBanner", () => {
  it("includes the URL", () => {
    expect(buildSuccessBanner(details)).toMatch(/http:\/\/localhost:3000/);
  });

  it("includes the install path", () => {
    expect(buildSuccessBanner(details)).toMatch(/\/home\/justin\/Code\/cascade/);
  });

  it("names the 1P vault item so users know where secrets are", () => {
    expect(buildSuccessBanner(details)).toMatch(/Cascade\/Cascade Runtime/);
  });
});

describe("printSuccess", () => {
  it("calls the injected output with the banner text", () => {
    const out = vi.fn();
    printSuccess(details, out);
    expect(out).toHaveBeenCalledTimes(1);
    const firstCall = out.mock.calls[0];
    expect(firstCall?.[0]).toMatch(/Cascade is ready/);
  });
});
