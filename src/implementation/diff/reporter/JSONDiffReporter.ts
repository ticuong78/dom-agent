import * as fs from "fs";
import * as path from "path";
import type { DiffReport } from "@core/diff";
import type { DiffReporter } from "@core/diff/DiffReporter";

export class JSONDiffReporter implements DiffReporter {
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
