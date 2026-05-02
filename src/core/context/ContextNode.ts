export type ValueType = {
  numberOfValues: number; // tokens split by whitespace / comma / semicolon
  totalLength: number; // raw string length of the attribute value
};

export type ContextNode = {
  id: string;

  tagName: string;
  attribute: Record<string, string>;
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

  // Surface — node tự nó là gì.
  // format: "<tagName>|<attrCount>|<attrShapesSortedByAttrName>"
  // mỗi attribute encode thành "<numberOfValues>:<totalLength>"; tên attr
  // chỉ dùng để sort, không xuất hiện trong chuỗi cuối.
  nodeSignature: string;

  // Subtree — nội dung con cháu + directText, hash đệ quy 12 ký tự.
  innerSignature: string;

  // Position — chỗ đứng của node trong cây.
  // format: "<depth>:<nthChild>/<siblingCount>"
  positioningSignature: string;

  parentSignature: string | null;

  // capturedAt: Date; // bỏ, nên để khi tree tạo snapshot thì lưu
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
