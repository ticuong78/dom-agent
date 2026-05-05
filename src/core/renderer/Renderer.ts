import type { DiffReport } from "@core/diff";

/**
 * Interface for rendering a {@link DiffReport} into a string output (typically HTML).
 *
 * Implementations provide visual themes for diff reports. Each renderer
 * transforms the structured diff data into a presentable format.
 *
 * @example
 * ```ts
 * const renderer: Renderer = new DashboardLikeTheme();
 * const html = renderer.render(diffReport);
 * fs.writeFileSync("report.html", html);
 * ```
 */
export interface Renderer {
  /**
   * Renders a diff report into a string (typically HTML markup).
   *
   * @param diffReport - The report to render.
   * @returns A complete string output (e.g. a full HTML document).
   */
  render(diffReport: DiffReport): string;
}
