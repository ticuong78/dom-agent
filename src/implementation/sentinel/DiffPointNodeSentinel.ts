import type { ContextTree } from "@core/context";
import type { DiffPoint } from "@core/diff";
import type { NodeSentinel, SentinelResult } from "@core/sentinel";

/**
 * DiffPointNodeSentinel — determines node status by looking up its
 * signature in the reference ContextTree, then scanning DiffPoints
 * for any that involve that node as a referenceNode.
 */
export class DiffPointNodeSentinel implements NodeSentinel {
  private readonly tree: ContextTree;
  private readonly diffPoints: DiffPoint<string>[];

  constructor(tree: ContextTree, diffPoints: DiffPoint<string>[]) {
    this.tree = tree;
    this.diffPoints = diffPoints;
  }

  query(signature: string): SentinelResult {
    // Step 1: Check if the node ever existed in the reference tree
    if (!this.tree.hasSignature(signature)) {
      return { found: false, reason: "NEVER_EXISTED" };
    }

    // Step 2: Get all nodes matching this signature in the reference tree
    const trackedNodes = this.tree.getBySignature(signature);
    const trackedIds = new Set(trackedNodes.map((n) => n.id));

    // Step 3: Scan DiffPoints for any whose referenceNode matches
    const affectedPoints = this.diffPoints.filter(
      (point) => point.referenceNode !== null && trackedIds.has(point.referenceNode.id),
    );

    // Step 4: Determine result
    if (affectedPoints.length === 0) {
      return { found: true, status: "UNCHANGED" };
    }

    return { found: true, status: "AFFECTED", points: affectedPoints };
  }
}
