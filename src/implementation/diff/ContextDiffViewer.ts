import type { ContextNode, ContextTree } from "@core/context";
import type { DiffPoint, DiffType, DiffViewer } from "@core/diff";

export class ContextDiffViewer implements DiffViewer {
  highlight(reference: ContextTree, target: ContextTree): DiffPoint[] {
    const points: DiffPoint[] = [];
    const visited = new Set<string>();

    // --- pass 1: DELETED / CHANGED / RELOCATED ---
    const lost = reference
      .contextSignatures()
      .difference(target.contextSignatures());

    for (const refSig of lost) {
      const refNode = reference.getByContext(refSig)!;
      if (visited.has(refSig)) continue;

      const nodeMatch = target.hasNode(refNode.nodeSignature);
      const innerMatch = target.hasInner(refNode.innerSignature);

      if (nodeMatch && innerMatch) {
        points.push({
          type: "RELOCATED",
          referenceNode: refNode,
          targetNode: target.getByNode(refNode.nodeSignature)[0] ?? null,
        });
        visited.add(refSig);
        this.markDescendantsVisited(refNode, visited); // HERE — fix 2
      } else if (nodeMatch && !innerMatch) {
        const rootCauses = this.traceRootCause(refNode, target, visited);

        if (rootCauses.length === 0) {
          points.push({
            type: "SUBTREE_CHANGED",
            referenceNode: refNode,
            targetNode: target.getByNode(refNode.nodeSignature)[0] ?? null,
          });
          visited.add(refSig);
          this.markDescendantsVisited(refNode, visited); // HERE — fix 2
        } else {
          points.push(...rootCauses);
        }
      } else if (!nodeMatch && innerMatch) {
        points.push({
          type: "NODE_CHANGED",
          referenceNode: refNode,
          targetNode: target.getByInner(refNode.innerSignature)[0] ?? null,
        });
        visited.add(refSig);
        this.markDescendantsVisited(refNode, visited); // HERE — fix 2
      } else {
        points.push({
          type: "DELETED",
          referenceNode: refNode,
          targetNode: null,
        });
        visited.add(refSig);
        this.markDescendantsVisited(refNode, visited); // HERE — fix 2
      }
    }

    // --- pass 2: ADDED ---
    const gained = target
      .contextSignatures()
      .difference(reference.contextSignatures());

    for (const tarSig of gained) {
      const tarNode = target.getByContext(tarSig)!;
      const alreadyCounted =
        reference.hasNode(tarNode.nodeSignature) ||
        reference.hasInner(tarNode.innerSignature);

      if (!alreadyCounted) {
        points.push({
          type: "ADDED",
          referenceNode: null,
          targetNode: tarNode,
        });
      }
    }

    return points;
  }

  private traceRootCause(
    node: ContextNode,
    target: ContextTree,
    visited: Set<string>,
  ): DiffPoint[] {
    const points: DiffPoint[] = [];

    for (const child of node.children) {
      if (target.hasContext(child.contextSignature)) continue;
      if (visited.has(child.contextSignature)) continue;

      const nodeMatch = target.hasNode(child.nodeSignature);
      const innerMatch = target.hasInner(child.innerSignature);

      if (nodeMatch && !innerMatch) {
        const deeper = this.traceRootCause(child, target, visited);

        if (deeper.length === 0) {
          points.push({
            type: "SUBTREE_CHANGED",
            referenceNode: child,
            targetNode: target.getByNode(child.nodeSignature)[0] ?? null,
          });
          visited.add(child.contextSignature);
          this.markDescendantsVisited(child, visited); // HERE — fix 2
        } else {
          points.push(...deeper);
        }
      } else if (nodeMatch && innerMatch) {
        points.push({
          type: "RELOCATED",
          referenceNode: child,
          targetNode: target.getByNode(child.nodeSignature)[0] ?? null,
        });
        visited.add(child.contextSignature);
        this.markDescendantsVisited(child, visited); // HERE — fix 2
      } else if (!nodeMatch && innerMatch) {
        points.push({
          type: "NODE_CHANGED",
          referenceNode: child,
          targetNode: target.getByInner(child.innerSignature)[0] ?? null,
        });
        visited.add(child.contextSignature);
        this.markDescendantsVisited(child, visited); // HERE — fix 2
      } else {
        points.push({
          type: "FULLY_CHANGED",
          referenceNode: child,
          targetNode: null,
        });
        visited.add(child.contextSignature);
        this.markDescendantsVisited(child, visited); // HERE — fix 2
      }
    }

    return points;
  }

  // HERE — fix 2: đệ quy mark toàn bộ descendants vào visited
  // ngăn children của một node đã được classify bị report lại lần nữa
  private markDescendantsVisited(
    node: ContextNode,
    visited: Set<string>,
  ): void {
    for (const child of node.children) {
      visited.add(child.contextSignature);
      this.markDescendantsVisited(child, visited);
    }
  }
}
