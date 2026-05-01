export type DOMNode = {
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
  parent: DOMNode | null;
  nextSibling: DOMNode | null;
  previousSibling: DOMNode | null;

  // children
  ordered: boolean; // declared by developer in config
  children: DOMNode[];

  // signatures (computed via backtracking)
  outerSignature: string; // hash of tagName + attributes
  innerSignature: string; // hash of full subtree structure

  // metadata
  capturedAt: Date;
};

type DOMNodeSerialized = {
  // identity
  id: string;

  // element info
  tagName: string;
  attributes: Record<string, string>;
  attributeCount: number;

  // structural ordinals
  depth: number;
  height: number;
  childCount: number;
  siblingCount: number;
  nthChild: number;

  // linked list references (IDs instead of pointers)
  parentId: string | null;
  nextSiblingId: string | null;
  previousSiblingId: string | null;
  childIds: string[];

  // config
  ordered: boolean;

  // signatures
  outerSignature: string;
  innerSignature: string;
};
