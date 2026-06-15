import type { ContextTree } from "@core/context";
import type { DiffPoint, DiffType, DiffViewer } from "@core/diff";

/**
 * Abstract base class for all DiffViewer implementations.
 *
 * Provides two pieces of shared infrastructure every concrete viewer needs:
 *
 * 1. A canonical `name` (the value that ends up on each emitted
 *    DiffPoint.source). Concrete viewers expose a sensible default name in
 *    their own constructor, but callers can override at construction time.
 * 2. A `stamp` helper that walks an array of freshly-built diff points and
 *    writes `this.name` into each one's `source` field.
 *
 * Subclasses still implement the DiffViewer interface in full.
 */
export abstract class AbstractDiffViewer<T extends string = DiffType>
  implements DiffViewer<T>
{
  readonly name: string;

  protected constructor(name: string) {
    this.name = name;
  }

  abstract highlight(
    reference: ContextTree,
    target: ContextTree,
  ): DiffPoint<T>[];

  /**
   * Writes `this.name` into the `source` field of every point in the array
   * and returns the same array. Mutates in place.
   */
  protected stamp(points: DiffPoint<T>[]): DiffPoint<T>[] {
    for (const point of points) {
      point.source = this.name;
    }
    return points;
  }
}
