import { describe, expect, it } from "vitest";
import { CompareRule, CompareRuleManager } from "@core/compare";
import { RuleBasedComparer } from "@implementation/compare";
import { createNode, createTreeFromRoot, linkParent } from "../helpers";

describe("CompareRule", () => {
  it("evaluates string match and unmatch points", () => {
    const a = createNode({ tagName: "button", directText: "Save" });
    const b = createNode({ tagName: "button", directText: "Cancel" });

    expect(
      new CompareRule([
        { attType: "tagName", matchType: "match", logicType: "and" },
        { attType: "directTextHash", matchType: "unmatch", logicType: "and" },
      ]).evaluate(a, b),
    ).toBe(true);
  });

  it("evaluates numeric equal, less, and greater points", () => {
    const shallow = createNode({ depth: 1, childCount: 3 });
    const deep = createNode({ depth: 2, childCount: 1 });

    expect(
      new CompareRule([
        { attType: "depth", matchType: "less", logicType: "and" },
        { attType: "childCount", matchType: "greater", logicType: "and" },
      ]).evaluate(shallow, deep),
    ).toBe(true);
    expect(
      new CompareRule([
        { attType: "depth", matchType: "equal", logicType: "and" },
      ]).evaluate(shallow, deep),
    ).toBe(false);
  });

  it("evaluates attribute key, value, and full matches", () => {
    const a = createNode({ attributes: { id: "hero", class: "one" } });
    const sameKeysDifferentClass = createNode({
      attributes: { id: "hero", class: "two" },
    });
    const sameIdOnly = createNode({ attributes: { id: "hero" } });

    expect(
      new CompareRule([
        { attType: "attributeAnalytic", matchType: "keys_match", logicType: "and" },
      ]).evaluate(a, sameKeysDifferentClass),
    ).toBe(true);
    expect(
      new CompareRule([
        { attType: "attributeAnalytic", matchType: "values_match", logicType: "and" },
      ]).evaluate(a, sameIdOnly),
    ).toBe(true);
    expect(
      new CompareRule([
        { attType: "attributeAnalytic", matchType: "full_match", logicType: "and" },
      ]).evaluate(a, sameKeysDifferentClass),
    ).toBe(false);
  });

  it("combines points sequentially with AND and OR", () => {
    const a = createNode({ tagName: "a", directText: "same" });
    const b = createNode({ tagName: "button", directText: "same" });

    expect(
      new CompareRule([
        { attType: "tagName", matchType: "match", logicType: "and" },
        { attType: "directTextHash", matchType: "match", logicType: "or" },
      ]).evaluate(a, b),
    ).toBe(true);
  });
});

describe("CompareRuleManager", () => {
  it("registers, retrieves, overwrites, and checks rules", () => {
    const manager = new CompareRuleManager();
    const first = new CompareRule([
      { attType: "tagName", matchType: "match", logicType: "and" },
    ]);
    const second = new CompareRule([
      { attType: "directTextHash", matchType: "match", logicType: "and" },
    ]);

    expect(manager.register("stable", first)).toBe(manager);
    expect(manager.has("stable")).toBe(true);
    expect(manager.get("stable")).toBe(first);
    manager.register("stable", second);
    expect(manager.get("stable")).toBe(second);
    expect(() => manager.get("missing")).toThrow('CompareRule "missing" not found');
  });
});

describe("RuleBasedComparer", () => {
  it("matches by default tag groups and returns unmatched nodes", () => {
    const refChild = createNode({
      id: "ref-child",
      tagName: "span",
      directText: "same",
      depth: 1,
      nthChild: 0,
      siblingCount: 1,
    });
    const refRoot = linkParent(
      createNode({ id: "ref-root", tagName: "main", children: [refChild], childCount: 1 }),
      [refChild],
    );
    const targetChild = createNode({
      id: "target-child",
      tagName: "span",
      directText: "same",
      depth: 1,
      nthChild: 0,
      siblingCount: 1,
    });
    const targetExtra = createNode({
      id: "target-extra",
      tagName: "aside",
      depth: 1,
      nthChild: 1,
      siblingCount: 1,
    });
    const targetRoot = linkParent(
      createNode({
        id: "target-root",
        tagName: "main",
        children: [targetChild, targetExtra],
        childCount: 2,
      }),
      [targetChild, targetExtra],
    );
    const comparer = new RuleBasedComparer(
      new CompareRule([
        { attType: "tagName", matchType: "match", logicType: "and" },
        { attType: "directTextHash", matchType: "match", logicType: "and" },
      ]),
    );

    const result = comparer.compare(
      createTreeFromRoot(refRoot),
      createTreeFromRoot(targetRoot),
    );

    expect(result.pairs.map((pair) => [pair.reference.id, pair.target.id])).toEqual([
      ["ref-root", "target-root"],
      ["ref-child", "target-child"],
    ]);
    expect(result.referenceOnly).toEqual([]);
    expect(result.targetOnly.map((node) => node.id)).toEqual(["target-extra"]);
  });

  it("uses a custom group function and never reuses a target node", () => {
    const refButton = createNode({
      id: "ref-button",
      tagName: "button",
      directText: "same",
      depth: 1,
    });
    const refA = linkParent(
      createNode({
        id: "ref-a",
        tagName: "a",
        directText: "same",
        children: [refButton],
        childCount: 1,
        height: 1,
      }),
      [refButton],
    );
    const targetDiv = createNode({
      id: "target-div",
      tagName: "div",
      directText: "same",
    });
    const comparer = new RuleBasedComparer(
      new CompareRule([
        { attType: "directTextHash", matchType: "match", logicType: "and" },
      ]),
      () => "all",
    );

    const result = comparer.compare(
      createTreeFromRoot(refA),
      createTreeFromRoot(targetDiv),
    );

    expect(result.pairs).toHaveLength(1);
    expect(result.pairs[0]).toMatchObject({
      reference: refA,
      target: targetDiv,
    });
    expect(result.referenceOnly).toEqual([refButton]);
    expect(result.targetOnly).toEqual([]);
  });

  it("chooses the passing candidate with the nearest position", () => {
    const reference = createNode({
      id: "reference",
      tagName: "li",
      depth: 2,
      nthChild: 2,
    });
    const near = createNode({ id: "near", tagName: "li", depth: 2, nthChild: 3 });
    const far = linkParent(
      createNode({
        id: "far",
        tagName: "li",
        depth: 5,
        nthChild: 9,
        children: [near],
        childCount: 1,
        height: 1,
      }),
      [near],
    );
    const comparer = new RuleBasedComparer(
      new CompareRule([{ attType: "tagName", matchType: "match", logicType: "and" }]),
    );

    const result = comparer.compare(
      createTreeFromRoot(reference),
      createTreeFromRoot(far),
    );

    expect(result.pairs[0]!.target).toBe(near);
    expect(result.targetOnly).toEqual([far]);
  });

  it("keeps the current best match when later candidates are farther away", () => {
    const reference = createNode({
      id: "reference",
      tagName: "li",
      depth: 2,
      nthChild: 2,
    });
    const far = createNode({ id: "far", tagName: "li", depth: 5, nthChild: 9 });
    const near = linkParent(
      createNode({
        id: "near",
        tagName: "li",
        depth: 2,
        nthChild: 3,
        children: [far],
        childCount: 1,
        height: 1,
      }),
      [far],
    );
    const comparer = new RuleBasedComparer(
      new CompareRule([{ attType: "tagName", matchType: "match", logicType: "and" }]),
    );

    const result = comparer.compare(
      createTreeFromRoot(reference),
      createTreeFromRoot(near),
    );

    expect(result.pairs[0]!.target).toBe(near);
    expect(result.targetOnly).toEqual([far]);
  });

  it("leaves nodes unmatched when groups are missing or candidates fail the rule", () => {
    const refButton = createNode({ id: "ref-button", tagName: "button" });
    const refLink = createNode({ id: "ref-link", tagName: "a", directText: "docs" });
    const refRoot = linkParent(
      createNode({
        id: "ref-root",
        tagName: "main",
        children: [refButton, refLink],
        childCount: 2,
      }),
      [refButton, refLink],
    );
    const targetLink = createNode({
      id: "target-link",
      tagName: "a",
      directText: "pricing",
    });
    const comparer = new RuleBasedComparer(
      new CompareRule([
        { attType: "tagName", matchType: "match", logicType: "and" },
        { attType: "directTextHash", matchType: "match", logicType: "and" },
      ]),
    );

    const result = comparer.compare(
      createTreeFromRoot(refRoot),
      createTreeFromRoot(targetLink),
    );

    expect(result.pairs).toEqual([]);
    expect(result.referenceOnly.map((node) => node.id)).toEqual([
      "ref-root",
      "ref-button",
      "ref-link",
    ]);
    expect(result.targetOnly).toEqual([targetLink]);
  });
});
