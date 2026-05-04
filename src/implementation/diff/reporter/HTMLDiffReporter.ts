import * as fs from "fs";
import * as path from "path";
import type { DiffReport, DiffReporter } from "@core/diff";
import type { Renderer } from "@core/renderer/Renderer";

export class HTMLDiffReporter implements DiffReporter {
  constructor(private readonly renderer: Renderer) {}

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
