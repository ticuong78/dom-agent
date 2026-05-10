import { describe, expect, it } from "vitest";
import { SHA256HashAdapter } from "@adapters/hash";
import { UUIDAdapter } from "@adapters/id";

describe("SHA256HashAdapter", () => {
  it("returns a deterministic lowercase 64-character SHA-256 hex digest", () => {
    const adapter = new SHA256HashAdapter();

    expect(adapter.hash("Hello world")).toBe(
      "64ec88ca00b268e5ba1a35678a1b5316d212f4f366b2477232534a8aeca37f3c",
    );
    expect(adapter.hash("Hello world")).toBe(adapter.hash("Hello world"));
    expect(adapter.hash("Hello world")).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("UUIDAdapter", () => {
  it("returns RFC 4122 version 4 UUIDs", () => {
    const id = new UUIDAdapter().generate();

    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});
