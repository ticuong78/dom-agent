import type { ContextNode } from "@core/atoms";
import type { ContextTree } from "@core/context";
import type {
  Comparer,
  CompareResult,
  ComparePair,
} from "@core/compare/Comparer";
import type { CompareRule } from "@core/compare/CompareRule";

/**
 * Extracts a grouping key from a {@link ContextNode}.
 *
 * Nodes in different groups are never compared against each other,
 * reducing the search space from O(n*m) to O(n*k) where k is the
 * average bucket size.
 *
 * @param node - The node to extract a group key from.
 * @returns A string key. Nodes with different keys are never paired.
 */
export type GroupKeyFn = (node: ContextNode) => string;

/**
 * Default grouping strategy: by `tagName`.
 *
 * Two nodes with different tag names are almost never "the same entity,"
 * making this a safe coarse filter.
 */
export const groupByTagName: GroupKeyFn = (node) => node.tagName;

/**
 * A {@link Comparer} implementation that matches nodes using a {@link CompareRule}
 * for identity evaluation and a grouping function for performance.
 *
 * **Algorithm:**
 * 1. Flatten both trees into node arrays
 * 2. Bucket target nodes by grouping key (reduces search space)
 * 3. For each reference node, find candidates in the same bucket
 * 4. Evaluate {@link CompareRule} for each candidate
 * 5. Among passing candidates, pick the closest by `depth * 100 + nthChild`
 * 6. Unmatched nodes go to `referenceOnly` / `targetOnly`
 *
 * @example
 * ```ts
 * const rule = new CompareRule([
 *   { attType: "tagName", matchType: "match", logicType: "and" },
 *   { attType: "attributeAnalytic", matchType: "keys_match", logicType: "and" },
 * ]);
 *
 * const comparer = new RuleBasedComparer(rule);
 * const { pairs, referenceOnly, targetOnly } = comparer.compare(oldTree, newTree);
 * ```
 */
export class RuleBasedComparer implements Comparer {
  private rule: CompareRule;
  private groupBy: GroupKeyFn;

  /**
   * @param rule - The {@link CompareRule} used to determine if two nodes are the same entity.
   * @param groupBy - Optional grouping function to bucket nodes before comparison.
   *        Defaults to {@link groupByTagName}.
   */
  constructor(rule: CompareRule, groupBy: GroupKeyFn = groupByTagName) {
    this.rule = rule;
    this.groupBy = groupBy;
  }

  /**
   * Matches nodes between two trees using the configured rule and grouping.
   *
   * @param reference - The old (baseline) tree.
   * @param target - The new (current) tree.
   * @returns A {@link CompareResult} with matched pairs and unmatched nodes.
   */
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

  /**
   * Finds the best matching target node for a given reference node.
   * Among candidates that pass the rule, picks the one closest by position.
   */
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
