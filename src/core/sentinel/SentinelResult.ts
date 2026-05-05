import type { DiffPoint } from "@core/diff";

/**
 * Possible statuses returned by a {@link NodeSentinel} query.
 *
 * - `"UNCHANGED"` — the node exists in the reference tree and was not affected by any diff
 * - `"AFFECTED"` — the node exists and at least one {@link DiffPoint} references it
 * - `"NEVER_EXISTED"` — no node with this signature was found in the reference tree
 */
export type SentinelStatus = "UNCHANGED" | "AFFECTED" | "NEVER_EXISTED";

/**
 * The result of querying a {@link NodeSentinel} for a tracked node's status.
 *
 * This is a discriminated union — branch on `found` and `status` to access
 * the relevant payload.
 *
 * @example
 * ```ts
 * const result = sentinel.query(signature);
 *
 * if (!result.found) {
 *   console.log("Node never existed in this DOM");
 * } else if (result.status === "AFFECTED") {
 *   console.log(`Node changed: ${result.points.length} diff(s)`);
 *   result.points.forEach(p => console.log(p.type));
 * } else {
 *   console.log("Node is unchanged");
 * }
 * ```
 */
export type SentinelResult =
  | {
      /** The node was found in the reference tree. */
      found: true;
      /** No DiffPoint references this node — it is untouched. */
      status: "UNCHANGED";
    }
  | {
      /** The node was found in the reference tree. */
      found: true;
      /** At least one DiffPoint references this node. */
      status: "AFFECTED";
      /** The DiffPoints describing what happened to this node. */
      points: DiffPoint<string>[];
    }
  | {
      /** No node with this signature exists in the reference tree. */
      found: false;
      /** The node was never part of this DOM snapshot. */
      reason: "NEVER_EXISTED";
    };
