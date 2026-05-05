import type { ContextNode, ContextNodeSnapshot } from "./ContextNode";
import type { HashAdapter } from "../crypto";
import type { ISerializable } from "../interface";

/**
 * A function that produces an identity signature from a ContextNode.
 * Developers supply their own to control which properties define
 * "what the node IS."
 */
export type SignatureCreator = (node: ContextNode) => string;

/**
 * Built-in signature creator: tagName + attributes (excluding class) + directTextHash.
 */
export const defaultSignatureCreator: SignatureCreator = (node) => {
  const filteredKeys = Object.keys(node.attributeAnalytic)
    .filter((key) => key !== "class")
    .sort();

  const attrPart = filteredKeys
    .map((key) => `${key}=${node.attributeAnalytic[key]!.actualValue}`)
    .join("&");

  return [node.tagName, attrPart, node.directTextHash].join("|");
};

/**
 * Signature creator that includes class attribute.
 */
export const withClassSignatureCreator: SignatureCreator = (node) => {
  const sortedKeys = Object.keys(node.attributeAnalytic).sort();

  const attrPart = sortedKeys
    .map((key) => `${key}=${node.attributeAnalytic[key]!.actualValue}`)
    .join("&");

  return [node.tagName, attrPart, node.directTextHash].join("|");
};

export type ContextTreeSnapshot = {
  treeId: string;
  createdDate: string;
  lastUpdateDate: string;
  nodeCount: number;
  nodes: ContextNodeSnapshot[];
};

export class ContextTree implements ISerializable {
  private readonly treeId: string;
  private readonly createdDate: Date;
  private lastUpdateDate: Date;
  private root: ContextNode;
  private byCompositeKey: Map<string, ContextNode> = new Map();
  private bySignature: Map<string, ContextNode[]> = new Map();
  private allNodes: ContextNode[] = [];
  private readonly signatureCreator: SignatureCreator;
  private readonly hasher: HashAdapter;

  constructor(
    root: ContextNode,
    hasher: HashAdapter,
    signatureCreator: SignatureCreator = defaultSignatureCreator,
  ) {
    this.hasher = hasher;
    this.signatureCreator = signatureCreator;
    this.root = root;
    this.createdDate = new Date();
    this.lastUpdateDate = this.createdDate;
    this.index(root);
    this.treeId = this.computeTreeId();
  }

  private computeTreeId(): string {
    const content = this.allNodes
      .map((node) => ContextTree.compositeKey(node))
      .join(";");
    return this.hasher.hash(content);
  }

  private index(node: ContextNode): void {
    this.byCompositeKey.set(ContextTree.compositeKey(node), node);

    const sig = this.signature(node);
    const bucket = this.bySignature.get(sig) ?? [];
    bucket.push(node);
    this.bySignature.set(sig, bucket);

    this.allNodes.push(node);
    node.children.forEach((child) => this.index(child));
  }

  // --- Serialization ---

  serialize(): ContextTreeSnapshot {
    return {
      treeId: this.treeId,
      createdDate: this.createdDate.toISOString(),
      lastUpdateDate: this.lastUpdateDate.toISOString(),
      nodeCount: this.allNodes.length,
      nodes: this.allNodes.map((node) => node.serialize()),
    };
  }

  // --- Composite Key (positional) ---

  static compositeKey(node: ContextNode): string {
    return [
      `${node.depth}:${node.nthChild}/${node.siblingCount}`,
      node.tagName,
      node.attributeCount,
      node.directTextHash,
    ].join("|");
  }

  getByCompositeKey(key: string): ContextNode | undefined {
    return this.byCompositeKey.get(key);
  }

  compositeKeys(): Set<string> {
    return new Set(this.byCompositeKey.keys());
  }

  // --- Signature (identity-based: "what the node IS") ---

  /**
   * Computes an identity signature for a node using the configured
   * SignatureCreator. Developers control which properties define
   * node identity by supplying their own creator at construction time.
   */
  signature(node: ContextNode): string {
    return this.signatureCreator(node);
  }

  /**
   * Looks up nodes by identity signature.
   * Returns all nodes matching the signature (multiple nodes can
   * share the same identity, e.g. repeated list items).
   */
  getBySignature(sig: string): ContextNode[] {
    return this.bySignature.get(sig) ?? [];
  }

  /**
   * Checks whether a node with the given signature exists in this tree.
   */
  hasSignature(sig: string): boolean {
    return this.bySignature.has(sig);
  }

  /**
   * Returns the full set of signatures present in this tree.
   */
  signatures(): Set<string> {
    return new Set(this.bySignature.keys());
  }

  // --- General ---

  getTreeId(): string {
    return this.treeId;
  }

  getCreatedDate(): Date {
    return this.createdDate;
  }

  getLastUpdateDate(): Date {
    return this.lastUpdateDate;
  }

  getRoot(): ContextNode {
    return this.root;
  }

  /**
   * Returns all nodes in the tree (pre-order traversal).
   */
  nodes(): ContextNode[] {
    return this.allNodes;
  }

  size(): number {
    return this.byCompositeKey.size;
  }
}
