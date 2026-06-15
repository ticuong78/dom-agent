import type { ContextNode, ContextNodeSnapshot } from "./ContextNode";
import type { HashAdapter } from "../crypto";
import type { ISerializable } from "../interface";

/**
 * A function that produces an identity signature from a {@link ContextNode}.
 *
 * Developers supply their own `SignatureCreator` to control which node
 * properties define identity. The signature answers "what is this node?"
 * rather than "where does it sit in the tree?"
 *
 * @param node - The node to produce a signature for.
 * @returns A deterministic string representing the node's identity.
 *
 * @example
 * ```ts
 * // Custom creator that only uses id attribute
 * const byId: SignatureCreator = (node) => {
 *   const id = node.attributeAnalytic["id"]?.actualValue ?? "";
 *   return `${node.tagName}|${id}`;
 * };
 *
 * const tree = new ContextTree(root, hasher, byId);
 * ```
 */
export type SignatureCreator = (node: ContextNode) => string;

/**
 * Built-in signature creator: `tagName + attributes (excluding class) + directTextHash`.
 *
 * Excludes the `class` attribute by default because CSS classes change
 * frequently during redesigns and rarely represent node identity.
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
 * Built-in signature creator that includes the `class` attribute.
 *
 * Use this when CSS classes are meaningful identifiers in your DOM
 * (e.g. BEM naming, component-scoped classes).
 */
export const withClassSignatureCreator: SignatureCreator = (node) => {
  const sortedKeys = Object.keys(node.attributeAnalytic).sort();

  const attrPart = sortedKeys
    .map((key) => `${key}=${node.attributeAnalytic[key]!.actualValue}`)
    .join("&");

  return [node.tagName, attrPart, node.directTextHash].join("|");
};

/**
 * JSON-serializable snapshot of an entire {@link ContextTree}.
 *
 * All fields are primitives — safe for `JSON.stringify()` and file storage.
 * Nodes are stored as a flat array; tree structure is reconstructable via
 * each node's `parentId` and `childIds`.
 */
export type ContextTreeSnapshot = {
  /** Deterministic hash identifying this tree's content. Same DOM = same treeId. */
  treeId: string;

  /** ISO 8601 timestamp of when this tree was first created. */
  createdDate: string;

  /** ISO 8601 timestamp of the last update to this tree. */
  lastUpdateDate: string;

  /** Total number of nodes in the tree. */
  nodeCount: number;

  /** Flat array of all node snapshots (pre-order traversal). */
  nodes: ContextNodeSnapshot[];
};

/**
 * An indexed tree of {@link ContextNode} instances with dual lookup:
 * positional (composite key) and identity-based (signature).
 *
 * `ContextTree` is the primary structure consumed by {@link Comparer},
 * {@link DiffViewer}, and {@link NodeSentinel}. It provides O(1) node
 * lookup by both positional key and identity signature.
 *
 * @example
 * ```ts
 * const tree = new ContextTree(rootNode, hasher);
 *
 * // Lookup by identity
 * const sig = tree.signature(someNode);
 * const matches = tree.getBySignature(sig);
 *
 * // Serialize for persistence
 * const snapshot = tree.serialize();
 * fs.writeFileSync("snapshot.json", JSON.stringify(snapshot));
 * ```
 */
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

  /**
   * Creates a new ContextTree, indexes all nodes, and computes the treeId.
   *
   * @param root - The root {@link ContextNode} of the tree.
   * @param hasher - A {@link HashAdapter} used to compute the deterministic treeId.
   * @param signatureCreator - Optional custom {@link SignatureCreator}. Defaults to
   *        {@link defaultSignatureCreator} which excludes the `class` attribute.
   */
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
    const content = this.allNodes.map((node) => node.compositeKey()).join(";");
    return this.hasher.hash(content);
  }

  private index(node: ContextNode): void {
    this.byCompositeKey.set(node.compositeKey(), node);

    const sig = this.signature(node);
    const bucket = this.bySignature.get(sig) ?? [];
    bucket.push(node);
    this.bySignature.set(sig, bucket);

    this.allNodes.push(node);
    node.children.forEach((child) => this.index(child));
  }

  // --- Serialization ---

  /**
   * Serializes the entire tree into a JSON-safe {@link ContextTreeSnapshot}.
   *
   * The snapshot contains all node data as primitives — no circular
   * references, no class instances. Write it directly with `JSON.stringify()`.
   *
   * @returns A plain object snapshot of this tree.
   */
  serialize(): ContextTreeSnapshot {
    // use this function to save in the DB
    return {
      treeId: this.treeId,
      createdDate: this.createdDate.toISOString(),
      lastUpdateDate: this.lastUpdateDate.toISOString(),
      nodeCount: this.allNodes.length,
      nodes: this.allNodes.map((node) => node.serialize()),
    };
  }

  /**
   * Retrieves a node by its positional composite key.
   *
   * @param key - A composite key string (from {@link ContextTree.compositeKey}).
   * @returns The matching node, or `undefined` if not found.
   */
  getByCompositeKey(key: string): ContextNode | undefined {
    return this.byCompositeKey.get(key);
  }

  /**
   * Returns all composite keys present in this tree.
   */
  compositeKeys(): Set<string> {
    return new Set(this.byCompositeKey.keys());
  }

  // --- Signature (identity-based: "what the node IS") ---

  /**
   * Computes an identity signature for a node using the configured
   * {@link SignatureCreator}.
   *
   * @param node - The node to compute a signature for.
   * @returns A deterministic identity string.
   */
  signature(node: ContextNode): string {
    return this.signatureCreator(node);
  }

  /**
   * Retrieves all nodes matching a given identity signature.
   *
   * Multiple nodes can share the same signature (e.g. repeated list items
   * with identical structure and content).
   *
   * @param sig - An identity signature string.
   * @returns Array of matching nodes (empty if none found).
   */
  getBySignature(sig: string): ContextNode[] {
    return this.bySignature.get(sig) ?? [];
  }

  /**
   * Checks whether any node with the given signature exists in this tree.
   *
   * @param sig - An identity signature string.
   * @returns `true` if at least one node matches.
   */
  hasSignature(sig: string): boolean {
    return this.bySignature.has(sig);
  }

  /**
   * Returns the full set of unique signatures present in this tree.
   */
  signatures(): Set<string> {
    return new Set(this.bySignature.keys());
  }

  // --- General ---

  /**
   * Returns the deterministic hash ID of this tree.
   * Two trees built from identical DOM produce the same treeId.
   */
  getTreeId(): string {
    return this.treeId;
  }

  /** Returns the date this tree was first created. */
  getCreatedDate(): Date {
    return this.createdDate;
  }

  /** Returns the date this tree was last updated. */
  getLastUpdateDate(): Date {
    return this.lastUpdateDate;
  }

  /** Returns the root node of the tree. */
  getRoot(): ContextNode {
    return this.root;
  }

  /**
   * Returns all nodes in pre-order traversal order.
   */
  nodes(): ContextNode[] {
    return this.allNodes;
  }

  /** Returns the total number of nodes in the tree. */
  size(): number {
    return this.byCompositeKey.size;
  }
}
