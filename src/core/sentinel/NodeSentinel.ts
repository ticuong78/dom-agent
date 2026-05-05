import type { SentinelResult } from "./SentinelResult";

/**
 * Interface for querying the status of a tracked node by its identity signature.
 *
 * A `NodeSentinel` answers the question: "Does my node still exist, and if so,
 * what happened to it?" It combines a {@link ContextTree} (for existence checks)
 * with diff results (for status classification).
 *
 * @example
 * ```ts
 * const sentinel: NodeSentinel = new DiffPointNodeSentinel(tree, diffPoints);
 *
 * const result = sentinel.query(signature);
 * if (result.found && result.status === "AFFECTED") {
 *   // Node exists but was modified — inspect result.points
 * }
 * ```
 */
export interface NodeSentinel {
  /**
   * Queries the status of a node identified by its signature.
   *
   * @param signature - An identity signature string (produced by
   *        {@link ContextTree.signature} or a custom {@link SignatureCreator}).
   * @returns A {@link SentinelResult} indicating whether the node exists
   *          and what happened to it.
   */
  query(signature: string): SentinelResult;
}
