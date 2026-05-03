import type { ContextNode } from "../atoms";

export class ContextTree {
  private root: ContextNode;
  private byCompositeKey: Map<string, ContextNode> = new Map();
  private allNodes: ContextNode[] = [];

  constructor(root: ContextNode) {
    this.root = root;
    this.index(root);
  }

  private index(node: ContextNode): void {
    this.byCompositeKey.set(ContextTree.compositeKey(node), node);
    this.allNodes.push(node);
    node.children.forEach((child) => this.index(child));
  }

  static compositeKey(node: ContextNode): string {
    return [
      `${node.depth}:${node.nthChild}/${node.siblingCount}`,
      node.tagName,
      node.attributeCount,
      node.directTextHash,
    ].join("|");
  }

  getRoot(): ContextNode {
    return this.root;
  }

  getByCompositeKey(key: string): ContextNode | undefined {
    return this.byCompositeKey.get(key);
  }

  compositeKeys(): Set<string> {
    return new Set(this.byCompositeKey.keys());
  }

  /**
   * Returns all nodes in the tree (pre-order traversal).
   */
  nodes(): ContextNode[] {
    return this.allNodes;
  }

  size(): number {
    return this.byCompositeKey.size;
  }
}
