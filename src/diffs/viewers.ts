// ─── Diff Type Unions ───────────────────────────────────────

import {
  type Comparer,
  RuleBasedComparer,
  type GroupKeyFn,
} from "../compare/comparer";
import { CompareRule } from "../compare/rule";
import type { ContextTree, ContextNode, ValueType } from "../convert/context";
import { DiffPoint, DiffResult, type DiffType } from "./points";

export type TreeHierarchyDiffType = DiffType | "REORDERED" | "REPARENTED";

export type NodeMutationDiffType =
  | DiffType
  | "TAG_CHANGED"
  | "ATTRIBUTE_CHANGED"
  | "TEXT_CHANGED";

export type SubtreeShapeDiffType =
  | DiffType
  | "GROWN"
  | "SHRUNK"
  | "DEPTH_CHANGED";

/** Union of all diff types produced by the three built-in viewers. */
export type StandardDiffType =
  | TreeHierarchyDiffType
  | NodeMutationDiffType
  | SubtreeShapeDiffType;

// ─── DiffViewer Interface ───────────────────────────────────

/**
 * Detects and classifies differences between two DOM snapshots.
 *
 * Each viewer examines a reference tree (old) and target tree (new)
 * through a specific lens, producing DiffPoints that describe changes.
 */
interface DiffViewer<T extends string = DiffType> {
  readonly name: string;
  highlight(reference: ContextTree, target: ContextTree): DiffPoint<T>[];
}

// ─── Shared Helper ──────────────────────────────────────────

/** Writes `name` into each point's `source` field. Mutates in place. */
function stamp<T extends string>(
  points: DiffPoint<T>[],
  name: string,
): DiffPoint<T>[] {
  for (const p of points) p.source = name;
  return points;
}

// ─── AbstractDiffViewer ────────────────────────────────────

/**
 * Base class for viewers that follow the compare-then-classify pattern.
 *
 * Subclasses only implement `classifyPair` — everything else
 * (comparer wiring, ADDED/DELETED handling, stamping) lives here.
 */
export abstract class AbstractDiffViewer<
  T extends string = DiffType,
> implements DiffViewer<T> {
  readonly name: string;
  protected readonly comparer: Comparer;

  constructor(comparer: Comparer, name: string) {
    this.comparer = comparer;
    this.name = name;
  }

  highlight(reference: ContextTree, target: ContextTree): DiffPoint<T>[] {
    const { pairs, referenceOnly, targetOnly } = this.comparer.compare(
      reference,
      target,
    );

    const points: DiffPoint<T>[] = [];

    for (const { reference: r, target: t } of pairs) {
      points.push(...this.classifyPair(r, t));
    }

    for (const r of referenceOnly) {
      points.push(new DiffPoint<T>("DELETED" as T, r, null));
    }

    for (const t of targetOnly) {
      points.push(new DiffPoint<T>("ADDED" as T, null, t));
    }

    return stamp(points, this.name);
  }

  protected abstract classifyPair(
    r: ContextNode,
    t: ContextNode,
  ): DiffPoint<T>[];
}

// ─── TreeHierarchyDiffViewer ────────────────────────────────

/**
 * Detects structural movement: REPARENTED, REORDERED, ADDED, DELETED.
 *
 * Default rule matches on `tagName` + `attributeAnalytic` values,
 * deliberately omitting `depth` so a reparented node still pairs
 * with its original.
 */
export class TreeHierarchyDiffViewer extends AbstractDiffViewer<TreeHierarchyDiffType> {
  static readonly DEFAULT_RULE = new CompareRule([
    { attType: "tagName", matchType: "match", logicType: "and" },
    {
      attType: "attributeAnalytic",
      matchType: "values_match",
      logicType: "and",
    },
  ]);

  static defaultComparer(): Comparer {
    return new RuleBasedComparer(TreeHierarchyDiffViewer.DEFAULT_RULE);
  }

  constructor(
    comparer: Comparer = TreeHierarchyDiffViewer.defaultComparer(),
    name: string = "hierarchy",
  ) {
    super(comparer, name);
  }

  protected classifyPair(
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

    if (sameParent && samePosition) return [];

    if (!sameParent || r.depth !== t.depth) {
      return [new DiffPoint("REPARENTED", r, t, r.parent, t.parent)];
    }

    if (r.nthChild !== t.nthChild) {
      return [new DiffPoint("REORDERED", r, t)];
    }

    return [];
  }
}

// ─── NodeMutationDiffViewer ─────────────────────────────────

/**
 * Detects in-place property mutations: TAG_CHANGED, ATTRIBUTE_CHANGED,
 * TEXT_CHANGED, ADDED, DELETED.
 *
 * Default rule matches on `depth` + `attributeAnalytic` values, grouped
 * by depth. Omits `tagName` so a tag swap (div → section) still pairs.
 */
export class NodeMutationDiffViewer extends AbstractDiffViewer<NodeMutationDiffType> {
  static readonly DEFAULT_RULE = new CompareRule([
    { attType: "depth", matchType: "equal", logicType: "and" },
    {
      attType: "attributeAnalytic",
      matchType: "values_match",
      logicType: "and",
    },
  ]);

  static readonly DEFAULT_GROUP_BY: GroupKeyFn = (n) => String(n.depth);

  static defaultComparer(): Comparer {
    return new RuleBasedComparer(
      NodeMutationDiffViewer.DEFAULT_RULE,
      NodeMutationDiffViewer.DEFAULT_GROUP_BY,
    );
  }

  constructor(
    comparer: Comparer = NodeMutationDiffViewer.defaultComparer(),
    name: string = "mutation",
  ) {
    super(comparer, name);
  }

  protected classifyPair(
    r: ContextNode,
    t: ContextNode,
  ): DiffPoint<NodeMutationDiffType>[] {
    const points: DiffPoint<NodeMutationDiffType>[] = [];

    if (r.tagName !== t.tagName) {
      points.push(new DiffPoint("TAG_CHANGED", r, t));
    }

    if (this.attributesChanged(r, t)) {
      points.push(
        new DiffPoint(
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
      points.push(new DiffPoint("TEXT_CHANGED", r, t));
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

// ─── SubtreeShapeDiffViewer ─────────────────────────────────

/**
 * Detects subtree structure changes: GROWN, SHRUNK, DEPTH_CHANGED,
 * ADDED, DELETED.
 *
 * Default rule matches on `tagName` + `attributeAnalytic` values.
 * Shape changes are read off `childCount` and `height` of paired nodes.
 */
export class SubtreeShapeDiffViewer extends AbstractDiffViewer<SubtreeShapeDiffType> {
  static readonly DEFAULT_RULE = new CompareRule([
    { attType: "tagName", matchType: "match", logicType: "and" },
    {
      attType: "attributeAnalytic",
      matchType: "values_match",
      logicType: "and",
    },
  ]);

  static defaultComparer(): Comparer {
    return new RuleBasedComparer(SubtreeShapeDiffViewer.DEFAULT_RULE);
  }

  constructor(
    comparer: Comparer = SubtreeShapeDiffViewer.defaultComparer(),
    name: string = "shape",
  ) {
    super(comparer, name);
  }

  protected classifyPair(
    r: ContextNode,
    t: ContextNode,
  ): DiffPoint<SubtreeShapeDiffType>[] {
    const points: DiffPoint<SubtreeShapeDiffType>[] = [];

    if (t.childCount > r.childCount) {
      points.push(
        new DiffPoint("GROWN", r, t, null, null, t.childCount - r.childCount),
      );
    } else if (t.childCount < r.childCount) {
      points.push(
        new DiffPoint("SHRUNK", r, t, null, null, r.childCount - t.childCount),
      );
    }

    if (r.height !== t.height) {
      points.push(
        new DiffPoint("DEPTH_CHANGED", r, t, null, null, t.height - r.height),
      );
    }

    return points;
  }
}

// ─── CompositeDiffViewer ────────────────────────────────────

/**
 * Runs several viewers over the same tree pair and deduplicates results.
 *
 * Dedup rule: if any viewer paired node R with node T (non-ADDED/DELETED),
 * standalone DELETED-for-R and ADDED-for-T from other viewers are kept
 * but exact (type + refId + tarId) duplicates are dropped.
 */
export class CompositeDiffViewer<
  T extends string = string,
> implements DiffViewer<T> {
  readonly name: string;
  private readonly viewers: Set<DiffViewer<T>>;

  constructor(viewers: DiffViewer<T>[] = [], name: string = "composite") {
    this.name = name;
    this.viewers = new Set<DiffViewer<T>>();

    for (const viewer of viewers) this.viewers.add(viewer);
  }

  registerViewers(viewers: DiffViewer<T>[] | DiffViewer<T>) {
    if (!Array.isArray(viewers)) {
      this.viewers.add(viewers);
      return;
    }

    for (const viewer of viewers) this.viewers.add(viewer);
  }

  highlight(reference: ContextTree, target: ContextTree): DiffPoint<T>[] {
    const all: DiffPoint<T>[] = [];
    for (const viewer of this.viewers) {
      all.push(...viewer.highlight(reference, target));
    }

    // Deduplicate by (type, refId, tarId)
    const seen = new Set<string>();
    const deduped: DiffPoint<T>[] = [];
    const result = new DiffResult<T>();

    for (const point of all) {
      const key = `${point.type}|${point.referenceNode?.id ?? ""}|${point.targetNode?.id ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(point);
    }

    return deduped;
  }
}
