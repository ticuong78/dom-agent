import type { ContextNode, ContextTree } from "@core/context";
import type { ValueType } from "@core/context/ContextNode";
import { CompareRule } from "@core/compare";
import { DiffPoint, type DiffType } from "@core/diff";
import { RuleBasedComparer, type GroupKeyFn } from "@implementation/compare";
import { ComparingBasedDiffViewer } from "./ComparingBasedDiffViewer";
import type { Comparer } from "@core/compare/Comparer";

/**
 * Extended diff types emitted by NodeMutationDiffViewer.
 *
 * - "ADDED" / "DELETED" — base types
 * - "TAG_CHANGED" — element's tag name was swapped (e.g. div -> section)
 * - "ATTRIBUTE_CHANGED" — attributes were added, removed, or modified
 * - "TEXT_CHANGED" — node's direct text content was modified
 */
export type NodeMutationDiffType =
  | DiffType
  | "TAG_CHANGED"
  | "ATTRIBUTE_CHANGED"
  | "TEXT_CHANGED";

/**
 * Detects in-place property mutations: TAG_CHANGED, ATTRIBUTE_CHANGED,
 * TEXT_CHANGED, ADDED, DELETED.
 *
 * Each instance ships with a canonical matching rule baked in — you do NOT
 * need to supply a Comparer. The default rule matches on `depth` and
 * `attributeAnalytic` values, grouped by depth. Dropping `tagName` from the
 * rule is what enables pairing a node whose tag changed (e.g. div -> section);
 * grouping by depth keeps the search space tight.
 *
 * If you need different matching behaviour, pass a custom Comparer to the
 * constructor; otherwise leave it blank.
 *
 * @example
 * ```ts
 * // Default usage
 * const viewer = new NodeMutationDiffViewer();
 *
 * // Power-user override
 * const viewer = new NodeMutationDiffViewer(myCustomComparer);
 *
 * // Remix
 * const myRule = new CompareRule([
 *   ...NodeMutationDiffViewer.DEFAULT_RULE.points,
 *   { attType: "tagName", matchType: "match", logicType: "and" },
 * ]);
 * const viewer = new NodeMutationDiffViewer(
 *   new RuleBasedComparer(myRule, NodeMutationDiffViewer.DEFAULT_GROUP_BY),
 * );
 * ```
 */
export class NodeMutationDiffViewer extends ComparingBasedDiffViewer<NodeMutationDiffType> {
  /**
   * Canonical matching rule for mutation diffing.
   *
   * `depth + attributeAnalytic values_match`, intentionally omitting `tagName`
   * so that a node whose tag changed (div -> section) still pairs across the
   * trees. `values_match` only checks shared attribute keys, so attribute
   * adds/removes still allow pairing — the change is reported afterwards as
   * ATTRIBUTE_CHANGED.
   */
  static readonly DEFAULT_RULE = new CompareRule([
    { attType: "depth", matchType: "equal", logicType: "and" },
    { attType: "attributeAnalytic", matchType: "values_match", logicType: "and" },
  ]);

  /**
   * Canonical grouping for mutation diffing: by `depth`.
   *
   * Tight grouping is important because the rule above does NOT use `tagName`.
   * Without depth-grouping, every tag would be a candidate for every other
   * tag at any depth, blowing up the matching cost and producing nonsense
   * pairings.
   */
  static readonly DEFAULT_GROUP_BY: GroupKeyFn = (n: ContextNode) => String(n.depth);

  /**
   * Builds a fresh Comparer pre-configured with the canonical rule + grouping.
   * Called automatically by the no-argument constructor.
   */
  static defaultComparer(): Comparer {
    return new RuleBasedComparer(
      NodeMutationDiffViewer.DEFAULT_RULE,
      NodeMutationDiffViewer.DEFAULT_GROUP_BY,
    );
  }

  /**
   * @param comparer - Optional override. Defaults to a RuleBasedComparer using
   *        NodeMutationDiffViewer.DEFAULT_RULE and DEFAULT_GROUP_BY.
   * @param name - Optional source label. Defaults to "mutation".
   */
  constructor(
    comparer: Comparer = NodeMutationDiffViewer.defaultComparer(),
    name: string = "mutation",
  ) {
    super(comparer, name);
  }

  highlight(
    reference: ContextTree,
    target: ContextTree,
  ): DiffPoint<NodeMutationDiffType>[] {
    const { pairs, referenceOnly, targetOnly } = this.comparer.compare(
      reference,
      target,
    );

    const points: DiffPoint<NodeMutationDiffType>[] = [];

    for (const { reference: r, target: t } of pairs) {
      points.push(...this.classifyMutations(r, t));
    }

    for (const r of referenceOnly) {
      points.push(new DiffPoint<NodeMutationDiffType>("DELETED", r, null));
    }

    for (const t of targetOnly) {
      points.push(new DiffPoint<NodeMutationDiffType>("ADDED", null, t));
    }

    return this.stamp(points);
  }

  private classifyMutations(
    r: ContextNode,
    t: ContextNode,
  ): DiffPoint<NodeMutationDiffType>[] {
    const points: DiffPoint<NodeMutationDiffType>[] = [];

    if (r.tagName !== t.tagName) {
      points.push(new DiffPoint<NodeMutationDiffType>("TAG_CHANGED", r, t));
    }

    if (this.attributesChanged(r, t)) {
      points.push(
        new DiffPoint<NodeMutationDiffType>(
          "ATTRIBUTE_CHANGED",
          r,
          t,
          null,
          null,
          Math.abs(r.attributeCount - t.attributeCount),
        ),
      );
    }

    if (r.directTextHash !== t.directTextHash) {
      points.push(new DiffPoint<NodeMutationDiffType>("TEXT_CHANGED", r, t));
    }

    return points;
  }

  private attributesChanged(r: ContextNode, t: ContextNode): boolean {
    if (r.attributeCount !== t.attributeCount) return true;

    const rKeys = Object.keys(r.attributeAnalytic);
    const tKeys = Object.keys(t.attributeAnalytic);

    if (rKeys.length !== tKeys.length) return true;
    for (const key of rKeys) {
      if (!(key in t.attributeAnalytic)) return true;
    }

    for (const key of rKeys) {
      const rVal = r.attributeAnalytic[key] as ValueType;
      const tVal = t.attributeAnalytic[key] as ValueType;

      if (
        rVal.numberOfValues !== tVal.numberOfValues ||
        rVal.totalLength !== tVal.totalLength ||
        rVal.actualValue !== tVal.actualValue
      ) {
        return true;
      }
    }

    return false;
  }
}
