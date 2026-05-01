import * as cheerio from "cheerio";
import { Element } from "domhandler";
import { randomUUID, createHash } from "crypto";
import type { DOMNode } from "../core/DOMNode";

interface Traverser {
  traverse(
    root: cheerio.Cheerio<Element>,
    depth?: number,
    parentId?: string | null,
  ): DOMNode | null;
}

export class CheerioRecursiveTraverser implements Traverser {
  private $: cheerio.CheerioAPI;

  constructor($: cheerio.CheerioAPI) {
    this.$ = $;
  }

  traverse(
    root: cheerio.Cheerio<Element>,
    depth: number = 0,
    parentId: string | null = null,
  ): DOMNode | null {
    const el = root.get(0);
    if (!el || el.type !== "tag") return null;

    const id = randomUUID();

    // get direct tag children only — skip text nodes and comments
    const rawChildren = root
      .children()
      .toArray()
      .filter((c) => c.type === "tag") as Element[];

    // sibling info — computed before recursing
    const siblingCount = root
      .siblings()
      .toArray()
      .filter((s) => s.type === "tag").length;

    const nthChild = root
      .prevAll()
      .toArray()
      .filter((s) => s.type === "tag").length;

    // DFS — recurse into children first (post-order)
    const childNodes: DOMNode[] = rawChildren
      .map((child) =>
        this.traverse(this.$(child) as cheerio.Cheerio<Element>, depth + 1, id),
      )
      .filter((n): n is DOMNode => n !== null);

    // backtrack — link siblings now that all children are built
    childNodes.forEach((node, index) => {
      node.previousSiblingId = index > 0 ? childNodes[index - 1].id : null;
      node.nextSiblingId =
        index < childNodes.length - 1 ? childNodes[index + 1].id : null;
    });

    // backtrack — height only computable after children are done
    const height =
      childNodes.length === 0
        ? 0
        : Math.max(...childNodes.map((c) => c.height)) + 1;

    // backtrack — signatures
    const outerSignature = createHash("sha256")
      .update(el.name + JSON.stringify(el.attribs))
      .digest("hex");

    const innerSignature = createHash("sha256")
      .update(childNodes.map((c) => c.innerSignature).join(""))
      .digest("hex");

    return {
      id,
      tagName: el.name,
      attributes: el.attribs,
      attributeCount: Object.keys(el.attribs).length,
      depth,
      height,
      childCount: childNodes.length,
      siblingCount,
      nthChild,
      parentId,
      previousSiblingId: null, // linked by parent after this call
      nextSiblingId: null, // linked by parent after this call
      ordered: true, // default — will come from config later
      children: childNodes,
      outerSignature,
      innerSignature,
    };
  }
}
