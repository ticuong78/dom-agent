import { describe, expect, it } from "vitest";
import { SubtreeShapeDiffViewer } from "@implementation/diff/viewer";
import { createNode, createTreeFromRoot, fakeComparer } from "../helpers";

describe("SubtreeShapeDiffViewer", () => {
  it("emits GROWN and positive DEPTH_CHANGED deltas", () => {
    const reference = createNode({ id: "reference", childCount: 1, height: 1 });
    const target = createNode({ id: "target", childCount: 3, height: 4 });
    const viewer = new SubtreeShapeDiffViewer(
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

    expect(points.map((point) => [point.type, point.delta])).toEqual([
      ["GROWN", 2],
      ["DEPTH_CHANGED", 3],
    ]);
  });

  it("emits SHRUNK and negative DEPTH_CHANGED deltas", () => {
    const reference = createNode({ id: "reference", childCount: 4, height: 5 });
    const target = createNode({ id: "target", childCount: 1, height: 2 });
    const viewer = new SubtreeShapeDiffViewer(
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

    expect(points.map((point) => [point.type, point.delta])).toEqual([
      ["SHRUNK", 3],
      ["DEPTH_CHANGED", -3],
    ]);
  });

  it("emits additions and deletions and ignores unchanged shape", () => {
    const unchangedReference = createNode({ id: "unchanged-reference", childCount: 1, height: 1 });
    const unchangedTarget = createNode({ id: "unchanged-target", childCount: 1, height: 1 });
    const deletedNode = createNode({ id: "deleted" });
    const addedNode = createNode({ id: "added" });
    const viewer = new SubtreeShapeDiffViewer(
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
});
