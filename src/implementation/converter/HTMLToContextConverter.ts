import { analyzeAttributes, ContextNode, type ValueType } from "@core/context";

import {
  ContextTree,
  type HashAdapter,
  type HTMLNode,
  type IDAdapter,
} from "../../core";
import { UUIDAdapter } from "@adapters/id";
import { SHA256HashAdapter } from "@adapters/hash";

type ParentSurface = {
  tagName: string;
  attributeCount: number;
  depth: number;
};

/**
 * Converts a raw {@link HTMLNode} tree into an indexed {@link ContextTree}.
 *
 * This is the bridge between the parsing layer (adapters) and the analysis
 * layer (comparers, viewers, sentinels). It walks the HTMLNode tree recursively,
 * enriching each node with computed metadata (depth, height, attribute analysis,
 * text hashing, parent surface) and assembling the result into a ContextTree.
 *
 * @example
 * ```ts
 * const adapter = new CheerioAdapter();
 * const converter = new HTMLToContextConverter(new UUIDAdapter(), new SHA256HashAdapter());
 *
 * const htmlNode = adapter.parse("<div><p>Hello</p></div>");
 * const tree = converter.convert(htmlNode!);
 * // tree.size() === 2 (div + p)
 * ```
 */
export class HTMLToContextConverter {
  private hasher: HashAdapter;
  private idGenerator: IDAdapter;

  /**
   * @param idGenerator - An {@link IDAdapter} for generating unique node IDs.
   * @param hasher - A {@link HashAdapter} for hashing text content and computing treeId.
   */
  constructor(
    idGenerator: IDAdapter = new UUIDAdapter(),
    hasher: HashAdapter = new SHA256HashAdapter(),
  ) {
    this.idGenerator = idGenerator;
    this.hasher = hasher;
  }

  /**
   * Converts an {@link HTMLNode} tree into a {@link ContextTree}.
   *
   * Only nodes of type `"tag"` are included. Text, comment, script, and
   * style nodes are skipped (their text content is captured via `directText`
   * on their parent).
   *
   * @param currentNode - The root HTMLNode to start conversion from.
   * @param depth - Starting depth (defaults to 0 for the root).
   * @returns A fully indexed {@link ContextTree}, or `null` if the root is not a tag node.
   */
  convert(currentNode: HTMLNode, depth: number = 0) {
    const root = this._convert(currentNode, depth, null);
    return root ? new ContextTree(root, this.hasher) : null;
  }

  private _convert(
    currentNode: HTMLNode,
    depth: number = 0,
    parentSurface: ParentSurface | null = null,
  ): ContextNode | null {
    if (currentNode.type !== "tag") return null;

    const id = this.idGenerator.generate();

    const currentAttributeCount = Object.keys(
      analyzeAttributes(currentNode.attributes),
    ).length;

    const currentSurface: ParentSurface = {
      tagName: currentNode.tagName,
      attributeCount: currentAttributeCount,
      depth,
    };

    const childNodes: ContextNode[] = currentNode.children
      .map((child) => this._convert(child, depth + 1, currentSurface))
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
      hasher: this.hasher.hash,
      parentTagName: parentSurface?.tagName ?? null,
      parentAttributeCount: parentSurface?.attributeCount ?? null,
      parentDepth: parentSurface?.depth ?? null,
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
