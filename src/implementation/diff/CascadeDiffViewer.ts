import type { ContextNode } from "@core/atoms";
import type { ContextTree } from "@core/context";
import type { DiffRule, DiffViewer, DiffPoint, DiffType } from "@core/diff";

export class CascadeDiffViewer implements DiffViewer {
  private rule: DiffRule;

  constructor(rule: DiffRule) {
    this.rule = rule;
  }

  highlight(reference: ContextTree, target: ContextTree): DiffPoint[] {
    throw new Error("not implemented");

    const points: DiffPoint[] = [];
    const visited = new Set<string>(); // tránh report trùng

    for (const refSig of reference.contextSignatures()) {
      const refNode = reference.getByContext(refSig)!;

      if (target.hasContext(refSig)) continue;
      if (visited.has(refSig)) continue;

      const nodeMatch = target.hasNode(refNode.nodeSignature);
      const innerMatch = target.hasInner(refNode.innerSignature);

      if (nodeMatch && innerMatch) {
        // RELOCATED — report node này, không cần trace xuống
        points.push({
          type: "RELOCATED",
          referenceNode: refNode,
          targetNode: target.getByNode(refNode.nodeSignature)[0] ?? null,
        });
        visited.add(refSig);
      } else if (nodeMatch && !innerMatch) {
        // HERE — SUBTREE_CHANGED: node này không có lỗi
        // trace xuống tìm gốc rễ thật sự, không report node này
        const rootCauses = this.traceRootCause(refNode, target, visited);
        points.push(...rootCauses);
      } else if (!nodeMatch && innerMatch) {
        // NODE_CHANGED — bề mặt đổi nhưng subtree nguyên vẹn
        points.push({
          type: "NODE_CHANGED",
          referenceNode: refNode,
          targetNode: target.getByInner(refNode.innerSignature)[0] ?? null,
        });
        visited.add(refSig);
      } else {
        // DELETED — không tìm thấy ở đâu cả
        points.push({
          type: "DELETED",
          referenceNode: refNode,
          targetNode: null,
        });
        visited.add(refSig);
      }
    }

    // pass 2: ADDED
    for (const tarSig of target.contextSignatures()) {
      if (!reference.hasContext(tarSig)) {
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
    }

    return points;
  }

  // HERE — truy xuống tìm node thật sự gây ra SUBTREE_CHANGED
  // dừng lại khi: nodeSignature không khớp (đây là gốc rễ)
  // tiếp tục khi: nodeSignature khớp nhưng innerSignature không khớp (bị ảnh hưởng, không phải nguyên nhân)
  private traceRootCause(
    node: ContextNode,
    target: ContextTree,
    visited: Set<string>,
  ): DiffPoint[] {
    const points: DiffPoint[] = [];

    for (const child of node.children) {
      if (target.hasContext(child.contextSignature)) continue; // child không đổi
      if (visited.has(child.contextSignature)) continue;

      const nodeMatch = target.hasNode(child.nodeSignature);
      const innerMatch = target.hasInner(child.innerSignature);

      if (nodeMatch && !innerMatch) {
        // HERE — child cũng chỉ bị ảnh hưởng bubble-up, chưa phải gốc rễ
        // tiếp tục đi xuống
        points.push(...this.traceRootCause(child, target, visited));
      } else if (!nodeMatch) {
        // HERE — đây là gốc rễ: bề mặt node thay đổi
        // dù innerSignature có khớp hay không, node này là thủ phạm
        const type: DiffType = innerMatch ? "NODE_CHANGED" : "FULLY_CHANGED";
        points.push({
          type,
          referenceNode: child,
          targetNode:
            target.getByNode(child.nodeSignature)[0] ??
            target.getByInner(child.innerSignature)[0] ??
            null,
        });
        visited.add(child.contextSignature);
      } else if (nodeMatch && innerMatch) {
        // child bị RELOCATED trong quá trình trace
        points.push({
          type: "RELOCATED",
          referenceNode: child,
          targetNode: target.getByNode(child.nodeSignature)[0] ?? null,
        });
        visited.add(child.contextSignature);
      }
    }

    return points;
  }
}
