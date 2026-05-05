import type { DiffReport } from "./DiffReport";

/**
 * Interface for outputting a {@link DiffReport} to a file or stream.
 *
 * Implementations transform the report into a specific format (HTML, JSON,
 * Markdown, etc.) and write it to the given path.
 *
 * @example
 * ```ts
 * const reporter: DiffReporter = new HTMLDiffReporter(theme);
 * reporter.report(diffReport, "output/report.html");
 * ```
 */
export interface DiffReporter {
  /**
   * Renders and writes the diff report to the specified path.
   *
   * @param diffReport - The report to output.
   * @param outputPath - File path where the report will be written.
   */
  report(diffReport: DiffReport, outputPath: string): void;
}
