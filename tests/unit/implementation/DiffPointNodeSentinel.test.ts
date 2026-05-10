import { describe, expect, it } from "vitest";
import { DiffPoint } from "@core/diff";
import { DiffPointNodeSentinel } from "@implementation/sentinel";
import { createNode, createTreeFromRoot, linkParent } from "../helpers";

describe("DiffPointNodeSentinel", () => {
  it("returns NEVER_EXISTED when a signature is not in the reference tree", () => {
    const tree = createTreeFromRoot(createNode({ id: "root", tagName: "main" }));
    const sentinel = new DiffPointNodeSentinel(tree, []);

    expect(sentinel.query("missing|signature")).toEqual({
      found: false,
      reason: "NEVER_EXISTED",
    });
  });

  it("returns UNCHANGED when matching nodes have no diff points", () => {
    const node = createNode({
      id: "tracked",
      tagName: "a",
      attributes: { href: "/docs" },
      directText: "Docs",
    });
    const tree = createTreeFromRoot(node);
    const sentinel = new DiffPointNodeSentinel(tree, []);

    expect(sentinel.query(tree.signature(node))).toEqual({
      found: true,
      status: "UNCHANGED",
    });
  });

  it("returns AFFECTED for any tracked node id sharing the queried signature", () => {
    const trackedA = createNode({
      id: "tracked-a",
      tagName: "li",
      directText: "Same",
      depth: 1,
      nthChild: 0,
      siblingCount: 2,
    });
    const trackedB = createNode({
      id: "tracked-b",
      tagName: "li",
      directText: "Same",
      depth: 1,
      nthChild: 1,
      siblingCount: 2,
    });
    const root = linkParent(
      createNode({
        id: "root",
        tagName: "ul",
        children: [trackedA, trackedB],
        childCount: 2,
        height: 1,
      }),
      [trackedA, trackedB],
    );
    const tree = createTreeFromRoot(root);
    const affectedPoint = new DiffPoint("TEXT_CHANGED", trackedB, trackedB);
    const unrelatedPoint = new DiffPoint(
      "DELETED",
      createNode({ id: "unrelated", tagName: "li", directText: "Same" }),
      null,
    );
    const sentinel = new DiffPointNodeSentinel(tree, [
      unrelatedPoint,
      affectedPoint,
    ]);

    expect(sentinel.query(tree.signature(trackedA))).toEqual({
      found: true,
      status: "AFFECTED",
      points: [affectedPoint],
    });
  });
});
