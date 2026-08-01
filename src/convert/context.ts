import type { ISerializable } from "../interface/ISerializable";
import { defaultHash, type HashFn } from "../utils";
import { AttributePool } from "./pool";
import { suggestSelector, type SelectorSuggestion } from "../selector";

/**
 * Analysed representation of a single attribute value.
 *
 * Rather than storing only the raw string, dom-agent breaks each attribute
 * into metrics that enable structural comparison without exact string matching.
 *
 * @example
 * ```ts
 * // For attribute class="btn btn-primary lg"
 * const value: ValueType = {
 *   actualValue: "btn btn-primary lg",
 *   numberOfValues: 3,    // split by whitespace/comma/semicolon
 *   totalLength: 18,
 * };
 * ```
 */
export type ValueType = {
  /** The original, unmodified attribute value string. */
  actualValue: string;

  /** Number of discrete values (split by whitespace, commas, or semicolons). */
  numberOfValues: number;

  /** Character length of the raw value string. */
  totalLength: number;
};

/**
 * Sorts an attribute record alphabetically by key.
 * Used internally to ensure deterministic ordering for comparison and hashing.
 *
 * @param attributes - Raw key-value attribute pairs from an HTML element.
 * @returns Sorted entries array.
 */
export const sortAttributesByAlphabet = (attributes: Record<string, string>) =>
  Object.entries(attributes).sort(([a], [b]) => a.localeCompare(b));

/**
 * Transforms raw HTML attributes into analysed {@link ValueType} records.
 *
 * @param attributes - Raw key-value attribute pairs from an HTML element.
 * @returns An alphabetically-keyed record of analysed attribute values.
 *
 * @example
 * ```ts
 * const result = analyzeAttributes({ class: "btn primary", id: "submit" });
 * // result.class.numberOfValues === 2
 * // result.id.totalLength === 6
 * ```
 */
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

/**
 * Constructor parameters for creating a {@link ContextNode}.
 */
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
  parentTagName: string | null;
  parentAttributeCount: number | null;
  parentDepth: number | null;
  isExcluded: boolean;
};

/**
 * A JSON-serializable snapshot of a {@link ContextNode}.
 *
 * All fields are primitives or arrays of primitives — no circular references,
 * no class instances. Suitable for writing directly to a JSON file.
 *
 * Pointers (parent, siblings, children) are represented as ID strings.
 */
export type ContextNodeSnapshot = {
  /** Unique identifier scoped to the parent {@link ContextTree} snapshot. */
  id: string;

  /** HTML tag name (e.g. `"div"`, `"table"`). */
  tagName: string;

  /** Analysed attributes with metrics per key. */
  attributeAnalytic: Record<string, ValueType>;

  /** Total number of attributes on this element. */
  attributeCount: number;

  /** Direct text content owned by this node. */
  directText: string;

  /** Hash of directText for fast equality comparison. */
  directTextHash: string;

  /** Zero-based depth in the tree (root = 0). */
  depth: number;

  /** Position among siblings (zero-based). */
  nthChild: number;

  /** Total sibling count at this level. */
  siblingCount: number;

  /** Height of the subtree rooted at this node (leaf = 0). */
  height: number;

  /** Number of direct children. */
  childCount: number;

  /** Tag name of the parent node, or `null` for root. */
  parentTagName: string | null;

  /** Attribute count of the parent node, or `null` for root. */
  parentAttributeCount: number | null;

  /** Depth of the parent node, or `null` for root. */
  parentDepth: number | null;

  /** ID of the parent node, or `null` for root. */
  parentId: string | null;

  /** IDs of direct children in document order. */
  childIds: string[];

  /** Best confidence score across all attributes (1.0 = unique, 0 = no usable attr). */
  selectorScore: number;

  /** Attribute key that gave the highest confidence, or `null`. */
  bestAttr: string | null;
};

/**
 * An enriched representation of a DOM node with computed structural metadata.
 *
 * `ContextNode` is the central data structure in dom-agent. It augments raw
 * HTML information with metrics that enable intelligent comparison:
 * depth, height, sibling position, attribute analysis, text hashing, and
 * parent surface properties.
 *
 * Nodes form a tree via the `children` array and navigational pointers
 * (`parent`, `nextSibling`, `previousSibling`). These pointers are set
 * after construction by the converter.
 *
 * @example
 * ```ts
 * const node = new ContextNode({
 *   id: "abc-123",
 *   tagName: "div",
 *   attributes: { id: "app", class: "container" },
 *   directText: "",
 *   depth: 1,
 *   siblingCount: 3,
 *   nthChild: 0,
 *   height: 4,
 *   childCount: 2,
 *   children: [...],
 *   hasher: sha256,
 *   parentTagName: "body",
 *   parentAttributeCount: 0,
 *   parentDepth: 0,
 * });
 * ```
 */
export class ContextNode implements ISerializable {
  /** Unique identifier scoped to one {@link ContextTree}. */
  readonly id: string;

  /** HTML tag name. */
  readonly tagName: string;

  /** Analysed attributes — keys sorted alphabetically, values broken into metrics. */
  readonly attributeAnalytic: Record<string, ValueType>;

  /** Total number of attributes. */
  readonly attributeCount: number;

  /** Direct text content (not inherited from descendants). */
  readonly directText: string;

  /** Deterministic hash of {@link directText} for fast equality checks. */
  readonly directTextHash: string;

  /** Zero-based depth in the tree (root = 0). */
  readonly depth: number;

  /** Total number of siblings at this level (including this node). */
  readonly siblingCount: number;

  /** Zero-based index among siblings. */
  readonly nthChild: number;

  /** Height of the subtree rooted here (leaf = 0). */
  readonly height: number;

  /** Number of direct child nodes. */
  readonly childCount: number;

  /** Direct children in document order. */
  readonly children: ContextNode[];

  /** Tag name of the parent (null for root). */
  readonly parentTagName: string | null;

  /** Attribute count of the parent (null for root). */
  readonly parentAttributeCount: number | null;

  /** Depth of the parent (null for root). */
  readonly parentDepth: number | null;

  readonly isExcluded: boolean = false; // mặt định là tất cả đều được xem, ngoại trừ ignore thành true

  /** Best confidence score across all attributes. Set by ContextTree after pool is built. */
  selectorScore: number = 0;

  /** Attribute key that gave the highest confidence. Set by ContextTree after pool is built. */
  bestAttr: string | null = null;

  /** Pointer to parent node. Set after construction. */
  parent: ContextNode | null = null;

  /** Pointer to next sibling. Set after construction. */
  nextSibling: ContextNode | null = null;

  /** Pointer to previous sibling. Set after construction. */
  previousSibling: ContextNode | null = null;

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
    this.isExcluded = params.isExcluded;
  }

  /**
   * Serializes this node into a plain JSON-safe object.
   *
   * Circular pointers (parent, siblings) are replaced with ID strings.
   * The result can be safely passed to `JSON.stringify()`.
   *
   * @returns A {@link ContextNodeSnapshot} with all primitive fields.
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
      selectorScore: this.selectorScore,
      bestAttr: this.bestAttr,
    };
  }

  /**
   * Computes a positional composite key for a node.
   *
   * The key encodes WHERE the node sits: `depth:nthChild/siblingCount|tagName|attributeCount|directTextHash`.
   * Used for fast tree-internal deduplication. Not stable across DOM changes.
   *
   * @returns A positional composite key string.
   */
  compositeKey(): string {
    return [
      `${this.depth}:${this.nthChild}/${this.siblingCount}`,
      this.tagName,
      this.attributeCount,
      this.directTextHash,
    ].join("|");
  }

  /** Suggests the best CSS selector to target this node. */
  suggestSelector(): SelectorSuggestion {
    return suggestSelector(this);
  }
}

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
  private readonly _hash: HashFn;
  private readonly treeId: string;
  private readonly createdDate: Date;
  private lastUpdateDate: Date;
  private root: ContextNode;
  private byCompositeKey: Map<string, ContextNode> = new Map();
  private bySignature: Map<string, ContextNode[]> = new Map();
  private allNodes: ContextNode[] = [];
  private readonly signatureCreator: SignatureCreator;
  private readonly pool: AttributePool = new AttributePool();

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
    hash: HashFn = defaultHash,
    signatureCreator: SignatureCreator = defaultSignatureCreator,
  ) {
    this._hash = hash;
    this.signatureCreator = signatureCreator;
    this.root = root;
    this.createdDate = new Date();
    this.lastUpdateDate = this.createdDate;
    this.index(root);
    this.scoreNodes();
    this.treeId = this.computeTreeId();
  }

  private computeTreeId(): string {
    const content = this.allNodes.map((node) => node.compositeKey()).join(";");
    return this._hash(content);
  }

  private index(node: ContextNode): void {
    this.byCompositeKey.set(node.compositeKey(), node);

    const sig = this.signature(node);
    const bucket = this.bySignature.get(sig) ?? [];
    bucket.push(node);
    this.bySignature.set(sig, bucket);

    this.allNodes.push(node);
    this.pool.register(node);
    node.children.forEach((child) => this.index(child));
  }

  private scoreNodes(): void {
    for (const node of this.allNodes) {
      let bestScore = 0;
      let bestKey: string | null = null;

      for (const [key, val] of Object.entries(node.attributeAnalytic)) {
        const score = this.pool.confidence(key, val.actualValue);
        if (score > bestScore) {
          bestScore = score;
          bestKey = key;
        }
      }

      node.selectorScore = bestScore;
      node.bestAttr = bestKey;
    }
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
