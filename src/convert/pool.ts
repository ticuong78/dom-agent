import type { ContextNode } from "./context";

/**
 * Counts the frequency of each `attr=value` pair across an entire
 * ContextTree. Used to measure how unique a given attribute is —
 * the fewer nodes share a pair, the more reliable it is as a selector.
 *
 * Built during ContextTree indexing, then queried to score each node.
 */
export class AttributePool {
  private readonly counts = new Map<string, number>();

  /**
   * Records every attribute on a node into the pool.
   * Call once per node during tree indexing.
   */
  register(node: ContextNode): void {
    for (const [key, value] of Object.entries(node.attributeAnalytic)) {
      const poolKey = `${key}=${value.actualValue}`;
      this.counts.set(poolKey, (this.counts.get(poolKey) ?? 0) + 1);
    }
  }

  /**
   * Returns how unique an `attr=value` pair is across the tree.
   *
   * - `1.0` — only one node has this pair (perfectly unique)
   * - `0.5` — two nodes share it
   * - `0`   — pair not found in pool
   */
  confidence(key: string, value: string): number {
    const count = this.counts.get(`${key}=${value}`);
    if (!count) return 0;
    return 1 / count;
  }
}
