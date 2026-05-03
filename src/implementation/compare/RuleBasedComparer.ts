import type { ContextNode } from "@core/atoms";
import type { ContextTree } from "@core/context";
import type {
  Comparer,
  CompareResult,
  ComparePair,
} from "@core/compare/Comparer";
import type { CompareRule } from "@core/compare/CompareRule";

/**
 * Extracts a grouping key from a ContextNode.
 * Nodes in different groups are never compared against each other,
 * so the key must be coarse enough that true matches always land
 * in the same bucket.
 */
export type GroupKeyFn = (node: ContextNode) => string;

/**
 * Default grouping: by tagName.
 * Two nodes with different tag names are almost never "the same node,"
 * so this is a safe coarse filter that reduces comparisons.
 */
export const groupByTagName: GroupKeyFn = (node) => node.tagName;

/**
 * RuleBasedComparer — matches nodes between two ContextTrees using
 * a CompareRule to determine identity and a grouping function for
 * performance.
 *
 * Algorithm:
 * 1. Flatten both trees into node lists
 * 2. Bucket nodes by grouping key (reduces search space)
 * 3. Within each bucket, evaluate CompareRule for ref-target pairs
 * 4. Among candidates that pass, pick closest by depth+nthChild
 * 5. Unmatched nodes go to referenceOnly / targetOnly
 */
export class RuleBasedComparer implements Comparer {
  private rule: CompareRule;
  private groupBy: GroupKeyFn;

  constructor(rule: CompareRule, groupBy: GroupKeyFn = groupByTagName) {
    this.rule = rule;
    this.groupBy = groupBy;
  }

  compare(
    reference: ContextTree,
    target: ContextTree,
  ): CompareResult {
    const refNodes = reference.nodes();
    const tarNodes = target.nodes();

    const tarBuckets = new Map<string, ContextNode[]>();
    for (const t of tarNodes) {
      const key = this.groupBy(t);
      const bucket = tarBuckets.get(key) ?? [];
      bucket.push(t);
      tarBuckets.set(key, bucket);
    }

    const pairs: ComparePair[] = [];
    const tarUsed = new Set<ContextNode>();
    const refMatched = new Set<ContextNode>();

    for (const ref of refNodes) {
      const key = this.groupBy(ref);
      const candidates = tarBuckets.get(key);
      if (!candidates) continue;

      const match = this.bestMatch(ref, candidates, tarUsed);
      if (match) {
        pairs.push({ reference: ref, target: match });
        tarUsed.add(match);
        refMatched.add(ref);
      }
    }

    return {
      pairs,
      referenceOnly: refNodes.filter((n) => !refMatched.has(n)),
      targetOnly: tarNodes.filter((n) => !tarUsed.has(n)),
    };
  }

  private bestMatch(
    ref: ContextNode,
    candidates: ContextNode[],
    used: Set<ContextNode>,
  ): ContextNode | null {
    let best: ContextNode | null = null;
    let bestDist = Infinity;

    for (const tar of candidates) {
      if (used.has(tar)) continue;
      if (!this.rule.evaluate(ref, tar)) continue;

      const dist =
        Math.abs(ref.depth - tar.depth) * 100 +
        Math.abs(ref.nthChild - tar.nthChild);

      if (dist < bestDist) {
        bestDist = dist;
        best = tar;
      }
    }

    return best;
  }
}
