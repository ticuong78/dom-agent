import type { ContextNode } from "@core/atoms";

/**
 * Base diff types that every viewer can emit.
 */
export type DiffType = "ADDED" | "DELETED";

/**
 * Generic diff point emitted by a viewer.
 *
 * `delta` remains optional metadata for viewers that want to attach
 * quantitative detail.
 */
export type DiffPoint<T extends string = DiffType> = {
  type: T;
  referenceNode: ContextNode | null;
  targetNode: ContextNode | null;
  referenceParentNode?: ContextNode | null;
  targetParentNode?: ContextNode | null;
  delta?: number;
};
