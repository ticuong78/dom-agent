/**
 * The type of an HTML node as classified by the adapter during parsing.
 *
 * - `"tag"` — a standard HTML element (e.g. `<div>`, `<a>`)
 * - `"text"` — a raw text node
 * - `"comment"` — an HTML comment (`<!-- ... -->`)
 * - `"script"` — a `<script>` element
 * - `"style"` — a `<style>` element
 */
export type HTMLNodeType = "tag" | "text" | "comment" | "script" | "style";

/**
 * A lightweight, adapter-produced representation of a single DOM node.
 *
 * `HTMLNode` is the raw input to the conversion pipeline. It carries
 * only the information that an {@link HTMLAdapter} can extract from
 * a parsed HTML string — no computed metrics, no hashing.
 *
 * @example
 * ```ts
 * const node: HTMLNode = {
 *   type: "tag",
 *   tagName: "div",
 *   attributes: { id: "app", class: "container" },
 *   children: [],
 *   directText: "Hello world",
 *   siblingCount: 3,
 *   nthChild: 0,
 * };
 * ```
 */
export type HTMLNode = {
  /** The classified type of this node. Only `"tag"` nodes are converted into {@link ContextNode}. */
  type: HTMLNodeType;

  /** The lowercase tag name (e.g. `"div"`, `"span"`, `"table"`). */
  tagName: string;

  /** All attributes on this element as key-value pairs. */
  attributes: Record<string, string>;

  /** Direct child nodes of type `"tag"` (pre-filtered by the adapter). */
  children: HTMLNode[];

  /** Concatenated text content directly owned by this node (not inherited from children). */
  directText: string;

  /** Total number of sibling elements sharing the same parent. */
  siblingCount: number;

  /** Zero-based index of this node among its siblings. */
  nthChild: number;
};
