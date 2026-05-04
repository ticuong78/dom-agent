import type { ISerializable } from "@core/interface";
import type { DiffPoint, DiffPointSnapshot } from "./DiffPoint";

export type DiffReportSnapshot = {
  reportDate: string;
  reportName: string | undefined;
  totalDiffs: number;
  diffPoints: DiffPointSnapshot[];
};

export class DiffReport implements ISerializable {
  // group of points
  readonly reportDate: Date = new Date();
  readonly totalDiffs: number;

  constructor(
    readonly diffPoints: DiffPoint<string>[],
    readonly reportName?: string,
  ) {
    if (!reportName) reportName = `${this.reportDate.toLocaleString()}`;

    this.totalDiffs = diffPoints.length;
  }

  serialize(): DiffReportSnapshot {
    const snapshot: DiffReportSnapshot = {
      reportDate: this.reportDate.toLocaleDateString(),
      reportName: this.reportName,
      totalDiffs: this.totalDiffs,
      diffPoints: this.diffPoints.map((p: DiffPoint<string>) => p.serialize()),
    };

    return snapshot;
  }
}
