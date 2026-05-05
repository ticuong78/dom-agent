import * as fs from "fs";
import * as path from "path";
import type { DiffReport } from "@core/diff";
import type { DiffReporter } from "@core/diff/DiffReporter";

/**
 * A {@link DiffReporter} that outputs a JSON file containing the serialized
 * {@link DiffReport}.
 *
 * The output is a single JSON file with all diff points serialized as
 * primitive values — suitable for programmatic consumption, CI pipelines,
 * or further processing.
 *
 * @example
 * ```ts
 * const reporter = new JSONDiffReporter();
 * reporter.report(diffReport, "output/diff.json");
 * // Creates a JSON file with the full serialized report
 * ```
 */
export class JSONDiffReporter implements DiffReporter {
  /**
   * Serializes the diff report as JSON and writes it to disk.
   *
   * Creates parent directories if they don't exist.
   *
   * @param diffReport - The report to serialize.
   * @param outputPath - File path for the output JSON. Defaults to `"report/diff.json"`.
   */
  public report(
    diffReport: DiffReport,
    outputPath: string = "report/diff.json",
  ): void {
    JSONDiffReporter._report(diffReport, outputPath);
  }

  private static _report(
    diffReport: DiffReport,
    outputPath: string = "report/diff.json",
  ): void {
    const json = JSON.stringify(diffReport.serialize());
    const dir = path.dirname(outputPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, json, "utf-8");
    console.log(`[dom-agent] report written -> ${outputPath}`);
  }
}
