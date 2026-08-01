import { ContextNode, ContextTree } from "./context";
import type { HTMLNode } from "../types";
import { defaultHash, type HashFn } from "../utils";

type ParentSurface = {
  tagName: string;
  attributeCount: number;
  depth: number;
};

/**
 * Converts a raw {@link HTMLNode} tree into an indexed {@link ContextTree}.
 *
 * Walks the HTMLNode tree recursively, enriching each node with computed
 * metadata (depth, height, attribute analysis, text hashing, parent surface)
 * and assembling the result into a ContextTree.
 *
 * @example
 * ```ts
 * const converter = new ContextConverter();
 * const tree = converter.convert(adapter.parse(html)!);
 * ```
 */
export class ContextConverter {
  private readonly hash: HashFn;
  private counter = 0;

  /**
   * @param hash - Optional hash function for text content and treeId.
   *               Defaults to SHA-256. Any `(string) => string` works.
   */
  constructor(hash: HashFn = defaultHash) {
    this.hash = hash;
  }

  /**
   * Converts an {@link HTMLNode} tree into a {@link ContextTree}.
   *
   * Only `"tag"` nodes are included. Text, comment, script, and style
   * nodes are skipped (their content is captured via `directText`).
   *
   * @param currentNode - The root HTMLNode to start conversion from.
   * @param depth - Starting depth (defaults to 0 for the root).
   * @returns A fully indexed ContextTree, or `null` if the root is not a tag.
   */
  convert(currentNode: HTMLNode, depth: number = 0) {
    this.counter = 0;

    const root = this._convert(currentNode, depth, null);

    return new ContextTree(root, this.hash);
  }

  private _convert(
    currentNode: HTMLNode,
    depth: number,
    parentSurface: ParentSurface | null, // trong trường hợp có thể parse được parent, không thì thôi
  ): ContextNode {
    if (currentNode.type !== "tag")
      throw new Error("Does not support parse any element but tag.");

    const id = currentNode.passingId ?? String(this.counter++); // neu passingId duoc define thi khong dung String counter

    // Count attributes directly — avoids calling analyzeAttributes() twice
    const currentAttributeCount = Object.keys(currentNode.attributes).length;

    const currentSurface: ParentSurface = {
      tagName: currentNode.tagName,
      attributeCount: currentAttributeCount,
      depth,
    };

    const childNodes: ContextNode[] = currentNode.children
      .map((child) => this._convert(child, depth + 1, currentSurface)) // post-order
      .filter((n): n is ContextNode => n !== null);

    const height =
      childNodes.length === 0
        ? 0
        : Math.max(...childNodes.map((c) => c.height)) + 1;

    const contextNode = new ContextNode({
      id,
      tagName: currentNode.tagName,
      attributes: currentNode.attributes,
      directText: currentNode.directText,
      depth,
      childCount: childNodes.length,
      siblingCount: currentNode.siblingCount,
      nthChild: currentNode.nthChild,
      height,
      children: childNodes,
      hasher: this.hash,
      parentTagName: parentSurface?.tagName ?? null, // dùng để lưu, đỡ phải truy vấn ngược về parent lúc sau
      parentAttributeCount: parentSurface?.attributeCount ?? null, // dùng để lưu, đỡ phải truy vấn ngược về parent lúc sau
      parentDepth: parentSurface?.depth ?? null, // dùng để lưu, đỡ phải truy vấn ngược về parent lúc sau
      isExcluded: currentNode.isExcluded,
    });

    contextNode.children.forEach((child, index) => {
      child.parent = contextNode;
      child.previousSibling = index > 0 ? childNodes[index - 1]! : null;
      child.nextSibling =
        index < childNodes.length - 1 ? childNodes[index + 1]! : null;
    });

    return contextNode;
  }
}
