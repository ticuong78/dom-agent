import type { ContextNode, ContextTree } from "../convert/context";
import type { CompareRule } from "./rule";

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
      if (ref.isExcluded) continue; // skip cac element bi excluded

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
      referenceOnly: refNodes.filter(
        (n) => !refMatched.has(n) && !n.isExcluded,
      ),
      targetOnly: tarNodes.filter((n) => !tarUsed.has(n) && !n.isExcluded),
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
