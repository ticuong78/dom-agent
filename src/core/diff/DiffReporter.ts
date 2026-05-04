import type { DiffReport } from "./DiffReport";

/**
 * DiffReporter — nhận bất kỳ DiffPoint nào, không quan tâm enum cụ thể của
 * viewer phát ra (string là superset của mọi DiffType extension).
 */
export interface DiffReporter {
  report(diffReport: DiffReport, outputPath: string): void;
}
