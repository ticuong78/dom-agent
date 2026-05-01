import * as cheerio from "cheerio";
import { Element, Text } from "domhandler";
import type { HTMLNode } from "../../core/plain/HTMLNode";
import type { HTMLAdapter } from "../../core/plain/HTMLAdapter";

/**
 * Adapter that normalizes raw HTML strings into HTMLNode trees
 * using the Cheerio parsing library.
 *
 * This adapter is responsible for bridging the gap between Cheerio's
 * internal Element representation and the library-agnostic HTMLNode
 * structure used by the core conversion layer.
 *
 * It is NOT responsible for converting HTMLNode into ContextNode —
 * that is the responsibility of HTMLToContextConverter.
 *
 * @example
 * const adapter = new CheerioAdapter();
 * const root = adapter.parse("<div class='foo'>Hello</div>");
 * // root.tagName === "div"
 * // root.attributes === { class: "foo" }
 * // root.directText === "Hello"
 *
 * @see HTMLToContextConverter — for converting HTMLNode into ContextNode
 * @see HTMLAdapter — the interface this class implements
 */
export class CheerioAdapter implements HTMLAdapter {
  /**
   * Parses a raw HTML string into a normalized HTMLNode tree.
   * Returns the first direct child of <body> as the root node.
   *
   * @param html - A valid HTML string to parse
   * @returns The root HTMLNode, or null if <body> has no children
   */
  parse(html: string): HTMLNode | null {
    const $ = cheerio.load(html);
    const body = $("body").children().first().get(0);
    if (!body) return null;
    return this.normalize($, body as Element);
  }

  /**
   * Recursively normalizes a Cheerio Element into an HTMLNode.
   * Extracts tag name, attributes, direct text, children,
   * sibling count, and nth-child position.
   *
   * @param $ - The CheerioAPI instance
   * @param el - The raw Cheerio Element to normalize
   * @returns A normalized HTMLNode
   */
  private normalize($: cheerio.CheerioAPI, el: Element): HTMLNode {
    const children = el.children
      .filter((c) => c.type === "tag")
      .map((c) => this.normalize($, c as Element));

    const directText = el.children
      .filter((c) => c.type === "text")
      .map((c) => (c as Text).data.trim())
      .filter(Boolean)
      .join(" ");

    const tagSiblings = el.parent
      ? el.parent.children.filter((c) => c.type === "tag")
      : [];

    const siblingCount = tagSiblings.length - 1; // exclude self
    const nthChild = tagSiblings.indexOf(el); // 0-indexed position

    return {
      type: "tag",
      tagName: el.name,
      attributes: el.attribs,
      children,
      siblingCount,
      nthChild,
      directText,
    };
  }
}
