import type { ContextNode } from "@core/atoms";
import type { ContextTree } from "@core/context";

/**
 * A matched pair produced by a Comparer.
 */
export type ComparePair = {
  reference: ContextNode;
  target: ContextNode;
};

/**
 * The result of comparing two ContextTrees.
 *
 * - `pairs`: nodes that the comparer considers "the same" across trees
 * - `referenceOnly`: nodes in the reference tree with no match (deletion candidates)
 * - `targetOnly`: nodes in the target tree with no match (addition candidates)
 */
export type CompareResult = {
  pairs: ComparePair[];
  referenceOnly: ContextNode[];
  targetOnly: ContextNode[];
};

/**
 * Comparer — matches nodes between two ContextTrees.
 *
 * A Comparer does not classify changes (that is a DiffViewer's job).
 * It only answers: "which node in the target corresponds to which
 * node in the reference?"
 *
 * Different Comparer implementations use different matching strategies
 * (by position, by surface identity, by subtree shape) which correspond
 * to different DiffLens perspectives.
 */
export interface Comparer {
  compare(reference: ContextTree, target: ContextTree): CompareResult;
}
