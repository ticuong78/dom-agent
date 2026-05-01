import type { ContextNode } from "./ContextNode";

export class ContextTree {
  private root: ContextNode;
  private index: Map<string, ContextNode>; // contextSignature -> ContextNode

  constructor(root: ContextNode) {
    this.root = root;
    this.index = new Map();
    this.buildIndex(root);
  }

  // build flat index on construction — O(n) once, O(1) lookup forever
  private buildIndex(node: ContextNode): void {
    this.index.set(node.contextSignature, node);
    for (const child of node.children) {
      this.buildIndex(child);
    }
  }

  // --- getters ---

  getRoot(): ContextNode {
    return this.root;
  }

  getBySignature(contextSignature: string): ContextNode | undefined {
    return this.index.get(contextSignature);
  }

  getById(id: string): ContextNode | undefined {
    for (const node of this.index.values()) {
      if (node.id === id) return node;
    }
    return undefined;
  }

  has(contextSignature: string): boolean {
    return this.index.has(contextSignature);
  }

  size(): number {
    return this.index.size;
  }

  // --- traversal ---

  // walk every node in DFS order, call callback on each
  walk(callback: (node: ContextNode) => void): void {
    this.walkNode(this.root, callback);
  }

  private walkNode(
    node: ContextNode,
    callback: (node: ContextNode) => void,
  ): void {
    callback(node);
    for (const child of node.children) {
      this.walkNode(child, callback);
    }
  }

  // --- comparison helpers ---

  // returns all signatures in this tree — used for diffing against another tree
  signatures(): Set<string> {
    return new Set(this.index.keys());
  }
}
