import * as cheerio from "cheerio";
import { Element, Text } from "domhandler";
import type { HTMLNode, Profile } from "../types";
import { partitionArray } from "../utils";

const EXCLUDING_KEY = "is-excluded"; // after injecting -> data-is-excluded
const ID_KEY = "htmlnode-id";

interface HTMLParser {}

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
export class CheerioParser implements HTMLParser {
  // intrigate selector patterns:
  //    relative
  //    declarative
  //    relative from parents
  //    declarative from parents

  // for 1 selector:
  //    found 0 matched element
  //    found only 1 matched element
  //    found more than 1 matched element

  // for 2+ selectors:
  //    

  /**
   * Inject data to elements in the dom
   * @param $ Cheerio's JQuery-alike alias
   * @param selectors an array of selectors' path
   * @param data an array of key-value pair. Each key represents a name of data to be added to the all matched elements by the selectors with the value. If the given name starts with a "data" prefix such as "data-is-excluded", change to "is-excluded" only to avoid duplications in data attribute's name chain
   * 
   * @returns void, successfully mutate the input DOM under the shape of $
   */
  private static _injectData(
    $: cheerio.CheerioAPI,
    selectors: string[], // need to check for this, since user's input should be checked
    data: Record<string, any>, // happy case: non-data-prefix in the name, edge case: with "data" prefix in the name
    // happy case: is-excluded
    // edge case: data-is-excluded. The data prefix should be replace with empty space.
  ) {
    for (const selector of selectors) {
      $(selector).each((i, el) => {
        $(el).data(String(data[0]).replaceAll("data-", ""), data[1]); // loai bo bat ky prefix data- nao de tranh unexpected behaviour
      });
    }
  }

  /**
   * Parses a raw HTML string into a normalized HTMLNode tree.
   * Returns the first direct child of <body> as the root node.
   *
   * @param html - A valid HTML string to parse
   * @param ignore - An array of valid selectors of elements to be ignored in the comparing process
   * @returns The root HTMLNode, or null if <body> has no children
   */
  static parse(html: string, profiles: Profile[] = []): HTMLNode {
    const $ = cheerio.load(html);

    const [inclusions, exclusions] = partitionArray(
      profiles,
      (profile: Profile) => {
        return !profile.isExcluded;
      },
    );

    this._injectData(
      // injecting excluding flag
      $,
      exclusions.map((el) => el.selector),
      [EXCLUDING_KEY, true],
    );

    profiles.forEach((profile) => {
      this._injectData(
        // injecting ids
        $,
        inclusions.map((el) => el.selector),
        [ID_KEY, profile.id],
      );
    });

    // this._injectNeedCheckData(, unused but may need for later, therefore, were commented
    //   $,
    //   inclusions.map((el) => el.selector),
    // );

    const body = $("body").children().first().get(0);

    if (!body)
      throw new Error("Cannot parse your html content. Please check again.");

    return this._normalize($, body as Element);
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
  private static _normalize($: cheerio.CheerioAPI, el: Element): HTMLNode {
    const children = el.children
      .filter((c) => c.type === "tag") // get rid of non-tag element
      .map((c) => this._normalize($, c as Element)); // post-order

    const isExcluded: boolean = Boolean($(el).data(EXCLUDING_KEY));
    const passingId: string = String($(el).data(ID_KEY));

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
      passingId,
      type: "tag",
      tagName: el.name,
      attributes: el.attribs,
      children,
      siblingCount,
      nthChild,
      directText,
      isExcluded,
    };
  }
}
