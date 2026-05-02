import type { ContextNode, ContextTree } from "@core/context";
import type { DiffPoint, DiffType, DiffViewer } from "@core/diff";

export type TreeHierarchyDiffType = DiffType | "REORDERED" | "REPARENTED";

type Pair = [ContextNode, ContextNode];

export class TreeHierarchyDiffViewer implements DiffViewer<TreeHierarchyDiffType> {
  highlight(
    reference: ContextTree,
    target: ContextTree,
  ): DiffPoint<TreeHierarchyDiffType>[] {
    const points: DiffPoint<TreeHierarchyDiffType>[] = [];

    const allSigs = reference
      .comparableNodeSignatures()
      .union(target.comparableNodeSignatures());

    for (const sig of allSigs) {
      const refList = reference.getByComparableNodeSignature(sig);
      const tarList = target.getByComparableNodeSignature(sig);

      const { pairs, refLeft, tarLeft } = this.pairByPosition(refList, tarList);

      for (const [r, t] of pairs) {
        points.push(...this.classifyPair(r, t));
      }

      for (const r of refLeft) {
        points.push({ type: "DELETED", referenceNode: r, targetNode: null });
      }

      for (const t of tarLeft) {
        points.push({ type: "ADDED", referenceNode: null, targetNode: t });
      }
    }

    return points;
  }

  private classifyPair(
    r: ContextNode,
    t: ContextNode,
  ): DiffPoint<TreeHierarchyDiffType>[] {
    if (
      r.positioningSignature === t.positioningSignature &&
      r.parentSignature === t.parentSignature
    ) {
      return [];
    }

    if (r.depth !== t.depth || r.parentSignature !== t.parentSignature) {
      return [
        {
          type: "REPARENTED",
          referenceNode: r,
          targetNode: t,
          referenceParentNode: r.parent,
          targetParentNode: t.parent,
        },
      ];
    }

    if (r.nthChild !== t.nthChild) {
      return [{ type: "REORDERED", referenceNode: r, targetNode: t }];
    }

    return [];
  }

  private pairByPosition(
    refList: ContextNode[],
    tarList: ContextNode[],
  ): { pairs: Pair[]; refLeft: ContextNode[]; tarLeft: ContextNode[] } {
    const refUsed = new Set<ContextNode>();
    const tarUsed = new Set<ContextNode>();
    const pairs: Pair[] = [];

    const tarByPos = new Map<string, ContextNode[]>();
    for (const t of tarList) {
      const stableKey = `${t.parentSignature ?? "ROOT"}|${t.positioningSignature}`;
      const bucket = tarByPos.get(stableKey) ?? [];
      bucket.push(t);
      tarByPos.set(stableKey, bucket);
    }

    for (const r of refList) {
      const stableKey = `${r.parentSignature ?? "ROOT"}|${r.positioningSignature}`;
      const bucket = tarByPos.get(stableKey);
      if (!bucket) continue;
      const t = bucket.find((n) => !tarUsed.has(n));
      if (!t) continue;
      pairs.push([r, t]);
      refUsed.add(r);
      tarUsed.add(t);
    }

    const refRemaining = refList.filter((r) => !refUsed.has(r));
    const tarRemaining = tarList.filter((t) => !tarUsed.has(t));

    for (const r of refRemaining) {
      let best: ContextNode | null = null;
      let bestDist = Infinity;

      for (const t of tarRemaining) {
        if (tarUsed.has(t)) continue;
        const dist =
          (r.parentSignature === t.parentSignature ? 0 : 1000) +
          Math.abs(r.depth - t.depth) * 100 +
          Math.abs(r.nthChild - t.nthChild);
        if (dist < bestDist) {
          bestDist = dist;
          best = t;
        }
      }

      if (best) {
        pairs.push([r, best]);
        refUsed.add(r);
        tarUsed.add(best);
      }
    }

    return {
      pairs,
      refLeft: refList.filter((r) => !refUsed.has(r)),
      tarLeft: tarList.filter((t) => !tarUsed.has(t)),
    };
  }
}
