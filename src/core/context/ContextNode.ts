import type { ISerializable } from "@core/interface";

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
    };
  }
}
