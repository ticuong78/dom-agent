import type { ISerializable } from "@core/interface";
import type { DiffPoint, DiffPointSnapshot } from "./DiffPoint";

/**
 * JSON-serializable snapshot of a {@link DiffSummary}.
 */
export type DiffSummarySnapshot = {
  /** ISO 8601 date string of when the summary was generated. */
  createdAt: string;

  /** Optional human-readable label for this summary. */
  label: string | undefined;

  /** Total number of diff points in this summary. */
  totalDiffs: number;

  /** All serialized diff points. */
  diffPoints: DiffPointSnapshot[];
};

/**
 * A collection of {@link DiffPoint} instances representing all detected
 * changes between two DOM snapshots.
 *
 * `DiffSummary` is the output of a diff pipeline — it groups diff points
 * together with metadata (date, label, count) and provides serialization
 * for persistence or rendering.
 *
 * @example
 * ```ts
 * const points = viewer.highlight(oldTree, newTree);
 * const summary = new DiffSummary(points, "homepage-daily-check");
 *
 * // Serialize for storage
 * const json = JSON.stringify(summary.serialize());
 *
 * // Pass to a reporter for HTML/JSON output
 * reporter.report(summary, "output/summary.html");
 * ```
 */
export class DiffSummary implements ISerializable {
  /** Timestamp of when this summary was created. */
  readonly createdAt: Date = new Date();

  /** Total number of diff points. */
  readonly totalDiffs: number;

  /**
   * @param diffPoints - Array of diff points from one or more viewers.
   * @param label - Optional label for this summary. Defaults to the creation timestamp.
   */
  constructor(
    readonly diffPoints: DiffPoint<string>[],
    readonly label?: string,
  ) {
    if (!label) label = `${this.createdAt.toLocaleString()}`;

    this.totalDiffs = diffPoints.length;
  }

  /**
   * Serializes the summary into a JSON-safe object.
   *
   * @returns A {@link DiffSummarySnapshot} with all primitive fields.
   */
  serialize(): DiffSummarySnapshot {
    const snapshot: DiffSummarySnapshot = {
      createdAt: this.createdAt.toISOString(),
      label: this.label,
      totalDiffs: this.totalDiffs,
      diffPoints: this.diffPoints.map((p: DiffPoint<string>) => p.serialize()),
    };

    return snapshot;
  }
}
