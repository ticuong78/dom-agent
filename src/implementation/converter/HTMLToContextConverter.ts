import { analyzeAttributes, ContextNode, type ValueType } from "@core/context";

import {
  ContextTree,
  type HashAdapter,
  type HTMLNode,
  type IDAdapter,
} from "../../core";

type ParentSurface = {
  tagName: string;
  attributeCount: number;
  depth: number;
};

export class HTMLToContextConverter {
  private hasher: HashAdapter;
  private idGenerator: IDAdapter;

  constructor(idGenerator: IDAdapter, hasher: HashAdapter) {
    this.idGenerator = idGenerator;
    this.hasher = hasher;
  }

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

    // Compute this node's surface before recursing so children can reference it
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
