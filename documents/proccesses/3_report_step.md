# Reporting Step

## What it does

This step takes the `DiffPoint`s produced by the diffing step, wraps them in a `DiffSummary`, and serializes the result into a JSON-safe snapshot for storage, transmission, or further processing.

There is no built-in file writer, HTML renderer, or theme in this library. Those concerns belong in the application layer or the SaaS layer above the engine.

## DiffSummary — the data container

`DiffSummary` (`src/core/diff/DiffSummary.ts`) wraps an array of `DiffPoint`s with lightweight metadata:

| Field        | Type     | Purpose                                             |
| ------------ | -------- | --------------------------------------------------- |
| `diffPoints` | array    | The detected changes                                |
| `totalDiffs` | number   | Count of diff points                                |
| `reportDate` | Date     | When the summary was created                        |
| `reportName` | string?  | Optional label; defaults to the creation timestamp  |

```ts
import { DiffSummary } from "@ticuong78/dom-agent";

const summary = new DiffSummary(
  composite.highlight(treeV1, treeV2),
  "homepage-daily-check",
);
```

## Serialization

Call `summary.serialize()` to get a `DiffSummarySnapshot` — a pure-primitive object with no circular references, safe for `JSON.stringify()`.

```ts
const snapshot = summary.serialize();
const json = JSON.stringify(snapshot);

// Store in a database
await db.diffs.insertOne(JSON.parse(json));

// Return from an HTTP handler
res.type("application/json").send(json);

// Write to disk (plain Node.js — no reporter needed)
import { writeFileSync, mkdirSync } from "fs";
mkdirSync("report", { recursive: true });
writeFileSync("report/diff.json", json, "utf8");
```

The `DiffSummarySnapshot` shape:

```ts
type DiffSummarySnapshot = {
  reportDate: string;            // ISO 8601
  reportName: string | undefined;
  totalDiffs: number;
  diffPoints: DiffPointSnapshot[];
};
```

Each `DiffPointSnapshot` contains serialized `ContextNodeSnapshot` objects — all parent/sibling pointers are resolved to ID strings before serialization. The optional `source` field on each point records which viewer produced it (`"hierarchy"`, `"mutation"`, `"shape"`, `"composite"`, or a custom name).

## How to build your own output format

Implement whatever presentation layer you need on top of `DiffSummarySnapshot`:

- **JSON file** — `JSON.stringify(summary.serialize())` + `fs.writeFileSync`.
- **HTML report** — iterate `snapshot.diffPoints`, build markup, write with `fs.writeFileSync`.
- **API response** — return `summary.serialize()` directly from your route handler.
- **Alert / webhook** — filter `snapshot.diffPoints` by `type` or `source`, then `fetch(url, { body: JSON.stringify(filtered) })`.

The contract is small on purpose: `DiffSummary` in, structured data out. Presentation is yours to own.
