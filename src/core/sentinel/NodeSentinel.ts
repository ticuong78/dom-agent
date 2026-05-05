import type { SentinelResult } from "./SentinelResult";

/**
 * NodeSentinel — queries the status of a tracked node by signature.
 *
 * Given a signature (identity-based fingerprint of a node), determines
 * whether the node existed in the reference DOM and what happened to it.
 */
export interface NodeSentinel {
  query(signature: string): SentinelResult;
}
