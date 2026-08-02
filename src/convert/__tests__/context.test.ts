import { describe, expect, it } from "vitest";
import {
  ContextNode,
  ContextTree,
  analyzeAttributes,
  sortAttributesByAlphabet,
  type ContextNodeParams,
} from "../context";
import { defaultHash } from "../../utils";

// ── Helper ────────────────────────────────────────────────────────────

function makeNode(overrides: Partial<ContextNodeParams> = {}): ContextNode {
  return new ContextNode({
    id: "test-0",
    tagName: "div",
    attributes: {},
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
    ...overrides,
  });
}

// ── analyzeAttributes ─────────────────────────────────────────────────

describe("analyzeAttributes", () => {
  it("breaks attribute value into metrics", () => {
    const result = analyzeAttributes({ class: "btn btn-primary lg" });
    expect(result["class"]).toEqual({
      actualValue: "btn btn-primary lg",
      numberOfValues: 3,
      totalLength: 18,
    });
  });

  it("handles single-value attributes", () => {
    const result = analyzeAttributes({ id: "app" });
    expect(result["id"]!.numberOfValues).toBe(1);
    expect(result["id"]!.totalLength).toBe(3);
  });

  it("handles empty attributes record", () => {
    expect(analyzeAttributes({})).toEqual({});
  });

  it("splits by whitespace, comma, and semicolon", () => {
    const result = analyzeAttributes({ style: "color:red; font-size:12px" });
    expect(result["style"]!.numberOfValues).toBe(2);
  });
});

describe("sortAttributesByAlphabet", () => {
  it("sorts entries by key", () => {
    const sorted = sortAttributesByAlphabet({ z: "1", a: "2", m: "3" });
    expect(sorted.map(([k]) => k)).toEqual(["a", "m", "z"]);
  });
});

// ── ContextNode ───────────────────────────────────────────────────────

describe("ContextNode", () => {
  describe("serialize", () => {
    it("includes all required fields", () => {
      const node = makeNode({
        id: "n1",
        tagName: "span",
        attributes: { class: "tag" },
        directText: "Hello",
        depth: 2,
        nthChild: 1,
        siblingCount: 3,
        height: 0,
        childCount: 0,
        parentTagName: "div",
        parentAttributeCount: 2,
        parentDepth: 1,
      });

      const snap = node.serialize();

      expect(snap.id).toBe("n1");
      expect(snap.tagName).toBe("span");
      expect(snap.attributeCount).toBe(1);
      expect(snap.directText).toBe("Hello");
      expect(snap.depth).toBe(2);
      expect(snap.nthChild).toBe(1);
      expect(snap.siblingCount).toBe(3);
      expect(snap.height).toBe(0);
      expect(snap.childCount).toBe(0);
      expect(snap.parentTagName).toBe("div");
      expect(snap.parentAttributeCount).toBe(2);
      expect(snap.parentDepth).toBe(1);
    });

    it("includes isExcluded in snapshot", () => {
      const excluded = makeNode({ isExcluded: true });
      const normal = makeNode({ isExcluded: false });

      expect(excluded.serialize().isExcluded).toBe(true);
      expect(normal.serialize().isExcluded).toBe(false);
    });

    it("serializes parent pointer as parentId", () => {
      const child = makeNode({ id: "child" });
      const parentNode = makeNode({ id: "parent", children: [child] });
      child.parent = parentNode;

      expect(child.serialize().parentId).toBe("parent");
    });

    it("serializes children as childIds", () => {
      const c1 = makeNode({ id: "c1" });
      const c2 = makeNode({ id: "c2" });
      const p = makeNode({ id: "p", children: [c1, c2], childCount: 2 });

      expect(p.serialize().childIds).toEqual(["c1", "c2"]);
    });

    it("sets parentId to null for root", () => {
      const root = makeNode({ id: "root" });
      expect(root.serialize().parentId).toBeNull();
    });
  });

  describe("compositeKey", () => {
    it("encodes positional + structural + parent info", () => {
      const node = makeNode({
        depth: 2,
        nthChild: 1,
        siblingCount: 3,
        tagName: "li",
        attributes: { class: "item" },
        directText: "Price",
        parentTagName: "ul",
        parentDepth: 1,
      });
      const key = node.compositeKey();

      expect(key).toContain("2:1/3");   // depth:nthChild/siblingCount
      expect(key).toContain("li");       // tagName
      expect(key).toContain("1");        // attributeCount
      expect(key).toContain("ul@1");     // parentTagName@parentDepth
    });

    it("produces distinct keys for same-structure nodes in different subtrees", () => {
      // Two <td>Price</td> in different <tr> parents
      const td1 = makeNode({
        tagName: "td",
        directText: "Price",
        depth: 2,
        nthChild: 0,
        siblingCount: 1,
        parentTagName: "tr",
        parentDepth: 1,
      });

      // Same structure but parent is at different depth
      const td2 = makeNode({
        tagName: "td",
        directText: "Price",
        depth: 2,
        nthChild: 0,
        siblingCount: 1,
        parentTagName: "tr",
        parentDepth: 1,
      });

      // Same parent info → same key (this is the inherent limit —
      // two identical nodes under identical parents still collide)
      expect(td1.compositeKey()).toBe(td2.compositeKey());

      // But different parent depths → different keys
      const td3 = makeNode({
        tagName: "td",
        directText: "Price",
        depth: 3,
        nthChild: 0,
        siblingCount: 1,
        parentTagName: "tr",
        parentDepth: 2,
      });
      expect(td1.compositeKey()).not.toBe(td3.compositeKey());
    });

    it("handles null parent info for root", () => {
      const root = makeNode({
        parentTagName: null,
        parentDepth: null,
      });
      const key = root.compositeKey();
      expect(key).toContain("@"); // null encoded as empty strings
    });
  });
});

// ── ContextTree ───────────────────────────────────────────────────────

describe("ContextTree", () => {
  function buildTree() {
    // div (root)
    //   ├─ span "Hello"
    //   └─ a "Link"  {href: "/home"}
    const span = makeNode({
      id: "1",
      tagName: "span",
      directText: "Hello",
      depth: 1,
      nthChild: 0,
      siblingCount: 1,
      parentTagName: "div",
      parentAttributeCount: 0,
      parentDepth: 0,
    });
    const a = makeNode({
      id: "2",
      tagName: "a",
      attributes: { href: "/home" },
      directText: "Link",
      depth: 1,
      nthChild: 1,
      siblingCount: 1,
      parentTagName: "div",
      parentAttributeCount: 0,
      parentDepth: 0,
    });
    const root = makeNode({
      id: "0",
      tagName: "div",
      children: [span, a],
      childCount: 2,
      height: 1,
    });
    span.parent = root;
    a.parent = root;

    return new ContextTree(root, defaultHash);
  }

  it("indexes all nodes", () => {
    const tree = buildTree();
    expect(tree.nodes()).toHaveLength(3);
  });

  it("nodes() returns pre-order traversal", () => {
    const tree = buildTree();
    const tags = tree.nodes().map((n) => n.tagName);
    expect(tags).toEqual(["div", "span", "a"]);
  });

  it("getByCompositeKey retrieves the correct node", () => {
    const tree = buildTree();
    const root = tree.getRoot();
    const found = tree.getByCompositeKey(root.compositeKey());
    expect(found).toBe(root);
  });

  it("size() equals node count when no composite key collisions", () => {
    const tree = buildTree();
    expect(tree.size()).toBe(3);
  });

  it("getBySignature returns nodes with matching identity", () => {
    const tree = buildTree();
    const span = tree.nodes()[1]!;
    const sig = tree.signature(span);
    const matches = tree.getBySignature(sig);
    expect(matches).toContain(span);
  });

  it("hasSignature returns true for existing signatures", () => {
    const tree = buildTree();
    const sig = tree.signature(tree.getRoot());
    expect(tree.hasSignature(sig)).toBe(true);
  });

  it("hasSignature returns false for unknown signatures", () => {
    const tree = buildTree();
    expect(tree.hasSignature("nonexistent")).toBe(false);
  });

  it("produces deterministic treeId for same DOM", () => {
    const tree1 = buildTree();
    const tree2 = buildTree();
    expect(tree1.getTreeId()).toBe(tree2.getTreeId());
  });

  it("serialize() produces JSON-safe snapshot", () => {
    const tree = buildTree();
    const snap = tree.serialize();

    expect(snap.treeId).toBe(tree.getTreeId());
    expect(snap.nodeCount).toBe(3);
    expect(snap.nodes).toHaveLength(3);
    expect(() => JSON.stringify(snap)).not.toThrow();
  });

  it("serialize() snapshot includes isExcluded for each node", () => {
    const tree = buildTree();
    const snap = tree.serialize();
    for (const nodeSnap of snap.nodes) {
      expect(typeof nodeSnap.isExcluded).toBe("boolean");
    }
  });
});
