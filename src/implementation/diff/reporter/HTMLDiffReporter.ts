import * as fs from "fs";
import * as path from "path";
import type { DiffReport, DiffReporter } from "@core/diff";
import type { Renderer } from "@core/renderer/Renderer";

/**
 * A {@link DiffReporter} that outputs an HTML file using a {@link Renderer} theme.
 *
 * Combines the diff data with a visual theme (e.g. {@link DashboardLikeTheme})
 * to produce a self-contained HTML report that can be opened in any browser.
 *
 * @example
 * ```ts
 * const reporter = new HTMLDiffReporter(new DashboardLikeTheme());
 * reporter.report(diffReport, "output/report.html");
 * // Creates a styled HTML file at output/report.html
 * ```
 */
export class HTMLDiffReporter implements DiffReporter {
  /**
   * @param renderer - The {@link Renderer} theme used to produce HTML markup.
   */
  constructor(private readonly renderer: Renderer) {}

  /**
   * Renders the diff report as HTML and writes it to disk.
   *
   * Creates parent directories if they don't exist.
   *
   * @param diffReport - The report to render.
   * @param outputPath - File path for the output HTML. Defaults to `"report/index.html"`.
   */
  public report(
    diffReport: DiffReport,
    outputPath: string = "report/index.html",
  ): void {
    const html = this.renderer.render(diffReport);
    const dir = path.dirname(outputPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, html, "utf-8");
    console.log(`[dom-agent] report written -> ${outputPath}`);
  }
}
