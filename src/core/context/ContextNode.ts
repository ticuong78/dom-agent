export type ValueType = {
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

export class ContextNode {
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
}

export class ContextNodeSerializer {
  static serialize(contextNode: ContextNode): ContextNodeSerialized {
    throw new Error("Not implemented");
  }
}

export type ContextNodeSerialized = Omit<
  ContextNode,
  "parent" | "nextSibling" | "previousSibling" | "children"
> & {
  parentId: string | null;
  nextSiblingId: string | null;
  previousSiblingId: string | null;
  childIds: string[];
  capturedAt: string;
};
