import type { ValueType } from "@core/context";
import {
  type HashAdapter,
  type IDAdapter,
  type HTMLNode,
  type ContextNode,
} from "../../core";

import { ContextTree } from "../../core";

const IGNORED_ATTRIBUTES = new Set<string>(["class"]);

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

  private toComparableSignature(
    nodeSignature: string,
    attributeCount: number,
  ): string {
    if (attributeCount === 0) {
      return nodeSignature;
    }

    const [tagName, attrCount, attrShapes] = nodeSignature.split("|");
    return [tagName, attrCount, attrShapes, ""].join("|");
  }

  private _convert(
    currentNode: HTMLNode,
    depth: number = 0,
    parentSignature: string | null = null,
  ): ContextNode | null {
    if (currentNode.type !== "tag") return null;

    const id = this.idGenerator.generate();

    const significantAttributes = Object.fromEntries(
      Object.entries(currentNode.attributes).filter(
        ([key]) => !IGNORED_ATTRIBUTES.has(key),
      ),
    );

    const attributeFingerprints: Record<string, ValueType> = Object.fromEntries(
      Object.entries(significantAttributes).map(([key, value]) => [
        key,
        {
          numberOfValues: value.split(/[\s,;]+/).filter(Boolean).length,
          totalLength: value.length,
        },
      ]),
    );

    const attrShapes = Object.entries(attributeFingerprints)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => `${v.numberOfValues}:${v.totalLength}`)
      .join(",");

    const nodeSignature = [
      currentNode.tagName,
      Object.keys(attributeFingerprints).length,
      attrShapes,
      this.hasher.hash(currentNode.directText).slice(0, 12),
    ].join("|");
    const comparableNodeSignature = this.toComparableSignature(
      nodeSignature,
      Object.keys(attributeFingerprints).length,
    );

    const childNodes: ContextNode[] = currentNode.children
      .map((child) => this._convert(child, depth + 1, comparableNodeSignature))
      .filter((n): n is ContextNode => n !== null);

    const height =
      childNodes.length === 0
        ? 0
        : Math.max(...childNodes.map((c) => c.height)) + 1;

    const innerSignature = this.hasher
      .hash(
        childNodes.length === 0
          ? currentNode.directText
          : childNodes.map((c) => c.nodeSignature + c.innerSignature).join("") +
              currentNode.directText,
      )
      .slice(0, 12);

    const positioningSignature = `${depth}:${currentNode.nthChild}/${currentNode.siblingCount}`;

    const contextNode: ContextNode = {
      id,
      tagName: currentNode.tagName,
      attributeFingerprints,
      attribute: currentNode.attributes,
      attributeCount: Object.keys(significantAttributes).length,
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
      positioningSignature,
      parentSignature,
      // capturedAt: new Date(),
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
