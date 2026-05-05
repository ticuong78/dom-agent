import type { ContextTree } from "@core/context";
import type { DiffPoint, DiffType } from "./DiffPoint";

/**
 * The analytical perspective (lens) through which a viewer examines differences.
 *
 * - `"context"` — structural/hierarchical changes (position, parent, siblings)
 * - `"node"` — in-place mutations (tag, attributes, text)
 * - `"inner"` — subtree shape changes (children count, depth)
 */
export type DiffLens = "context" | "node" | "inner";

/**
 * Configuration for a diff viewer specifying which lens it operates under.
 */
export type DiffRule = {
  lens: DiffLens;
};

/**
 * Interface for detecting and classifying differences between two DOM snapshots.
 *
 * A `DiffViewer` examines a reference tree (old DOM) and a target tree (new DOM)
 * through a specific analytical lens, producing an array of {@link DiffPoint}
 * instances that describe what changed.
 *
 * Each viewer specializes in one perspective:
 * - {@link TreeHierarchyDiffViewer} — context lens (moved, reordered, reparented)
 * - {@link NodeMutationDiffViewer} — node lens (tag, attributes, text changed)
 * - {@link SubtreeShapeDiffViewer} — inner lens (children added/removed, depth changed)
 *
 * @typeParam T - The diff type enum this viewer emits. Defaults to base {@link DiffType}.
 *
 * @example
 * ```ts
 * const viewer: DiffViewer<TreeHierarchyDiffType> = new TreeHierarchyDiffViewer(comparer);
 * const diffs = viewer.highlight(oldTree, newTree);
 * // diffs: DiffPoint<"ADDED" | "DELETED" | "REORDERED" | "REPARENTED">[]
 * ```
 */
export interface DiffViewer<T extends string = DiffType> {
  /**
   * Compares two trees and returns all detected differences.
   *
   * @param reference - The old (baseline) tree.
   * @param target - The new (current) tree.
   * @returns An array of diff points describing changes from reference to target.
   */
  highlight(reference: ContextTree, target: ContextTree): DiffPoint<T>[];
}
