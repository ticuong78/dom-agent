import type { ContextNode, ContextTree } from "@core/context";
import type { DiffPoint, DiffViewer } from "@core/diff";

export abstract class TraceRootCauseDiffViewer implements DiffViewer {
  abstract highlight(reference: ContextTree, target: ContextTree): DiffPoint[];

  protected traceRootCause(
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
        // vẫn còn bubble-up — tiếp tục đi xuống
        const deeper = this.traceRootCause(child, target, visited);

        // HERE — nếu đi xuống cũng không ra gì, fallback SUBTREE_CHANGED tại child này
        if (deeper.length === 0) {
          points.push({
            type: "SUBTREE_CHANGED",
            referenceNode: child,
            targetNode: target.getByNode(child.nodeSignature)[0] ?? null,
          });
          visited.add(child.contextSignature);
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
      } else if (!nodeMatch && innerMatch) {
        points.push({
          type: "NODE_CHANGED",
          referenceNode: child,
          targetNode: target.getByInner(child.innerSignature)[0] ?? null,
        });
        visited.add(child.contextSignature);
      } else {
        points.push({
          type: "FULLY_CHANGED",
          referenceNode: child,
          targetNode: null,
        });
        visited.add(child.contextSignature);
      }
    }

    return points;
  }
}
