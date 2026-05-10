import { describe, expect, it } from "vitest";
import { NodeMutationDiffViewer } from "@implementation/diff/viewer";
import { createNode, createTreeFromRoot, fakeComparer } from "../helpers";

describe("NodeMutationDiffViewer", () => {
  it("emits property mutation diffs for matched pairs", () => {
    const reference = createNode({
      id: "reference",
      tagName: "a",
      attributes: { href: "/old", class: "cta" },
      directText: "Old",
    });
    const target = createNode({
      id: "target",
      tagName: "button",
      attributes: { href: "/new" },
      directText: "New",
    });
    const viewer = new NodeMutationDiffViewer(
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

    expect(points.map((point) => point.type)).toEqual([
      "TAG_CHANGED",
      "ATTRIBUTE_CHANGED",
      "TEXT_CHANGED",
    ]);
    expect(points[1]!.delta).toBe(1);
  });

  it("emits additions and deletions from unmatched nodes", () => {
    const deletedNode = createNode({ id: "deleted" });
    const addedNode = createNode({ id: "added" });
    const viewer = new NodeMutationDiffViewer(
      fakeComparer({
        pairs: [],
        referenceOnly: [deletedNode],
        targetOnly: [addedNode],
      }),
    );

    const points = viewer.highlight(
      createTreeFromRoot(deletedNode),
      createTreeFromRoot(addedNode),
    );

    expect(points.map((point) => point.type)).toEqual(["DELETED", "ADDED"]);
    expect(points[0]!.referenceNode).toBe(deletedNode);
    expect(points[1]!.targetNode).toBe(addedNode);
  });

  it("does not emit a mutation for identical matched nodes", () => {
    const reference = createNode({ id: "reference", attributes: { id: "same" } });
    const target = createNode({ id: "target", attributes: { id: "same" } });
    const viewer = new NodeMutationDiffViewer(
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

  it("emits attribute changes when keys differ but attribute counts match", () => {
    const reference = createNode({ id: "reference", attributes: { id: "same" } });
    const target = createNode({ id: "target", attributes: { role: "same" } });
    const viewer = new NodeMutationDiffViewer(
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

    expect(points.map((point) => point.type)).toEqual(["ATTRIBUTE_CHANGED"]);
    expect(points[0]!.delta).toBe(0);
  });

  it("emits attribute changes when shared attribute values differ", () => {
    const reference = createNode({ id: "reference", attributes: { id: "old" } });
    const target = createNode({ id: "target", attributes: { id: "new" } });
    const viewer = new NodeMutationDiffViewer(
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

    expect(points.map((point) => point.type)).toEqual(["ATTRIBUTE_CHANGED"]);
    expect(points[0]!.delta).toBe(0);
  });

  it("guards against inconsistent attribute analytics lengths", () => {
    const reference = createNode({
      id: "reference",
      attributes: { id: "same" },
    });
    const target = createNode({
      id: "target",
      attributes: { id: "same" },
    });
    Object.defineProperty(target, "attributeAnalytic", {
      value: {
        id: { actualValue: "same", numberOfValues: 1, totalLength: 4 },
        role: { actualValue: "button", numberOfValues: 1, totalLength: 6 },
      },
    });
    const viewer = new NodeMutationDiffViewer(
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

    expect(points.map((point) => point.type)).toEqual(["ATTRIBUTE_CHANGED"]);
  });
});
