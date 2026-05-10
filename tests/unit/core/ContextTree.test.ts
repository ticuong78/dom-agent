import { describe, expect, it } from "vitest";
import {
  ContextTree,
  defaultSignatureCreator,
  withClassSignatureCreator,
} from "@core/context";
import { createNode, fakeHasher, linkParent } from "../helpers";

describe("ContextTree signatures", () => {
  it("default signature excludes class while class-aware signature includes it", () => {
    const node = createNode({
      tagName: "a",
      attributes: {
        class: "button primary",
        href: "/docs",
        id: "learn",
      },
      directText: "Learn",
    });

    expect(defaultSignatureCreator(node)).toBe("a|href=/docs&id=learn|hash:Learn");
    expect(withClassSignatureCreator(node)).toBe(
      "a|class=button primary&href=/docs&id=learn|hash:Learn",
    );
  });
});

describe("ContextTree", () => {
  it("indexes nodes in preorder by composite key and identity signature", () => {
    const childA = createNode({
      id: "child-a",
      tagName: "li",
      attributes: { "data-role": "item" },
      directText: "same",
      depth: 1,
      nthChild: 0,
      siblingCount: 2,
    });
    const childB = createNode({
      id: "child-b",
      tagName: "li",
      attributes: { "data-role": "item" },
      directText: "same",
      depth: 1,
      nthChild: 1,
      siblingCount: 2,
    });
    const root = linkParent(
      createNode({
        id: "root",
        tagName: "ul",
        height: 1,
        childCount: 2,
        children: [childA, childB],
      }),
      [childA, childB],
    );

    const tree = new ContextTree(root, fakeHasher);
    const rootKey = ContextTree.compositeKey(root);
    const childKey = ContextTree.compositeKey(childA);
    const duplicatedSignature = tree.signature(childA);

    expect(tree.nodes().map((node) => node.id)).toEqual([
      "root",
      "child-a",
      "child-b",
    ]);
    expect(ContextTree.compositeKey(childA)).toBe("1:0/2|li|1|hash:same");
    expect(tree.getByCompositeKey(rootKey)).toBe(root);
    expect(tree.getByCompositeKey(childKey)).toBe(childA);
    expect(tree.compositeKeys()).toEqual(new Set([rootKey, childKey, ContextTree.compositeKey(childB)]));
    expect(tree.hasSignature(duplicatedSignature)).toBe(true);
    expect(tree.getBySignature(duplicatedSignature)).toEqual([childA, childB]);
    expect(tree.getBySignature("missing-signature")).toEqual([]);
    expect(tree.signatures().has(duplicatedSignature)).toBe(true);
    expect(tree.getRoot()).toBe(root);
    expect(tree.size()).toBe(3);
  });

  it("computes deterministic tree ids from composite keys", () => {
    const leaf = createNode({
      id: "leaf",
      tagName: "p",
      directText: "Hello",
      depth: 1,
      nthChild: 0,
      siblingCount: 1,
    });
    const root = linkParent(
      createNode({
        id: "root",
        tagName: "main",
        height: 1,
        childCount: 1,
        children: [leaf],
      }),
      [leaf],
    );

    const tree = new ContextTree(root, fakeHasher);

    expect(tree.getTreeId()).toBe(
      "hash:0:0/0|main|0|hash:;1:0/1|p|0|hash:Hello",
    );
  });

  it("serializes tree metadata and nodes in preorder", () => {
    const child = createNode({ id: "child", depth: 1, nthChild: 0, siblingCount: 1 });
    const root = linkParent(
      createNode({ id: "root", height: 1, childCount: 1, children: [child] }),
      [child],
    );
    const tree = new ContextTree(root, fakeHasher);

    const snapshot = tree.serialize();

    expect(snapshot.treeId).toBe(tree.getTreeId());
    expect(snapshot.nodeCount).toBe(2);
    expect(snapshot.nodes.map((node) => node.id)).toEqual(["root", "child"]);
    expect(new Date(snapshot.createdDate).toISOString()).toBe(snapshot.createdDate);
    expect(new Date(snapshot.lastUpdateDate).toISOString()).toBe(
      snapshot.lastUpdateDate,
    );
    expect(tree.getCreatedDate()).toBeInstanceOf(Date);
    expect(tree.getLastUpdateDate()).toBeInstanceOf(Date);
  });
});
