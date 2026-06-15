import type { Comparer } from "@core/compare/Comparer";
import type { DiffType } from "@core/diff";
import { AbstractDiffViewer } from "./AbstractDiffViewer";

/**
 * Abstract base class for diff viewers whose work begins with running a
 * Comparer over the reference and target trees.
 *
 * All three built-in viewers share the exact same opening move: hand both
 * trees to a Comparer, receive { pairs, referenceOnly, targetOnly }, then
 * classify those results through their own lens. This class lifts the shared
 * piece (holding the Comparer) out of each subclass.
 *
 * CompositeDiffViewer does NOT extend this class.
 */
export abstract class ComparingBasedDiffViewer<
  T extends string = DiffType,
> extends AbstractDiffViewer<T> {
  protected readonly comparer: Comparer;

  protected constructor(comparer: Comparer, name: string) {
    super(name);
    this.comparer = comparer;
  }
}
