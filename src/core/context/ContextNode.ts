export type ValueType = {
  numberOfValues: number; // tokens split by whitespace / comma / semicolon
  totalLength: number; // raw string length of the attribute value
};

export type ContextNode = {
  id: string;

  tagName: string;
  attributeFingerprints: Record<string, ValueType>; // shape, not content
  attributeCount: number;
  directText: string; // cần cho nodeSignature + diff reporting

  depth: number;
  height: number;
  childCount: number;
  siblingCount: number;
  nthChild: number;

  parent: ContextNode | null;
  nextSibling: ContextNode | null;
  previousSibling: ContextNode | null;
  children: ContextNode[];

  // format: "<tagName>|<attributeCount>|<sortedAttrKeys>|<directTextLen>"
  nodeSignature: string;

  // innerNodeSignature — vẫn hash (tích lũy đệ quy), cắt ngắn 12 chars
  innerSignature: string;

  // contextSignature — readable composite, parseable hoàn toàn
  // format: "<depth>:<nthChild>/<siblingCount>|<nodeSignature>|<innerNodeSignature>"
  contextSignature: string;

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
