import type { ISerializable } from "@core/interface";

export type ValueType = {
  // full primitive
  actualValue: string;
  numberOfValues: number;
  totalLength: number;
};

export const sortAttributesByAlphabet = (attributes: Record<string, string>) =>
  Object.entries(attributes).sort(([a], [b]) => a.localeCompare(b));

export const analyzeAttributes = (
  attributes: Record<string, string>,
): Record<string, ValueType> => {
  const sorted = sortAttributesByAlphabet(attributes);

  return Object.fromEntries(
    sorted.map(([key, value]) => [
      key,
      {
        actualValue: value,
        numberOfValues: value.split(/[\s,;]+/).filter(Boolean).length,
        totalLength: value.length,
      },
    ]),
  );
};

export type ContextNodeParams = {
  id: string;
  tagName: string;
  attributes: Record<string, string>;
  directText: string;
  depth: number;
  siblingCount: number;
  nthChild: number;
  height: number;
  childCount: number;
  children: ContextNode[];
  hasher: (text: string) => string;
  // parent surface properties (null for root nodes)
  parentTagName: string | null;
  parentAttributeCount: number | null;
  parentDepth: number | null;
};

export type ContextNodeSnapshot = {
  id: string;
  tagName: string;
  attributeAnalytic: Record<string, ValueType>;
  attributeCount: number;
  directText: string;
  directTextHash: string;
  depth: number;
  nthChild: number;
  siblingCount: number;
  height: number;
  childCount: number;
  parentTagName: string | null;
  parentAttributeCount: number | null;
  parentDepth: number | null;
  parentId: string | null;
  childIds: string[];
};

export class ContextNode implements ISerializable {
  readonly id: string;
  readonly tagName: string; //  need to be considered
  readonly attributeAnalytic: Record<string, ValueType>; //  need to be considered
  readonly attributeCount: number; //  need to be considered
  readonly directText: string; //  need to be considered
  readonly directTextHash: string; // need to be considered, between "inner" or "child"
  readonly depth: number; // need to be considered
  readonly siblingCount: number; // need to be considered a usage for this
  readonly nthChild: number; // need to be considered a usage for this
  readonly height: number; // need to be considered, sub-tree depth
  readonly childCount: number; // need to be considered, number of children
  readonly children: ContextNode[]; // not a signature, just pointers

  // parent surface properties (null for root nodes)
  readonly parentTagName: string | null;
  readonly parentAttributeCount: number | null;
  readonly parentDepth: number | null;

  parent: ContextNode | null = null; // not a signature, just pointer
  nextSibling: ContextNode | null = null; // not a signature, just pointer
  previousSibling: ContextNode | null = null; // not a signature, just pointer

  constructor(params: ContextNodeParams) {
    this.id = params.id;
    this.tagName = params.tagName;
    this.attributeAnalytic = analyzeAttributes(params.attributes);
    this.attributeCount = Object.keys(this.attributeAnalytic).length;
    this.directText = params.directText;
    this.directTextHash = params.hasher(params.directText);
    this.depth = params.depth;
    this.siblingCount = params.siblingCount;
    this.nthChild = params.nthChild;
    this.height = params.height;
    this.childCount = params.childCount;
    this.children = params.children;
    this.parentTagName = params.parentTagName;
    this.parentAttributeCount = params.parentAttributeCount;
    this.parentDepth = params.parentDepth;
  }

  /**
   * Flattens a ContextNode into a plain object with no circular
   * references. Pointers (parent, siblings, children) become ids.
   */
  serialize(): ContextNodeSnapshot {
    return {
      id: this.id,
      tagName: this.tagName,
      attributeAnalytic: this.attributeAnalytic,
      attributeCount: this.attributeCount,
      directText: this.directText,
      directTextHash: this.directTextHash,
      depth: this.depth,
      nthChild: this.nthChild,
      siblingCount: this.siblingCount,
      height: this.height,
      childCount: this.childCount,
      parentTagName: this.parentTagName,
      parentAttributeCount: this.parentAttributeCount,
      parentDepth: this.parentDepth,
      parentId: this.parent?.id ?? null,
      childIds: this.children.map((c) => c.id),
    };
  }
}
