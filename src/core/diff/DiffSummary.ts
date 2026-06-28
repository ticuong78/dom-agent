import type { ISerializable } from "@core/interface";
import type { DiffPoint, DiffPointSnapshot } from "./DiffPoint";

/**
 * JSON-serializable snapshot of a {@link DiffSummary}.
 */
export type DiffSummarySnapshot = {
  /** ISO 8601 date string of when the report was generated. */
  reportDate: string;

  /** Optional human-readable name for this report. */
  reportName: string | undefined;

  /** Total number of diff points in this report. */
  totalDiffs: number;

  /** All serialized diff points. */
  diffPoints: DiffPointSnapshot[];
};

/**
 * A collection of {@link DiffPoint} instances representing all detected
 * changes between two DOM snapshots.
 *
 * `DiffSummary` is the output of a diff pipeline — it groups diff points
 * together with metadata (date, name, count) and provides serialization
 * for persistence or rendering.
 *
 * @example
 * ```ts
 * const points = viewer.highlight(oldTree, newTree);
 * const report = new DiffSummary(points, "homepage-daily-check");
 *
 * // Serialize for storage
 * const json = JSON.stringify(report.serialize());
 *
 * // Pass to a reporter for HTML/JSON output
 * reporter.report(report, "output/report.html");
 * ```
 */
export class DiffSummary implements ISerializable {
  /** Timestamp of when this report was created. */
  readonly reportDate: Date = new Date();

  /** Total number of diff points. */
  readonly totalDiffs: number;

  /**
   * @param diffPoints - Array of diff points from one or more viewers.
   * @param reportName - Optional name for this report. Defaults to the creation timestamp.
   */
  constructor(
    readonly diffPoints: DiffPoint<string>[],
    readonly reportName?: string,
  ) {
    if (!reportName) reportName = `${this.reportDate.toLocaleString()}`;

    this.totalDiffs = diffPoints.length;
  }

  /**
   * Serializes the report into a JSON-safe object.
   *
   * @returns A {@link DiffSummarySnapshot} with all primitive fields.
   */
  serialize(): DiffSummarySnapshot {
    const snapshot: DiffSummarySnapshot = {
      reportDate: this.reportDate.toLocaleDateString(),
      reportName: this.reportName,
      totalDiffs: this.totalDiffs,
      diffPoints: this.diffPoints.map((p: DiffPoint<string>) => p.serialize()),
    };

    return snapshot;
  }
}
