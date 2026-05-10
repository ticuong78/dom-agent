import { afterEach, describe, expect, it, vi } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type { Renderer } from "@core/renderer";
import { DiffPoint, DiffReport } from "@core/diff";
import { HTMLDiffReporter, JSONDiffReporter } from "@implementation/diff/reporter";
import { createNode } from "../helpers";

const tempDirs: string[] = [];

const makeTempDir = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dom-agent-unit-"));
  tempDirs.push(dir);
  return dir;
};

afterEach(() => {
  vi.restoreAllMocks();
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("JSONDiffReporter", () => {
  it("creates parent directories and writes serialized JSON reports", () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const outputPath = path.join(makeTempDir(), "nested", "diff.json");
    const report = new DiffReport([
      new DiffPoint("ADDED", null, createNode({ id: "target" })),
    ], "json-report");

    new JSONDiffReporter().report(report, outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);
    expect(JSON.parse(fs.readFileSync(outputPath, "utf-8"))).toMatchObject({
      reportName: "json-report",
      totalDiffs: 1,
      diffPoints: [{ type: "ADDED" }],
    });
    expect(console.log).toHaveBeenCalledWith(
      `[dom-agent] report written -> ${outputPath}`,
    );
  });

  it("writes into an existing directory without recreating it", () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const dir = makeTempDir();
    const outputPath = path.join(dir, "diff.json");

    new JSONDiffReporter().report(new DiffReport([], "existing-dir"), outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);
  });
});

describe("HTMLDiffReporter", () => {
  it("renders HTML with the provided renderer and writes it to disk", () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const outputPath = path.join(makeTempDir(), "nested", "index.html");
    const renderer: Renderer = {
      render: vi.fn(() => "<html><body>ok</body></html>"),
    };
    const report = new DiffReport([], "html-report");

    new HTMLDiffReporter(renderer).report(report, outputPath);

    expect(renderer.render).toHaveBeenCalledWith(report);
    expect(fs.readFileSync(outputPath, "utf-8")).toBe(
      "<html><body>ok</body></html>",
    );
    expect(console.log).toHaveBeenCalledWith(
      `[dom-agent] report written -> ${outputPath}`,
    );
  });

  it("writes into an existing directory without recreating it", () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const dir = makeTempDir();
    const outputPath = path.join(dir, "index.html");
    const renderer: Renderer = {
      render: vi.fn(() => "<html></html>"),
    };

    new HTMLDiffReporter(renderer).report(
      new DiffReport([], "existing-html-dir"),
      outputPath,
    );

    expect(fs.readFileSync(outputPath, "utf-8")).toBe("<html></html>");
  });
});
