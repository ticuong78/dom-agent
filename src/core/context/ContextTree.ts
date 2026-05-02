import type { ContextNode } from "../atoms";

export class ContextTree {
  private root: ContextNode;

  private byCompositeKey: Map<string, ContextNode> = new Map();
  private byComparableNodeSignature: Map<string, ContextNode[]> = new Map();

  constructor(root: ContextNode) {
    this.root = root; // giữ root chỉ để sau này tạo một persistent snapshot lưu vào disk
    this.walk(root);
  }

  private walk(node: ContextNode): void {
    this.byCompositeKey.set(ContextTree.compositeKey(node), node);

    const comparableNodeSignature = ContextTree.comparableNodeSignature(node);
    const comparableGroup =
      this.byComparableNodeSignature.get(comparableNodeSignature) ?? [];
    comparableGroup.push(node);
    this.byComparableNodeSignature.set(
      comparableNodeSignature,
      comparableGroup,
    );

    node.children.forEach((child) => this.walk(child));
  }

  static compositeKey(node: ContextNode): string {
    return `${node.positioningSignature}|${node.nodeSignature}|${node.innerSignature}`;
  }

  static comparableNodeSignature(node: ContextNode): string {
    if (node.attributeCount === 0) {
      return node.nodeSignature;
    }

    const [tagName, attrCount, attrShapes] = node.nodeSignature.split("|");
    return [tagName, attrCount, attrShapes, ""].join("|");
  }

  getRoot(): ContextNode {
    return this.root;
  }

  getByCompositeKey(key: string): ContextNode | undefined {
    return this.byCompositeKey.get(key);
  }

  getByComparableNodeSignature(key: string): ContextNode[] {
    return this.byComparableNodeSignature.get(key) ?? [];
  }

  compositeKeys(): Set<string> {
    return new Set(this.byCompositeKey.keys());
  }

  comparableNodeSignatures(): Set<string> {
    return new Set(this.byComparableNodeSignature.keys());
  }

  size(): number {
    return this.byCompositeKey.size;
  }
}
