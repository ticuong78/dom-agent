# Reporting Step

## What it does

This step takes the `DiffPoint`s produced by the diffing step, wraps them in a `DiffReport`, and writes a human- or machine-readable artifact to disk. The file name "comparing" was a leftover from an older naming pass — by the time we get here, comparing is already done; what's left is turning the diff data into something someone (or something) can consume.

Two reporters ship with the project: one for visual review (HTML, themed), one for downstream tooling (JSON, structured). Both share the same input contract and the same output side-effect (write a file and log the path), but they sit on opposite sides of a clean split between **transport** (`DiffReporter`) and **presentation** (`Renderer`).

## DiffReport — the input container

A `DiffReport` (`src/core/diff/DiffReport.ts`) is a thin wrapper around an array of `DiffPoint`s. It records when the report was generated (`reportDate`), an optional `reportName`, and the total count. You typically build one per viewer:

```ts
const hierarchyReport = new DiffReport(hierarchyViewer.highlight(v1, v2), "Hierarchy Diff");
const mutationReport  = new DiffReport(mutationViewer.highlight(v1, v2),  "Mutation Diff");
const shapeReport     = new DiffReport(shapeViewer.highlight(v1, v2),     "Shape Diff");
```

Calling `serialize()` produces a `DiffReportSnapshot` — pure primitives, no circular references, safe for `JSON.stringify`. Parent/sibling pointers inside each `DiffPoint` are resolved to ID strings before serialization.

## DiffReporter — the transport interface

`DiffReporter` (`src/core/diff/DiffReporter.ts`) is a one-method interface: `report(diffReport, outputPath)`. Anything that writes a `DiffReport` to a file or stream implements it. Two implementations ship:

**`JSONDiffReporter`** (`src/implementation/diff/reporter/JSONDiffReporter.ts`). Calls `diffReport.serialize()`, `JSON.stringify`s the result, creates the output directory if missing, and writes the file. No formatting beyond what the snapshot already provides. Default output path: `report/diff.json`. Use this when the downstream consumer is code (CI pipelines, dashboards, change-detection alerts).

**`HTMLDiffReporter`** (`src/implementation/diff/reporter/HTMLDiffReporter.ts`). Delegates the actual markup generation to a `Renderer`, then writes the returned string to disk. The reporter itself owns nothing visual — it's just file plumbing plus a hook for whatever theme you pass in. Default output path: `report/index.html`. Use this when a human will open the file.

Both reporters log `[dom-agent] report written -> <path>` after a successful write.

## Renderer — the presentation interface

`Renderer` (`src/core/renderer/Renderer.ts`) is the second one-method interface: `render(diffReport): string`. It converts a `DiffReport` into a complete HTML document (or any string output). Renderers know about visual concerns — colours, layout, badges, expandable cards — and nothing about the file system.

Two themes ship in `src/implementation/theme/`:

- **`DeepSpaceTheme`** — dark, dashboard-style, designed for a monitoring console.
- **`DashboardLikeTheme`** — clean, card-based, designed for at-a-glance review.

You pick one and pass it to `HTMLDiffReporter`:

```ts
const reporter = new HTMLDiffReporter(new DeepSpaceTheme());
reporter.report(diffReport, "report/hierarchy.html");
```

This split — `DiffReporter` for transport, `Renderer` for presentation — means you can change the look of the HTML report (a new theme) without touching the file-writing code, and you can change the output destination (a new reporter that uploads instead of writes locally) without touching the markup.

## How to build your own logic

The reporting step has the most extension points:

- **A new output format.** Implement `DiffReporter` to write Markdown, SARIF, CSV, a webhook payload — anything. Reuse `diffReport.serialize()` if a JSON-shaped intermediate is useful.
- **A new HTML theme.** Implement `Renderer` and pass it into `HTMLDiffReporter`. The two built-in themes are good references; both produce a single self-contained HTML document so the result can be emailed or stored without external assets.
- **A composite reporter.** Wrap multiple reporters behind a single `DiffReporter` implementation if you want one call to produce both an HTML file and a JSON file (the demo at `examples/demo.ts` just calls the two reporters directly — both patterns work).

The contract is small on purpose: `DiffReport` in, file on disk out. Build whatever sits inside that.
