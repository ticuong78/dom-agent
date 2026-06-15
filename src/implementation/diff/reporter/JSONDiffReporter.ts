import * as fs from "fs";
import * as path from "path";
import type { DiffReport } from "@core/diff";
import type { DiffReporter } from "@core/diff/DiffReporter";
import type { Renderer } from "@core/renderer/Renderer";
import { JSONRenderer } from "@implementation/renderer";

/**
 * A {@link DiffReporter} that writes a serialized {@link DiffReport} to disk
 * as a JSON file.
 *
 * This reporter is a thin convenience around {@link JSONRenderer}: it delegates
 * the actual string production to the renderer and only owns the filesystem
 * write. If you don't need the file write — for example, you want to push the
 * JSON into a database or return it from an HTTP handler — use
 * {@link JSONRenderer} directly and skip this class entirely.
 *
 * @example
 * ```ts
 * const reporter = new JSONDiffReporter();
 * reporter.report(diffReport, "output/diff.json");
 * ```
 *
 * @example
 * ```ts
 * // Skip the reporter when you don't want a file on disk:
 * const json = new JSONRenderer().render(diffReport);
 * await redis.set("latest-diff", json);
 * ```
 */
export class JSONDiffReporter implements DiffReporter {
  /**
   * @param renderer - The {@link Renderer} that produces the JSON string.
   *        Defaults to {@link JSONRenderer}. Inject a custom renderer if you
   *        want to tweak the serialized shape (e.g. pretty-print).
   */
  constructor(private readonly renderer: Renderer = new JSONRenderer()) {}

  /**
   * Renders the diff report as JSON and writes it to disk.
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
    const json = this.renderer.render(diffReport);
    const dir = path.dirname(outputPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, json, "utf-8");
    console.log(`[dom-agent] report written -> ${outputPath}`);
  }
}
