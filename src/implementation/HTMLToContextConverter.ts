import {
  type HashAdapter,
  type IDAdapter,
  type HTMLNode,
  type ContextNode,
} from "../core";

import { ContextTree } from "../core";

export class HTMLToContextConverter {
  private hasher: HashAdapter;
  private idGenerator: IDAdapter;

  constructor(hasher: HashAdapter, idGenerator: IDAdapter) {
    this.hasher = hasher;
    this.idGenerator = idGenerator;
  }

  convert(currentNode: HTMLNode, depth: number = 0) {
    const root = this._convert(currentNode, depth);

    return root ? new ContextTree(root) : null;
  }

  private _convert(
    currentNode: HTMLNode,
    depth: number = 0,
  ): ContextNode | null {
    if (currentNode.type !== "tag") return null;

    const id = this.idGenerator.generate();

    // DFS — recurse into children first (post-order)
    const childNodes: ContextNode[] = currentNode.children
      .map((child) => this._convert(child, depth + 1))
      .filter((n): n is ContextNode => n !== null);

    // backtrack — height only computable after children are done
    const height =
      childNodes.length === 0
        ? 0
        : Math.max(...childNodes.map((c) => c.height)) + 1;

    // sorted attributes — deterministic hashing
    const sortedAttribs = Object.fromEntries(
      Object.entries(currentNode.attributes).sort(([a], [b]) =>
        a.localeCompare(b),
      ),
    );

    // backtrack — signatures
    const nodeSignature = this.hasher.hash(
      currentNode.tagName + JSON.stringify(sortedAttribs),
    );

    const innerNodeSignature = this.hasher.hash(
      childNodes.length === 0
        ? currentNode.directText
        : childNodes
            .map((c) => c.nodeSignature + c.innerNodeSignature)
            .join("") + currentNode.directText,
    );

    const contextSignature = this.hasher.hash(
      nodeSignature +
        innerNodeSignature +
        depth +
        height +
        childNodes.length +
        currentNode.siblingCount +
        currentNode.nthChild,
    );

    const contextNode: ContextNode = {
      id,
      tagName: currentNode.tagName,
      attributes: currentNode.attributes, // consists of unstable class names, need an update for this - CRITICAL
      attributeCount: Object.keys(currentNode.attributes).length,
      depth,
      height,
      childCount: childNodes.length,
      siblingCount: currentNode.siblingCount,
      nthChild: currentNode.nthChild,
      parent: null,
      previousSibling: null,
      nextSibling: null,
      children: childNodes,
      nodeSignature,
      innerNodeSignature,
      contextSignature,
      capturedAt: new Date(),
    };

    // backtrack — link siblings and parent
    contextNode.children.forEach((node, index) => {
      node.previousSibling = index > 0 ? childNodes[index - 1]! : null;
      node.nextSibling =
        index < childNodes.length - 1 ? childNodes[index + 1]! : null;
      node.parent = contextNode;
    });

    return contextNode;
  }
}
