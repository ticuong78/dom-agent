import type { ContextNode, ContextTree } from "@core/context";
import { CompareRule } from "@core/compare";
import { DiffPoint, type DiffType } from "@core/diff";
import { RuleBasedComparer } from "@implementation/compare";
import { ComparingBasedDiffViewer } from "./ComparingBasedDiffViewer";
import type { Comparer } from "@core/compare/Comparer";

/**
 * Extended diff types emitted by SubtreeShapeDiffViewer.
 *
 * - "ADDED" / "DELETED" — base types
 * - "GROWN" — node gained children (delta = number added)
 * - "SHRUNK" — node lost children (delta = number removed)
 * - "DEPTH_CHANGED" — subtree became deeper or shallower (delta = height diff)
 */
export type SubtreeShapeDiffType =
  | DiffType
  | "GROWN"
  | "SHRUNK"
  | "DEPTH_CHANGED";

/**
 * Detects changes in subtree structure: GROWN, SHRUNK, DEPTH_CHANGED,
 * ADDED, DELETED.
 *
 * Each instance ships with a canonical matching rule baked in — you do NOT
 * need to supply a Comparer. The default rule matches on `tagName` and
 * `attributeAnalytic` values, which is the standard "what kind of container
 * is this" identity. Shape changes are then read off `childCount` and
 * `height` of paired nodes.
 *
 * @example
 * ```ts
 * const viewer = new SubtreeShapeDiffViewer();
 * ```
 */
export class SubtreeShapeDiffViewer extends ComparingBasedDiffViewer<SubtreeShapeDiffType> {
  /**
   * Canonical matching rule for shape diffing.
   *
   * `tagName + attributeAnalytic values_match` — standard surface identity.
   * Once a pair is matched, child counts and heights are compared to derive
   * GROWN / SHRUNK / DEPTH_CHANGED.
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
    return new RuleBasedComparer(SubtreeShapeDiffViewer.DEFAULT_RULE);
  }

  /**
   * @param comparer - Optional override. Defaults to a RuleBasedComparer using
   *        SubtreeShapeDiffViewer.DEFAULT_RULE.
   * @param name - Optional source label. Defaults to "shape".
   */
  constructor(
    comparer: Comparer = SubtreeShapeDiffViewer.defaultComparer(),
    name: string = "shape",
  ) {
    super(comparer, name);
  }

  highlight(
    reference: ContextTree,
    target: ContextTree,
  ): DiffPoint<SubtreeShapeDiffType>[] {
    const { pairs, referenceOnly, targetOnly } = this.comparer.compare(
      reference,
      target,
    );

    const points: DiffPoint<SubtreeShapeDiffType>[] = [];

    for (const { reference: r, target: t } of pairs) {
      points.push(...this.classifyShape(r, t));
    }

    for (const r of referenceOnly) {
      points.push(new DiffPoint<SubtreeShapeDiffType>("DELETED", r, null));
    }

    for (const t of targetOnly) {
      points.push(new DiffPoint<SubtreeShapeDiffType>("ADDED", null, t));
    }

    return this.stamp(points);
  }

  private classifyShape(
    r: ContextNode,
    t: ContextNode,
  ): DiffPoint<SubtreeShapeDiffType>[] {
    const points: DiffPoint<SubtreeShapeDiffType>[] = [];

    if (t.childCount > r.childCount) {
      points.push(
        new DiffPoint<SubtreeShapeDiffType>(
          "GROWN",
          r,
          t,
          null,
          null,
          t.childCount - r.childCount,
        ),
      );
    } else if (t.childCount < r.childCount) {
      points.push(
        new DiffPoint<SubtreeShapeDiffType>(
          "SHRUNK",
          r,
          t,
          null,
          null,
          r.childCount - t.childCount,
        ),
      );
    }

    if (r.height !== t.height) {
      points.push(
        new DiffPoint<SubtreeShapeDiffType>(
          "DEPTH_CHANGED",
          r,
          t,
          null,
          null,
          t.height - r.height,
        ),
      );
    }

    return points;
  }
}
