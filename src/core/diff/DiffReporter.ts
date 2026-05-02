import type { DiffPoint } from "./DiffPoint";

export interface DiffReporter {
  report(diffPoints: DiffPoint[]): void;
}
