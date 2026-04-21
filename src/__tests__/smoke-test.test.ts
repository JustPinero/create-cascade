import { describe, it, expect, vi } from "vitest";
import { waitForHealth } from "../steps/smoke-test.js";

function mockFetch(
  responder: () => Response | Promise<Response> | Error
): typeof fetch {
  return (async () => {
    const r = await responder();
    if (r instanceof Error) throw r;
    return r;
  }) as typeof fetch;
}

describe("waitForHealth", () => {
  it("returns true as soon as the endpoint responds 2xx", async () => {
    const fetchImpl = mockFetch(() => new Response("ok", { status: 200 }));
    const ok = await waitForHealth("http://localhost:3000/api/health", 5000, 10, fetchImpl);
    expect(ok).toBe(true);
  });

  it("keeps polling while the endpoint throws, then succeeds", async () => {
    let attempts = 0;
    const fetchImpl = mockFetch(() => {
      attempts++;
      if (attempts < 3) return new Error("ECONNREFUSED");
      return new Response("ok", { status: 200 });
    });
    const ok = await waitForHealth("http://localhost:3000/api/health", 5000, 10, fetchImpl);
    expect(ok).toBe(true);
    expect(attempts).toBeGreaterThanOrEqual(3);
  });

  it("returns false after the deadline expires", async () => {
    const fetchImpl = mockFetch(() => new Error("connection refused"));
    const ok = await waitForHealth("http://localhost:3000/api/health", 100, 10, fetchImpl);
    expect(ok).toBe(false);
  });

  it("treats non-2xx responses as not-yet-ready", async () => {
    let attempts = 0;
    const fetchImpl = mockFetch(() => {
      attempts++;
      if (attempts < 2) return new Response("starting", { status: 503 });
      return new Response("ok", { status: 200 });
    });
    const ok = await waitForHealth("http://localhost:3000/api/health", 5000, 10, fetchImpl);
    expect(ok).toBe(true);
    expect(attempts).toBeGreaterThanOrEqual(2);
  });
});
