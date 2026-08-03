import { describe, expect, it } from "vitest";
import { ContextConverter } from "../convert";
import type { HTMLNode } from "@types";

// ── Helper ────────────────────────────────────────────────────────────

/** Minimal leaf HTMLNode factory. */
function leaf(tagName: string, overrides: Partial<HTMLNode> = {}): HTMLNode {
  return {
    type: "tag",
    tagName,
    attributes: {},
    children: [],
    directText: "",
    siblingCount: 0,
    nthChild: 0,
    isExcluded: false,
    passingId: undefined,
    ...overrides,
  };
}

/** Build a parent node with given children (auto-sets siblingCount / nthChild). */
function parent(
  tagName: string,
  children: HTMLNode[],
  overrides: Partial<HTMLNode> = {},
): HTMLNode {
  children.forEach((c, i) => {
    c.siblingCount = children.length - 1;
    c.nthChild = i;
  });
  return {
    type: "tag",
    tagName,
    attributes: {},
    children,
    directText: "",
    siblingCount: 0,
    nthChild: 0,
    isExcluded: false,
    passingId: undefined,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────

describe("ContextConverter", () => {
  const converter = new ContextConverter();

  // ── ID assignment ────────────────────────────────────────────

  describe("counter-based IDs", () => {
    it("assigns sequential IDs in pre-order DFS", () => {
      const tree = converter.convert(parent("div", [leaf("a"), leaf("b")]));
      const ids = tree.nodes().map((n) => n.id);
      expect(ids).toEqual(["0", "1", "2"]);
    });

    it("resets counter between convert() calls", () => {
      converter.convert(parent("div", [leaf("a"), leaf("b")]));
      const tree2 = converter.convert(leaf("span"));
      expect(tree2.getRoot().id).toBe("0");
    });
  });

  describe("passingId", () => {
    it("uses passingId instead of counter when defined", () => {
      const tree = converter.convert(
        parent("div", [leaf("a", { passingId: "alpha" }), leaf("b")]),
      );
      const ids = tree.nodes().map((n) => n.id);
      // root=0, a=alpha (counter stays at 1), b=1
      expect(ids).toEqual(["0", "alpha", "1"]);
    });

    it("skips counter values that collide with passingIds", () => {
      // passingId "1" is reserved → counter must skip from 1 to 2
      const tree = converter.convert(
        parent("div", [leaf("a", { passingId: "1" }), leaf("b"), leaf("c")]),
      );
      const ids = tree.nodes().map((n) => n.id);
      // root=0, a="1" (reserved), b: counter=1 → collides → skip to 2, c=3
      expect(ids).toEqual(["0", "1", "2", "3"]);
    });

    it("handles multiple numeric passingIds", () => {
      const tree = converter.convert(
        parent("div", [
          leaf("a", { passingId: "0" }),
          leaf("b", { passingId: "2" }),
          leaf("c"),
          leaf("d"),
        ]),
      );
      const ids = tree.nodes().map((n) => n.id);
      // root: counter starts 0 → collides with "0" → skip to 1
      // a="0", b="2", c: counter=2 → collides → 3, d=4
      expect(ids).toEqual(["1", "0", "2", "3", "4"]);
    });
  });

  // ── Depth ────────────────────────────────────────────────────

  it("computes depth correctly", () => {
    const tree = converter.convert(
      parent("div", [parent("section", [leaf("p")])]),
    );
    const depths = tree.nodes().map((n) => [n.tagName, n.depth]);
    expect(depths).toEqual([
      ["div", 0],
      ["section", 1],
      ["p", 2],
    ]);
  });

  // ── Height ───────────────────────────────────────────────────

  it("computes height correctly (leaf=0, parent=max child height + 1)", () => {
    //   div (height 2)
    //   ├─ a (height 1)
    //   │  └─ b (height 0)
    //   └─ c (height 0)
    const tree = converter.convert(
      parent("div", [parent("a", [leaf("b")]), leaf("c")]),
    );
    const heights = tree.nodes().map((n) => [n.tagName, n.height]);
    expect(heights).toEqual([
      ["div", 2],
      ["a", 1],
      ["b", 0],
      ["c", 0],
    ]);
  });

  // ── childCount ───────────────────────────────────────────────

  it("computes childCount from tag children", () => {
    const tree = converter.convert(
      parent("div", [leaf("a"), leaf("b"), leaf("c")]),
    );
    expect(tree.getRoot().childCount).toBe(3);
    // leaves have 0 children
    for (const child of tree.getRoot().children) {
      expect(child.childCount).toBe(0);
    }
  });

  // ── Parent surface ──────────────────────────────────────────

  it("propagates parent surface to children", () => {
    const tree = converter.convert(
      parent("div", [leaf("span")], {
        attributes: { class: "box", id: "main" },
      }),
    );
    const child = tree.getRoot().children[0]!;
    expect(child.parentTagName).toBe("div");
    expect(child.parentAttributeCount).toBe(2);
    expect(child.parentDepth).toBe(0);
  });

  it("sets null parent surface for root", () => {
    const tree = converter.convert(leaf("div"));
    const root = tree.getRoot();
    expect(root.parentTagName).toBeNull();
    expect(root.parentAttributeCount).toBeNull();
    expect(root.parentDepth).toBeNull();
  });

  // ── isExcluded ──────────────────────────────────────────────

  it("passes isExcluded through to ContextNode", () => {
    const tree = converter.convert(
      parent("div", [
        leaf("a", { isExcluded: true }),
        leaf("b", { isExcluded: false }),
      ]),
    );
    expect(tree.nodes()[1]!.isExcluded).toBe(true);
    expect(tree.nodes()[2]!.isExcluded).toBe(false);
  });

  // ── Error ───────────────────────────────────────────────────

  it("throws on non-tag node", () => {
    const textNode: HTMLNode = {
      type: "text",
      tagName: "",
      attributes: {},
      children: [],
      directText: "hello",
      siblingCount: 0,
      nthChild: 0,
      isExcluded: false,
      passingId: undefined,
    };
    expect(() => converter.convert(textNode)).toThrow();
  });
});
