import type { ContextNode } from "../atoms";

export class ContextTree {
  private root: ContextNode;

  private byContext: Map<string, ContextNode> = new Map();
  private byNode: Map<string, ContextNode[]> = new Map();
  private byInner: Map<string, ContextNode[]> = new Map();

  constructor(root: ContextNode) {
    this.root = root;
    this.walk(root);
  }

  private walk(node: ContextNode): void {
    // primary — unique per node (vị trí + bề mặt + subtree)
    this.byContext.set(node.contextSignature, node);

    // secondary — có thể trùng, nhiều node cùng tag/attrs/text
    const nodeGroup = this.byNode.get(node.nodeSignature) ?? [];
    nodeGroup.push(node);
    this.byNode.set(node.nodeSignature, nodeGroup);

    // tertiary — có thể trùng, nhiều node cùng cấu trúc subtree
    const innerGroup = this.byInner.get(node.innerSignature) ?? [];
    innerGroup.push(node);
    this.byInner.set(node.innerSignature, innerGroup);

    node.children.forEach((child) => this.walk(child));
  }

  getRoot(): ContextNode {
    return this.root;
  }

  getByContext(sig: string): ContextNode | undefined {
    return this.byContext.get(sig);
  }

  getByNode(sig: string): ContextNode[] {
    return this.byNode.get(sig) ?? [];
  }

  getByInner(sig: string): ContextNode[] {
    return this.byInner.get(sig) ?? [];
  }

  hasContext(sig: string): boolean {
    return this.byContext.has(sig);
  }

  hasNode(sig: string): boolean {
    return this.byNode.has(sig);
  }

  hasInner(sig: string): boolean {
    return this.byInner.has(sig);
  }

  contextSignatures(): Set<string> {
    return new Set(this.byContext.keys());
  }

  size(): number {
    return this.byContext.size;
  }
}
