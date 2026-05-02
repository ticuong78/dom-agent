import type { DiffPoint } from "./DiffPoint";

/**
 * DiffReporter — nhận bất kỳ DiffPoint nào, không quan tâm enum cụ thể của
 * viewer phát ra (string là superset của mọi DiffType extension).
 */
export interface DiffReporter {
  report(diffPoints: DiffPoint<string>[]): void;
}
