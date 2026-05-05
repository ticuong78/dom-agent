import type { ContextNode } from "@core/atoms";
import type { ContextTree } from "@core/context";

/**
 * A matched pair of nodes that the comparer considers "the same entity"
 * across two trees.
 */
export type ComparePair = {
  /** The node from the reference (old) tree. */
  reference: ContextNode;

  /** The corresponding node from the target (new) tree. */
  target: ContextNode;
};

/**
 * The result of comparing two {@link ContextTree} instances.
 *
 * - `pairs` — nodes successfully matched across trees
 * - `referenceOnly` — nodes in the old tree with no match (deletion candidates)
 * - `targetOnly` — nodes in the new tree with no match (addition candidates)
 */
export type CompareResult = {
  /** Matched node pairs across reference and target trees. */
  pairs: ComparePair[];

  /** Nodes present only in the reference tree (potential deletions). */
  referenceOnly: ContextNode[];

  /** Nodes present only in the target tree (potential additions). */
  targetOnly: ContextNode[];
};

/**
 * Interface for matching nodes between two {@link ContextTree} instances.
 *
 * A `Comparer` does NOT classify changes — that is a {@link DiffViewer}'s job.
 * It only answers: "which node in the target corresponds to which node in
 * the reference?"
 *
 * Different implementations use different matching strategies:
 * - By surface identity (tagName + attributes)
 * - By positional similarity (depth + nthChild)
 * - By subtree shape (height + childCount)
 *
 * @example
 * ```ts
 * const comparer: Comparer = new RuleBasedComparer(rule);
 * const { pairs, referenceOnly, targetOnly } = comparer.compare(oldTree, newTree);
 * ```
 */
export interface Comparer {
  /**
   * Matches nodes between a reference tree and a target tree.
   *
   * @param reference - The old (baseline) tree.
   * @param target - The new (current) tree.
   * @returns A {@link CompareResult} with pairs, unmatched reference nodes, and unmatched target nodes.
   */
  compare(reference: ContextTree, target: ContextTree): CompareResult;
}
