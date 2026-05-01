export type ValueType = {
  numberOfValue: number; // number of values seperated by commas and white space
  totalLength: number; // total length of the value in string
};

// have most weight: depth, height, nthChild (its potision in the generation), tagName

// logic - structural change:
// traverse down to the specific depth of the node, get the node - call node A

// from the deepest generation, traverse up, get the node - call node B

// if A has same signature as B => legit, unchanged

export type ContextNode = {
  // identity
  id: string; // generated unique id at snapshot time

  // element info
  tagName: string; // "div", "span", "ul", etc.
  attributes: Record<string, string>; // { class: "price", "data-testid": "label" }
  attributeCount: number;

  // structural ordinals (computed during DFS)
  depth: number; // distance from root going down
  height: number; // distance to deepest leaf going up
  childCount: number;
  siblingCount: number;
  nthChild: number; // position among siblings (0-indexed)

  // linked list pointers
  parent: ContextNode | null;
  nextSibling: ContextNode | null;
  previousSibling: ContextNode | null;

  // children
  // ordered: boolean; // declared by developer in config, unavailable for now
  children: ContextNode[];

  // signatures (computed via backtracking)

  // the strongest, most extensive identity hash, computed from:
  // nodeSignature = hash(tagName + hashed attributes),
  // innerNodeSignature = hash of each child's (nodeSignature + innerNodeSignature),
  // attributeCount, depth, height,
  // childCount, siblingCount, nthChild
  contextSignature: string;

  nodeSignature: string; // hash of tagName + attributes, inline attributes
  innerNodeSignature: string; // hash of full subtree structure

  // metadata
  capturedAt: Date;
};

export class ContextNodeSerializer {
  static serialize(contextNode: ContextNode): ContextNodeSerialized {
    throw new Error("Not implemented");
  }
}

export type ContextNodeSerialized = Omit<
  ContextNode,
  "parent" | "nextSibling" | "previousSibling" | "children" | "capturedAt"
> & {
  // linked list references (IDs instead of pointers)
  parentId: string | null;
  nextSiblingId: string | null;
  previousSiblingId: string | null;
  childIds: string[];
  capturedAt: string;
};
