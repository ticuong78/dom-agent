import type { ContextNode } from "@core/atoms";
import type { ContextNodeSnapshot } from "@core/context";
import type { ISerializable } from "@core/interface";

/**
 * Base diff types that every viewer can emit.
 */
export type DiffType = "ADDED" | "DELETED";

export type DiffPointSnapshot = {
  type: string;
  referenceNode: ContextNodeSnapshot | null;
  targetNode: ContextNodeSnapshot | null;
  referenceParentNode?: ContextNodeSnapshot | null;
  targetParentNode?: ContextNodeSnapshot | null;
  delta?: number;
};

/**
 * Generic diff point emitted by a viewer.
 *
 * `delta` remains optional metadata for viewers that want to attach
 * quantitative detail.
 */
export class DiffPoint<T extends string = DiffType> implements ISerializable {
  // atomic
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

    return serialized;
  }

  constructor(
    readonly type: T,
    readonly referenceNode: ContextNode | null,
    readonly targetNode: ContextNode | null,
    readonly referenceParentNode?: ContextNode | null,
    readonly targetParentNode?: ContextNode | null,
    readonly delta?: number,
  ) {}
}
