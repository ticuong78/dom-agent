import type { ContextNode, ContextTree } from "@core/context";
import { CompareRule } from "@core/compare";
import { DiffPoint, type DiffType } from "@core/diff";
import { RuleBasedComparer } from "@implementation/compare";
import { ComparingBasedDiffViewer } from "./ComparingBasedDiffViewer";
import type { Comparer } from "@core/compare/Comparer";

/**
 * Extended diff types emitted by TreeHierarchyDiffViewer.
 *
 * - "ADDED" / "DELETED" — base types (node appeared or disappeared)
 * - "REORDERED" — node stayed with the same parent but changed position
 * - "REPARENTED" — node moved to a different parent container
 */
export type TreeHierarchyDiffType = DiffType | "REORDERED" | "REPARENTED";

/**
 * Detects structural movement in the DOM: REPARENTED, REORDERED, ADDED, DELETED.
 *
 * Each instance ships with a canonical matching rule baked in — you do NOT
 * need to supply a Comparer. The default rule matches on `tagName` and
 * `attributeAnalytic` values, deliberately omitting `depth` so that a node
 * reparented across branches (whose depth changed) still pairs with its
 * original.
 *
 * If you need different matching behaviour, pass a custom Comparer to the
 * constructor; otherwise leave it blank and use the class as-is.
 *
 * @example
 * ```ts
 * // Default usage — class owns its semantics
 * const viewer = new TreeHierarchyDiffViewer();
 *
 * // Power-user override
 * const viewer = new TreeHierarchyDiffViewer(myCustomComparer);
 *
 * // Remix the canonical rule
 * const myRule = new CompareRule([
 *   ...TreeHierarchyDiffViewer.DEFAULT_RULE.points,
 *   { attType: "directTextHash", matchType: "match", logicType: "and" },
 * ]);
 * const viewer = new TreeHierarchyDiffViewer(new RuleBasedComparer(myRule));
 * ```
 */
export class TreeHierarchyDiffViewer extends ComparingBasedDiffViewer<TreeHierarchyDiffType> {
  /**
   * Canonical matching rule for hierarchy diffing.
   *
   * `tagName + attributeAnalytic values_match`, NO depth constraint. Dropping
   * depth is what enables matching nodes that were reparented to a different
   * branch (and therefore changed depth). `values_match` keeps the pair stable
   * when a node gains or loses an attribute — that change is reported by the
   * mutation viewer downstream.
   */
  static readonly DEFAULT_RULE = new CompareRule([
    { attType: "tagName", matchType: "match", logicType: "and" },
    { attType: "attributeAnalytic", matchType: "values_match", logicType: "and" },
  ]);

  /**
   * Builds a fresh Comparer pre-configured with the canonical rule.
   * Called automatically by the no-argument constructor.
   */
  static defaultComparer(): Comparer {
    return new RuleBasedComparer(TreeHierarchyDiffViewer.DEFAULT_RULE);
  }

  /**
   * @param comparer - Optional override. Defaults to a RuleBasedComparer using
   *        TreeHierarchyDiffViewer.DEFAULT_RULE.
   * @param name - Optional source label. Defaults to "hierarchy".
   */
  constructor(
    comparer: Comparer = TreeHierarchyDiffViewer.defaultComparer(),
    name: string = "hierarchy",
  ) {
    super(comparer, name);
  }

  highlight(
    reference: ContextTree,
    target: ContextTree,
  ): DiffPoint<TreeHierarchyDiffType>[] {
    const { pairs, referenceOnly, targetOnly } = this.comparer.compare(
      reference,
      target,
    );

    const points: DiffPoint<TreeHierarchyDiffType>[] = [];

    for (const { reference: r, target: t } of pairs) {
      points.push(...this.classifyPair(r, t));
    }

    for (const r of referenceOnly) {
      points.push(new DiffPoint<TreeHierarchyDiffType>("DELETED", r, null));
    }

    for (const t of targetOnly) {
      points.push(new DiffPoint<TreeHierarchyDiffType>("ADDED", null, t));
    }

    return this.stamp(points);
  }

  private classifyPair(
    r: ContextNode,
    t: ContextNode,
  ): DiffPoint<TreeHierarchyDiffType>[] {
    const sameParent =
      r.parentTagName === t.parentTagName &&
      r.parentAttributeCount === t.parentAttributeCount &&
      r.parentDepth === t.parentDepth;

    const samePosition =
      r.depth === t.depth &&
      r.nthChild === t.nthChild &&
      r.siblingCount === t.siblingCount;

    if (sameParent && samePosition) {
      return [];
    }

    if (!sameParent || r.depth !== t.depth) {
      return [
        new DiffPoint<TreeHierarchyDiffType>(
          "REPARENTED",
          r,
          t,
          r.parent,
          t.parent,
        ),
      ];
    }

    if (r.nthChild !== t.nthChild) {
      return [new DiffPoint<TreeHierarchyDiffType>("REORDERED", r, t)];
    }

    return [];
  }
}
