import type { DiffReport } from "@core/diff";
import type { Renderer } from "@core/renderer/Renderer";

/**
 * A {@link Renderer} that turns a {@link DiffReport} into a JSON string.
 *
 * This is the JSON counterpart to the HTML themes ({@link DashboardLikeTheme},
 * {@link DeepSpaceTheme}). It exists so that every output format — visual or
 * structured — flows through the same {@link Renderer} interface: take a
 * report, return a string. Filesystem I/O is somebody else's problem.
 *
 * Use it directly when you want the serialized report as a string (to store
 * in a database, push to a queue, return from an HTTP handler, …) without
 * touching the filesystem:
 *
 * @example
 * ```ts
 * const renderer = new JSONRenderer();
 * const json = renderer.render(diffReport);
 *
 * await db.collection("diffs").insertOne(JSON.parse(json));
 * // or: res.type("application/json").send(json);
 * ```
 *
 * For the "render then write to disk" path, pair it with a reporter:
 *
 * @example
 * ```ts
 * // The reporter is just a thin convenience around this renderer.
 * const reporter = new JSONDiffReporter();
 * reporter.report(diffReport, "out/diff.json");
 * ```
 */
export class JSONRenderer implements Renderer {
  /**
   * Renders the diff report as a JSON string.
   *
   * Internally calls {@link DiffReport.serialize} to obtain a plain,
   * circular-ref-free snapshot, then `JSON.stringify`s it.
   *
   * @param diffReport - The report to render.
   * @returns A JSON string representing the full serialized report.
   */
  render(diffReport: DiffReport): string {
    return JSON.stringify(diffReport.serialize());
  }
}
