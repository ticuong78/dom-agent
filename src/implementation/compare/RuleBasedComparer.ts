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
 *
 * Nodes in different groups are never compared against each other, reducing
 * the search space from O(n*m) to O(n*k) where k is the average bucket size.
 */
export type GroupKeyFn = (node: ContextNode) => string;

/**
 * Default grouping strategy: by tagName.
 */
export const groupByTagName: GroupKeyFn = (node) => node.tagName;

/**
 * A Comparer implementation that matches nodes using a CompareRule for
 * identity evaluation and a grouping function for performance.
 *
 * Both the rule and the grouping function can be supplied at construction
 * time OR set later via setCompareRule / setGroupBy. compare() will throw
 * if invoked before a rule has been set; this is a deliberate fail-loud
 * choice — calling compare() with no rule would silently produce an empty
 * pairing (every node looking like ADDED/DELETED), which is hard to debug.
 */
export class RuleBasedComparer implements Comparer {
  private rule: CompareRule | undefined;
  private groupBy: GroupKeyFn;

  constructor(rule?: CompareRule, groupBy: GroupKeyFn = groupByTagName) {
    this.rule = rule;
    this.groupBy = groupBy;
  }

  setGroupBy(groupBy: GroupKeyFn): void {
    this.groupBy = groupBy;
  }

  setCompareRule(compareRule: CompareRule): void {
    this.rule = compareRule;
  }

  compare(reference: ContextTree, target: ContextTree): CompareResult {
    if (!this.rule) {
      throw new Error(
        "RuleBasedComparer.compare() called before a CompareRule was set. " +
          "Pass a CompareRule to the constructor, or call setCompareRule(...) first.",
      );
    }

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

      const match = this.bestMatch(this.rule, ref, candidates, tarUsed);
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
   *
   * `rule` is passed in (not read from `this.rule`) so we don't need the
   * optional-chaining `?.` here — the top-level compare() has already
   * proved the rule exists.
   */
  private bestMatch(
    rule: CompareRule,
    ref: ContextNode,
    candidates: ContextNode[],
    used: Set<ContextNode>,
  ): ContextNode | null {
    let best: ContextNode | null = null;
    let bestDist = Infinity;

    for (const tar of candidates) {
      if (used.has(tar)) continue;
      if (!rule.evaluate(ref, tar)) continue;

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
