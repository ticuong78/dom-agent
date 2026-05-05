import type { HTMLNode } from "./HTMLNode";

/**
 * Adapter interface for parsing raw HTML strings into an {@link HTMLNode} tree.
 *
 * Implementations wrap a specific parsing library (e.g. Cheerio, JSDOM)
 * and normalize its output into the dom-agent's internal representation.
 *
 * @example
 * ```ts
 * const adapter: HTMLAdapter = new CheerioAdapter();
 * const root = adapter.parse("<div><p>Hello</p></div>");
 * // root.tagName === "div"
 * // root.children[0].tagName === "p"
 * ```
 */
export interface HTMLAdapter {
  /**
   * Parses an HTML string and returns the root {@link HTMLNode}.
   *
   * @param html - Raw HTML string to parse.
   * @returns The root node of the parsed tree, or `null` if parsing fails
   *          or the input contains no tag elements.
   */
  parse(html: string): HTMLNode | null;
}
