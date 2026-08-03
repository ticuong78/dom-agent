import { describe, expect, it } from "vitest";
import { AttributePool } from "../pool";
import { ContextNode, type ContextNodeParams } from "../context";
import { defaultHash } from "../../utils";

// ── Helper ────────────────────────────────────────────────────────────

function makeNode(attrs: Record<string, string>): ContextNode {
  const params: ContextNodeParams = {
    id: "x",
    tagName: "div",
    attributes: attrs,
    directText: "",
    depth: 0,
    siblingCount: 0,
    nthChild: 0,
    height: 0,
    childCount: 0,
    children: [],
    hasher: defaultHash,
    parentTagName: null,
    parentAttributeCount: null,
    parentDepth: null,
    isExcluded: false,
  };
  return new ContextNode(params);
}

// ── Tests ─────────────────────────────────────────────────────────────

describe("AttributePool", () => {
  it("returns 0 confidence for unknown pair", () => {
    const pool = new AttributePool();
    expect(pool.confidence("id", "app")).toBe(0);
  });

  it("returns 1.0 for a unique attr=value pair", () => {
    const pool = new AttributePool();
    pool.register(makeNode({ id: "app" }));

    expect(pool.confidence("id", "app")).toBe(1);
  });

  it("returns 0.5 when two nodes share the same attr=value", () => {
    const pool = new AttributePool();
    pool.register(makeNode({ class: "item" }));
    pool.register(makeNode({ class: "item" }));

    expect(pool.confidence("class", "item")).toBe(0.5);
  });

  it("returns 1/n for n occurrences", () => {
    const pool = new AttributePool();
    pool.register(makeNode({ class: "row" }));
    pool.register(makeNode({ class: "row" }));
    pool.register(makeNode({ class: "row" }));

    expect(pool.confidence("class", "row")).toBeCloseTo(1 / 3);
  });

  it("tracks different attr=value pairs independently", () => {
    const pool = new AttributePool();
    pool.register(makeNode({ class: "a", id: "unique" }));
    pool.register(makeNode({ class: "a" }));

    expect(pool.confidence("class", "a")).toBe(0.5);
    expect(pool.confidence("id", "unique")).toBe(1);
  });

  it("distinguishes same key with different values", () => {
    const pool = new AttributePool();
    pool.register(makeNode({ class: "alpha" }));
    pool.register(makeNode({ class: "beta" }));

    expect(pool.confidence("class", "alpha")).toBe(1);
    expect(pool.confidence("class", "beta")).toBe(1);
  });
});
