import type {
  ContextNodeSnapshot,
  ContextNode,
  ContextTree,
} from "../convert/context";
import type { ISerializable } from "../interface/ISerializable";

/**
 * Base diff classification types emitted by all viewers.
 *
 * - `"ADDED"` — node exists in target but not in reference (new node)
 * - `"DELETED"` — node exists in reference but not in target (removed node)
 */
export type DiffType = "ADDED" | "DELETED";

/**
 * JSON-serializable snapshot of a {@link DiffPoint}.
 * All circular node references are replaced with their serialized form.
 */
export type DiffPointSnapshot = {
  /** The diff classification (e.g. "ADDED", "DELETED", "REPARENTED"). */
  type: string;

  /** Serialized reference node (from old DOM), or `null` if this is an addition. */
  referenceNode: ContextNodeSnapshot | null;

  /** Serialized target node (from new DOM), or `null` if this is a deletion. */
  targetNode: ContextNodeSnapshot | null;

  /** Serialized parent of the reference node, if relevant to this diff type. */
  referenceParentNode?: ContextNodeSnapshot | null;

  /** Serialized parent of the target node, if relevant to this diff type. */
  targetParentNode?: ContextNodeSnapshot | null;

  /** Optional quantitative delta (e.g. number of children added/removed). */
  delta?: number;

  /**
   * Name of the viewer that produced this diff point.
   *
   * Built-in viewers stamp their canonical short name ("hierarchy", "mutation",
   * "shape") via AbstractDiffViewer.stamp. The CompositeDiffViewer preserves
   * whatever source each child viewer self-stamped. Only present when the
   * producing viewer set it.
   */
  source?: string;
};

/**
 * A single detected difference between two DOM snapshots.
 *
 * `DiffPoint` is the atomic unit of dom-agent's diff output. Each instance
 * describes one change, classified by `type`, with references to the affected
 * nodes in both the old (reference) and new (target) trees.
 *
 * The generic parameter `T` allows viewers to emit domain-specific diff types
 * beyond the base `ADDED`/`DELETED` (e.g. `"REPARENTED"`, `"TEXT_CHANGED"`).
 *
 * @typeParam T - The diff type enum this point uses. Defaults to {@link DiffType}.
 */
export class DiffPoint<T extends string = DiffType> implements ISerializable {
  /**
   * Name of the viewer that produced this diff point.
   *
   * Mutable on purpose so a viewer can stamp itself onto each point it emits
   * without forcing a new constructor signature. Set by
   * AbstractDiffViewer.stamp. Left undefined when a producer chooses not to
   * label its output.
   */
  source?: string;

  /**
   * @param type - The classification of this diff (e.g. "DELETED", "ATTRIBUTE_CHANGED").
   * @param referenceNode - The node from the reference (old) tree, or `null` for additions.
   * @param targetNode - The node from the target (new) tree, or `null` for deletions.
   * @param referenceParentNode - Parent of the reference node (used by hierarchy viewers).
   * @param targetParentNode - Parent of the target node (used by hierarchy viewers).
   * @param delta - Optional numeric delta providing quantitative detail.
   */
  constructor(
    readonly type: T,
    readonly referenceNode: ContextNode | null,
    readonly targetNode: ContextNode | null,
    readonly referenceParentNode?: ContextNode | null,
    readonly targetParentNode?: ContextNode | null,
    readonly delta?: number,
  ) {}

  /**
   * Serializes this diff point into a JSON-safe object.
   * Node references become {@link ContextNodeSnapshot} objects.
   *
   * @returns A {@link DiffPointSnapshot} suitable for `JSON.stringify()`.
   */
  serialize() {
    const serialized: DiffPointSnapshot = {
      type: this.type,
      referenceNode: this.referenceNode ? this.referenceNode.serialize() : null,
      targetNode: this.targetNode ? this.targetNode.serialize() : null,
    };

    if (this.referenceParentNode !== undefined) {
      serialized.referenceParentNode = this.referenceParentNode
        ? this.referenceParentNode.serialize()
        : null;
    }

    if (this.targetParentNode !== undefined) {
      serialized.targetParentNode = this.targetParentNode
        ? this.targetParentNode.serialize()
        : null;
    }

    if (this.delta !== undefined) {
      serialized.delta = this.delta;
    }

    if (this.source !== undefined) {
      serialized.source = this.source;
    }

    return serialized;
  }
}
