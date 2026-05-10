import { describe, expect, it } from "vitest";
import {
  analyzeAttributes,
  sortAttributesByAlphabet,
} from "@core/context/ContextNode";
import { createNode } from "../helpers";

describe("ContextNode attribute utilities", () => {
  it("sorts attributes alphabetically by key", () => {
    expect(sortAttributesByAlphabet({ z: "last", a: "first", m: "middle" }))
      .toEqual([
        ["a", "first"],
        ["m", "middle"],
        ["z", "last"],
      ]);
  });

  it("analyzes values with stable keys and token metrics", () => {
    expect(
      analyzeAttributes({
        class: "btn  primary,large; active",
        id: "submit",
        empty: "  ,, ; ",
      }),
    ).toEqual({
      class: {
        actualValue: "btn  primary,large; active",
        numberOfValues: 4,
        totalLength: 26,
      },
      empty: {
        actualValue: "  ,, ; ",
        numberOfValues: 0,
        totalLength: 7,
      },
      id: {
        actualValue: "submit",
        numberOfValues: 1,
        totalLength: 6,
      },
    });
  });
});

describe("ContextNode", () => {
  it("computes derived metrics from constructor parameters", () => {
    const child = createNode({ id: "child", tagName: "span" });
    const node = createNode({
      id: "parent",
      tagName: "section",
      attributes: { id: "hero", class: "wide bright" },
      directText: "Hello",
      depth: 2,
      nthChild: 1,
      siblingCount: 3,
      height: 1,
      childCount: 1,
      children: [child],
      parentTagName: "main",
      parentAttributeCount: 2,
      parentDepth: 1,
    });

    expect(node.attributeCount).toBe(2);
    expect(node.attributeAnalytic.class).toEqual({
      actualValue: "wide bright",
      numberOfValues: 2,
      totalLength: 11,
    });
    expect(node.directTextHash).toBe("hash:Hello");
    expect(node.parentTagName).toBe("main");
    expect(node.parentAttributeCount).toBe(2);
    expect(node.parentDepth).toBe(1);
  });

  it("serializes node pointers as ids instead of circular objects", () => {
    const childA = createNode({ id: "child-a", tagName: "span" });
    const childB = createNode({ id: "child-b", tagName: "strong" });
    const parent = createNode({
      id: "parent",
      children: [childA, childB],
      childCount: 2,
    });
    childA.parent = parent;
    childB.parent = parent;

    expect(childA.serialize()).toMatchObject({
      id: "child-a",
      parentId: "parent",
      childIds: [],
    });
    expect(parent.serialize()).toMatchObject({
      id: "parent",
      parentId: null,
      childIds: ["child-a", "child-b"],
    });
  });
});
