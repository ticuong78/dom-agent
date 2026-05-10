import { describe, expect, it } from "vitest";
import { TreeHierarchyDiffViewer } from "@implementation/diff/viewer";
import { createNode, createTreeFromRoot, fakeComparer } from "../helpers";

describe("TreeHierarchyDiffViewer", () => {
  it("emits REORDERED when a node stays under the same parent but changes position", () => {
    const reference = createNode({
      id: "reference",
      parentTagName: "ul",
      parentAttributeCount: 1,
      parentDepth: 0,
      depth: 1,
      nthChild: 0,
      siblingCount: 3,
    });
    const target = createNode({
      id: "target",
      parentTagName: "ul",
      parentAttributeCount: 1,
      parentDepth: 0,
      depth: 1,
      nthChild: 2,
      siblingCount: 3,
    });
    const viewer = new TreeHierarchyDiffViewer(
      fakeComparer({
        pairs: [{ reference, target }],
        referenceOnly: [],
        targetOnly: [],
      }),
    );

    const points = viewer.highlight(
      createTreeFromRoot(reference),
      createTreeFromRoot(target),
    );

    expect(points).toHaveLength(1);
    expect(points[0]).toMatchObject({ type: "REORDERED", referenceNode: reference, targetNode: target });
  });

  it("emits REPARENTED when parent surface or depth changes", () => {
    const referenceParent = createNode({ id: "old-parent", tagName: "main" });
    const targetParent = createNode({ id: "new-parent", tagName: "aside" });
    const reference = createNode({
      id: "reference",
      parentTagName: "main",
      parentAttributeCount: 0,
      parentDepth: 0,
      depth: 1,
    });
    reference.parent = referenceParent;
    const target = createNode({
      id: "target",
      parentTagName: "aside",
      parentAttributeCount: 0,
      parentDepth: 0,
      depth: 1,
    });
    target.parent = targetParent;
    const viewer = new TreeHierarchyDiffViewer(
      fakeComparer({
        pairs: [{ reference, target }],
        referenceOnly: [],
        targetOnly: [],
      }),
    );

    const points = viewer.highlight(
      createTreeFromRoot(reference),
      createTreeFromRoot(target),
    );

    expect(points).toHaveLength(1);
    expect(points[0]).toMatchObject({
      type: "REPARENTED",
      referenceParentNode: referenceParent,
      targetParentNode: targetParent,
    });
  });

  it("emits additions and deletions and ignores unchanged positions", () => {
    const unchangedReference = createNode({
      id: "unchanged-reference",
      parentTagName: "main",
      parentAttributeCount: 0,
      parentDepth: 0,
      depth: 1,
      nthChild: 0,
      siblingCount: 1,
    });
    const unchangedTarget = createNode({
      id: "unchanged-target",
      parentTagName: "main",
      parentAttributeCount: 0,
      parentDepth: 0,
      depth: 1,
      nthChild: 0,
      siblingCount: 1,
    });
    const deletedNode = createNode({ id: "deleted" });
    const addedNode = createNode({ id: "added" });
    const viewer = new TreeHierarchyDiffViewer(
      fakeComparer({
        pairs: [{ reference: unchangedReference, target: unchangedTarget }],
        referenceOnly: [deletedNode],
        targetOnly: [addedNode],
      }),
    );

    const points = viewer.highlight(
      createTreeFromRoot(unchangedReference),
      createTreeFromRoot(unchangedTarget),
    );

    expect(points.map((point) => point.type)).toEqual(["DELETED", "ADDED"]);
  });

  it("does not emit when only sibling count changes without parent or nth-child movement", () => {
    const reference = createNode({
      id: "reference",
      parentTagName: "main",
      parentAttributeCount: 0,
      parentDepth: 0,
      depth: 1,
      nthChild: 0,
      siblingCount: 1,
    });
    const target = createNode({
      id: "target",
      parentTagName: "main",
      parentAttributeCount: 0,
      parentDepth: 0,
      depth: 1,
      nthChild: 0,
      siblingCount: 2,
    });
    const viewer = new TreeHierarchyDiffViewer(
      fakeComparer({
        pairs: [{ reference, target }],
        referenceOnly: [],
        targetOnly: [],
      }),
    );

    expect(
      viewer.highlight(createTreeFromRoot(reference), createTreeFromRoot(target)),
    ).toEqual([]);
  });
});
