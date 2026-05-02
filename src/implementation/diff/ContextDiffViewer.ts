import type { ContextTree } from "@core/context";
import type { DiffPoint, DiffViewer } from "@core/diff";

/**
 * ContextDiffViewer — pair từng signature trong `lost` (chỉ ở reference)
 * với một signature trong `gained` (chỉ ở target) theo thứ tự ưu tiên:
 *
 *   1. RELOCATED        — cùng nodeSig & cùng innerSig (CÙNG MỘT target node)
 *   2. SUBTREE_CHANGED  — cùng nodeSig, khác innerSig
 *   3. NODE_CHANGED     — khác nodeSig, cùng innerSig
 *   4. FULLY_CHANGED    — chỉ cùng structuralSignature (skeleton)
 *   5. DELETED          — không match được mức nào → ref node coi như đã bị xóa
 *
 * Pass cuối: bất kỳ `gained` nào chưa được pair → ADDED.
 */
export class ContextDiffViewer implements DiffViewer {
  highlight(reference: ContextTree, target: ContextTree): DiffPoint[] {
    const lost = reference
      .contextSignatures()
      .difference(target.contextSignatures());
    const gained = target
      .contextSignatures()
      .difference(reference.contextSignatures());

    if (lost.size === 0 && gained.size === 0) return [];

    // Index gained (chứa contextSignature của target nodes) theo từng secondary key.
    const gainedByNode = new Map<string, Set<string>>();
    const gainedByInner = new Map<string, Set<string>>();
    const gainedByStructural = new Map<string, Set<string>>();

    for (const sig of gained) {
      const node = target.getByContext(sig)!;
      this.indexAdd(gainedByNode, node.nodeSignature, sig);
      this.indexAdd(gainedByInner, node.innerSignature, sig);
      this.indexAdd(gainedByStructural, node.structuralSignature, sig);
    }

    // Xử lý lost shallowest-first: cha pair trước con, hạn chế report chồng lấn.
    const lostSorted = [...lost].sort(
      (a, b) =>
        reference.getByContext(a)!.depth - reference.getByContext(b)!.depth,
    );

    const points: DiffPoint[] = [];
    const paired = new Set<string>(); // contextSignature của target nodes đã được consume

    for (const refSig of lostSorted) {
      const refNode = reference.getByContext(refSig)!;

      const nodeCandidate = this.firstUnpaired(
        gainedByNode.get(refNode.nodeSignature),
        paired,
      );
      const innerCandidate = this.firstUnpaired(
        gainedByInner.get(refNode.innerSignature),
        paired,
      );

      // (1) RELOCATED — bắt buộc nodeCandidate VÀ innerCandidate cùng trỏ về 1 target node.
      // Trường hợp 2 candidate khác nhau: pair ưu tiên SUBTREE_CHANGED ở dưới.
      if (
        nodeCandidate &&
        innerCandidate &&
        nodeCandidate === innerCandidate
      ) {
        points.push({
          type: "RELOCATED",
          referenceNode: refNode,
          targetNode: target.getByContext(nodeCandidate)!,
        });
        paired.add(nodeCandidate);
        continue;
      }

      // (2) SUBTREE_CHANGED — surface preserved, subtree đổi.
      if (nodeCandidate) {
        points.push({
          type: "SUBTREE_CHANGED",
          referenceNode: refNode,
          targetNode: target.getByContext(nodeCandidate)!,
        });
        paired.add(nodeCandidate);
        continue;
      }

      // (3) NODE_CHANGED — surface đổi, subtree preserved.
      if (innerCandidate) {
        points.push({
          type: "NODE_CHANGED",
          referenceNode: refNode,
          targetNode: target.getByContext(innerCandidate)!,
        });
        paired.add(innerCandidate);
        continue;
      }

      // (4) FULLY_CHANGED — chỉ còn match structural skeleton.
      const structuralCandidate = this.firstUnpaired(
        gainedByStructural.get(refNode.structuralSignature),
        paired,
      );
      if (structuralCandidate) {
        points.push({
          type: "FULLY_CHANGED",
          referenceNode: refNode,
          targetNode: target.getByContext(structuralCandidate)!,
        });
        paired.add(structuralCandidate);
        continue;
      }

      // (5) DELETED — không có dấu vết trong target.
      points.push({
        type: "DELETED",
        referenceNode: refNode,
        targetNode: null,
      });
    }

    // ADDED — tất cả gained chưa được pair.
    for (const tarSig of gained) {
      if (!paired.has(tarSig)) {
        points.push({
          type: "ADDED",
          referenceNode: null,
          targetNode: target.getByContext(tarSig)!,
        });
      }
    }

    return points;
  }

  private indexAdd(
    map: Map<string, Set<string>>,
    key: string,
    value: string,
  ): void {
    let bucket = map.get(key);
    if (!bucket) {
      bucket = new Set();
      map.set(key, bucket);
    }
    bucket.add(value);
  }

  private firstUnpaired(
    candidates: Set<string> | undefined,
    paired: Set<string>,
  ): string | null {
    if (!candidates) return null;
    for (const sig of candidates) {
      if (!paired.has(sig)) return sig;
    }
    return null;
  }
}
