import type { ContextNode } from "@core/atoms";
import type { ContextTree } from "@core/context";
import type { CompareRule } from "./CompareRule";
import type { GroupKeyFn } from "@implementation/compare";

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
 * The result of comparing two ContextTree instances.
 *
 * - pairs - nodes successfully matched across trees
 * - referenceOnly - nodes in the old tree with no match (deletion candidates)
 * - targetOnly - nodes in the new tree with no match (addition candidates)
 */
export type CompareResult = {
  pairs: ComparePair[];
  referenceOnly: ContextNode[];
  targetOnly: ContextNode[];
};

/**
 * Interface for matching nodes between two ContextTree instances.
 *
 * A Comparer does NOT classify changes — that is a DiffViewer's job. It only
 * answers: "which node in the target corresponds to which node in the
 * reference?"
 */
export interface Comparer {
  /**
   * Matches nodes between a reference tree and a target tree.
   */
  compare(reference: ContextTree, target: ContextTree): CompareResult;

  /**
   * Replace the matching rule. Allows configure-after-construct workflows.
   */
  setCompareRule(compareRule: CompareRule): void;

  /**
   * Replace the grouping strategy. Allows configure-after-construct workflows.
   */
  setGroupBy(groupBy: GroupKeyFn): void;
}
