import { CheerioAdapter } from "@adapters/atom";
import type { HashAdapter, IDAdapter } from "@core/crypto";
import type { CompareResult, Comparer } from "@core/compare";
import { ContextNode, ContextTree, type ContextNodeParams } from "@core/context";
import { HTMLToContextConverter } from "@implementation/converter";

export const fakeHasher: HashAdapter = {
  hash: (input: string) => `hash:${input}`,
};

export class DeterministicIDAdapter implements IDAdapter {
  private next = 1;

  generate(): string {
    return `node-${this.next++}`;
  }
}

export const createNode = (
  overrides: Partial<ContextNodeParams> = {},
): ContextNode =>
  new ContextNode({
    id: "node",
    tagName: "div",
    attributes: {},
    directText: "",
    depth: 0,
    siblingCount: 0,
    nthChild: 0,
    height: 0,
    childCount: 0,
    children: [],
    hasher: fakeHasher.hash,
    parentTagName: null,
    parentAttributeCount: null,
    parentDepth: null,
    ...overrides,
  });

export const linkParent = (
  parent: ContextNode,
  children: ContextNode[],
): ContextNode => {
  children.forEach((child, index) => {
    child.parent = parent;
    child.previousSibling = index > 0 ? children[index - 1]! : null;
    child.nextSibling = index < children.length - 1 ? children[index + 1]! : null;
  });
  return parent;
};

export const createTreeFromRoot = (root: ContextNode): ContextTree =>
  new ContextTree(root, fakeHasher);

export const createTreeFromHtml = (html: string): ContextTree => {
  const htmlNode = new CheerioAdapter().parse(html);
  if (!htmlNode) throw new Error("Expected HTML fixture to produce a root node");

  const tree = new HTMLToContextConverter(
    new DeterministicIDAdapter(),
    fakeHasher,
  ).convert(htmlNode);
  if (!tree) throw new Error("Expected converter fixture to produce a tree");

  return tree;
};

export const fakeComparer = (result: CompareResult): Comparer => ({
  compare: () => result,
});
