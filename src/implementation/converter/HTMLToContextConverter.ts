import type { ValueType } from "@core/context";
import {
  type HashAdapter,
  type IDAdapter,
  type HTMLNode,
  type ContextNode,
} from "../../core";

import { ContextTree } from "../../core";

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

    const childNodes: ContextNode[] = currentNode.children
      .map((child) => this._convert(child, depth + 1))
      .filter((n): n is ContextNode => n !== null);

    const height =
      childNodes.length === 0
        ? 0
        : Math.max(...childNodes.map((c) => c.height)) + 1;

    // HERE — build attributeFingerprints instead of storing raw attribute values
    const attributeFingerprints: Record<string, ValueType> = Object.fromEntries(
      Object.entries(currentNode.attributes).map(([key, value]) => [
        key,
        {
          numberOfValues: value.split(/[\s,;]+/).filter(Boolean).length,
          totalLength: value.length,
        },
      ]),
    );

    const attrPairs = Object.values(attributeFingerprints)
      .map((v) => `${v.numberOfValues}:${v.totalLength}`)
      .sort()
      .join(",");

    const nodeSignature = [
      currentNode.tagName,
      Object.keys(attributeFingerprints).length,
      attrPairs, // HERE — thay thế sortedAttrKeys
      currentNode.directText.length,
    ].join("|");

    const innerSignature = this.hasher
      .hash(
        childNodes.length === 0
          ? currentNode.directText
          : childNodes.map((c) => c.nodeSignature + c.innerSignature).join("") +
              currentNode.directText,
      )
      .slice(0, 12);

    // HERE — contextSignature is now computed (was empty string "")
    const contextSignature = [
      `${depth}:${currentNode.nthChild}/${currentNode.siblingCount}`,
      nodeSignature,
      innerSignature,
    ].join("|");

    const contextNode: ContextNode = {
      id,
      tagName: currentNode.tagName,
      attributeFingerprints,
      attributeCount: Object.keys(currentNode.attributes).length,
      directText: currentNode.directText,
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
      innerSignature,
      contextSignature,
      capturedAt: new Date(),
    };

    contextNode.children.forEach((child, index) => {
      child.parent = contextNode;
      child.previousSibling = index > 0 ? childNodes[index - 1]! : null;
      child.nextSibling =
        index < childNodes.length - 1 ? childNodes[index + 1]! : null;
    });

    return contextNode;
  }
}
