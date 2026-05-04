import type { ContextNode } from "@core/atoms";
import type { DiffPoint, DiffReport } from "@core/diff";
import type { Renderer } from "@core/renderer/Renderer";

export class DeepSpaceTheme implements Renderer {
  public render(diffReport: DiffReport): string {
    const diffPoints = diffReport.diffPoints;
    const counts = DeepSpaceTheme._counts(diffPoints);
    const cards = diffPoints.map((p) => DeepSpaceTheme._card(p)).join("\n");
    const timestamp = diffReport.reportDate;

    return /* html */ `
    <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>DOM Agent - ${diffReport.reportName} Report</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="https://fonts.googleapis.com/css2?family=Berkeley+Mono:ital,wght@0,400;0,700;1,400&family=Syne:wght@400;700;800&display=swap" rel="stylesheet" />
        <style>
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

          :root {
            --bg:           #0a0a0f;
            --surface:      #11111a;
            --surface-2:    #18182a;
            --border:       #2a2a3d;
            --text:         #c9c9e4;
            --text-dim:     #5a5a7a;
            --text-bright:  #eeeeff;

            --added:        #00e5a0;
            --added-bg:     #00e5a011;
            --deleted:      #ff4d6d;
            --deleted-bg:   #ff4d6d11;
            --reordered:    #7b8cff;
            --reordered-bg: #7b8cff11;
            --reparented:   #f5a623;
            --reparented-bg:#f5a62311;

            --tag-changed:       #e879f9;
            --tag-changed-bg:    #e879f911;
            --attribute-changed: #67e8f9;
            --attribute-changed-bg: #67e8f911;
            --text-changed:      #fbbf24;
            --text-changed-bg:   #fbbf2411;
            --grown:             #4ade80;
            --grown-bg:          #4ade8011;
            --shrunk:            #fb923c;
            --shrunk-bg:         #fb923c11;
            --depth-changed:     #a78bfa;
            --depth-changed-bg:  #a78bfa11;
          }

          body {
            background: var(--bg);
            color: var(--text);
            font-family: 'Berkeley Mono', monospace;
            font-size: 13px;
            line-height: 1.6;
            min-height: 100vh;
          }

          body::before {
            content: '';
            position: fixed;
            inset: 0;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
            pointer-events: none;
            z-index: 0;
          }

          .wrap {
            position: relative;
            z-index: 1;
            max-width: 960px;
            margin: 0 auto;
            padding: 48px 24px 96px;
          }

          header {
            margin-bottom: 48px;
            border-bottom: 1px solid var(--border);
            padding-bottom: 32px;
          }

          .logo {
            font-family: 'Syne', sans-serif;
            font-weight: 800;
            font-size: 11px;
            letter-spacing: 0.25em;
            text-transform: uppercase;
            color: var(--text-dim);
            margin-bottom: 12px;
          }

          h1 {
            font-family: 'Syne', sans-serif;
            font-weight: 800;
            font-size: 32px;
            color: var(--text-bright);
            letter-spacing: -0.02em;
            margin-bottom: 8px;
          }

          .timestamp {
            color: var(--text-dim);
            font-size: 11px;
            letter-spacing: 0.05em;
          }

          .summary {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            margin-bottom: 40px;
          }

          .pill {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 14px;
            border-radius: 4px;
            border: 1px solid;
            font-size: 11px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            font-weight: 700;
          }

          .pill-count {
            font-size: 18px;
            letter-spacing: -0.02em;
          }

          .pill.added      { color: var(--added);      border-color: var(--added);      background: var(--added-bg); }
          .pill.deleted    { color: var(--deleted);    border-color: var(--deleted);    background: var(--deleted-bg); }
          .pill.reordered  { color: var(--reordered);  border-color: var(--reordered);  background: var(--reordered-bg); }
          .pill.reparented { color: var(--reparented); border-color: var(--reparented); background: var(--reparented-bg); }
          .pill.tag-changed       { color: var(--tag-changed);       border-color: var(--tag-changed);       background: var(--tag-changed-bg); }
          .pill.attribute-changed { color: var(--attribute-changed); border-color: var(--attribute-changed); background: var(--attribute-changed-bg); }
          .pill.text-changed      { color: var(--text-changed);      border-color: var(--text-changed);      background: var(--text-changed-bg); }
          .pill.grown             { color: var(--grown);             border-color: var(--grown);             background: var(--grown-bg); }
          .pill.shrunk            { color: var(--shrunk);            border-color: var(--shrunk);            background: var(--shrunk-bg); }
          .pill.depth-changed     { color: var(--depth-changed);     border-color: var(--depth-changed);     background: var(--depth-changed-bg); }

          .section-label {
            font-size: 10px;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            color: var(--text-dim);
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .section-label::after {
            content: '';
            flex: 1;
            height: 1px;
            background: var(--border);
          }

          .cards { display: flex; flex-direction: column; gap: 12px; }

          .card {
            border: 1px solid var(--border);
            border-radius: 6px;
            overflow: hidden;
            background: var(--surface);
            transition: border-color 0.15s;
          }

          .card:hover { border-color: #3a3a5a; }

          .card-header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            cursor: pointer;
            user-select: none;
          }

          .badge {
            font-size: 9px;
            font-weight: 700;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            padding: 3px 8px;
            border-radius: 3px;
            flex-shrink: 0;
          }

          .badge.ADDED      { color: var(--added);      background: var(--added-bg);      border: 1px solid var(--added); }
          .badge.DELETED    { color: var(--deleted);    background: var(--deleted-bg);    border: 1px solid var(--deleted); }
          .badge.REORDERED  { color: var(--reordered);  background: var(--reordered-bg);  border: 1px solid var(--reordered); }
          .badge.REPARENTED { color: var(--reparented); background: var(--reparented-bg); border: 1px solid var(--reparented); }
          .badge.TAG_CHANGED       { color: var(--tag-changed);       background: var(--tag-changed-bg);       border: 1px solid var(--tag-changed); }
          .badge.ATTRIBUTE_CHANGED { color: var(--attribute-changed); background: var(--attribute-changed-bg); border: 1px solid var(--attribute-changed); }
          .badge.TEXT_CHANGED      { color: var(--text-changed);      background: var(--text-changed-bg);      border: 1px solid var(--text-changed); }
          .badge.GROWN             { color: var(--grown);             background: var(--grown-bg);             border: 1px solid var(--grown); }
          .badge.SHRUNK            { color: var(--shrunk);            background: var(--shrunk-bg);            border: 1px solid var(--shrunk); }
          .badge.DEPTH_CHANGED     { color: var(--depth-changed);     background: var(--depth-changed-bg);     border: 1px solid var(--depth-changed); }

          .card-title {
            color: var(--text-bright);
            font-size: 13px;
            flex: 1;
          }

          .card-meta {
            color: var(--text-dim);
            font-size: 11px;
          }

          .chevron {
            color: var(--text-dim);
            transition: transform 0.2s;
            font-size: 10px;
          }

          .card.open .chevron { transform: rotate(90deg); }

          .card-body {
            display: none;
            border-top: 1px solid var(--border);
            padding: 16px;
            background: var(--surface-2);
          }

          .card.open .card-body { display: block; }

          .move-summary {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            align-items: center;
            margin-bottom: 12px;
            padding: 10px 12px;
            border: 1px solid var(--border);
            border-radius: 4px;
            background: var(--surface);
            color: var(--text-bright);
          }

          .move-arrow {
            color: var(--reparented);
            font-size: 10px;
            letter-spacing: 0.12em;
            text-transform: uppercase;
          }

          .panels {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 12px;
          }

          .panels:last-child {
            margin-bottom: 0;
          }

          @media (max-width: 600px) { .panels { grid-template-columns: 1fr; } }

          .panel {
            border: 1px solid var(--border);
            border-radius: 4px;
            overflow: hidden;
          }

          .panel-label {
            font-size: 9px;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            padding: 6px 12px;
            background: var(--surface);
            border-bottom: 1px solid var(--border);
            color: var(--text-dim);
          }

          .panel-label.ref  { border-left: 2px solid var(--deleted); }
          .panel-label.tgt  { border-left: 2px solid var(--added); }
          .panel-label.none { border-left: 2px solid var(--border); font-style: italic; }

          .panel-body { padding: 12px; }

          .field { margin-bottom: 8px; }
          .field:last-child { margin-bottom: 0; }

          .field-key {
            font-size: 10px;
            color: var(--text-dim);
            letter-spacing: 0.05em;
            margin-bottom: 2px;
          }

          .field-val {
            color: var(--text-bright);
            word-break: break-all;
          }

          .sig {
            font-size: 10px;
            color: var(--text-dim);
            word-break: break-all;
            font-style: italic;
          }

          .empty {
            color: var(--text-dim);
            font-style: italic;
            font-size: 11px;
            padding: 12px;
          }

          .no-diff {
            text-align: center;
            padding: 80px 24px;
            color: var(--text-dim);
          }

          .no-diff-icon { font-size: 48px; margin-bottom: 16px; }
          .no-diff h2 { font-family: 'Syne', sans-serif; color: var(--added); font-size: 20px; margin-bottom: 8px; }
        </style>
      </head>
      <body>
      <div class="wrap">
        <header>
          <div class="logo">dom-agent</div>
          <h1>${diffReport.reportName} Report</h1>
          <div class="timestamp">${timestamp}</div>
        </header>

        <div class="summary">
          ${DeepSpaceTheme._summaryPills(counts)}
        </div>

        <div class="section-label">${diffPoints.length} change${diffPoints.length !== 1 ? "s" : ""} detected</div>

        ${
          diffPoints.length === 0
            ? `<div class="no-diff">
                <div class="no-diff-icon">*</div>
                <h2>No differences found</h2>
                <p>The two snapshots are structurally identical.</p>
              </div>`
            : `<div class="cards">${cards}</div>`
        }
      </div>

      <script>
        document.querySelectorAll('.card-header').forEach(header => {
          header.addEventListener('click', () => {
            header.closest('.card').classList.toggle('open');
          });
        });
      </script>
      </body>
      </html>`;
  }

  private static _card(point: DiffPoint<string>): string {
    const node = point.referenceNode ?? point.targetNode;
    const title = DeepSpaceTheme._nodeLabel(node);
    const baseMeta = node
      ? `depth ${node.depth} · child ${node.nthChild}/${node.siblingCount}`
      : "";
    const deltaMeta = point.delta !== undefined ? ` · Δ ${point.delta}` : "";
    const parentSummary =
      point.type === "REPARENTED"
        ? `<div class="move-summary">
             <span class="move-arrow">FROM</span>
             <span>${DeepSpaceTheme._nodeLabel(point.referenceParentNode ?? null)}</span>
             <span class="move-arrow">TO</span>
             <span>${DeepSpaceTheme._nodeLabel(point.targetParentNode ?? null)}</span>
           </div>`
        : "";
    const parentPanels =
      point.type === "REPARENTED"
        ? `<div class="panels">
             ${DeepSpaceTheme._panel("ref", "Reference Parent", point.referenceParentNode ?? null)}
             ${DeepSpaceTheme._panel("tgt", "Target Parent", point.targetParentNode ?? null)}
           </div>`
        : "";

    return /* html */ `
<div class="card">
  <div class="card-header">
    <span class="badge ${point.type}">${point.type.replace(/_/g, " ")}</span>
    <span class="card-title">${title}</span>
    <span class="card-meta">${baseMeta}${deltaMeta}</span>
    <span class="chevron">▶</span>
  </div>
  <div class="card-body">
    ${parentSummary}
    <div class="panels">
      ${DeepSpaceTheme._panel("ref", "Reference", point.referenceNode)}
      ${DeepSpaceTheme._panel("tgt", "Target", point.targetNode)}
    </div>
    ${parentPanels}
  </div>
</div>`;
  }

  private static _nodeLabel(node: ContextNode | null): string {
    if (!node) return "—";

    const attributes = Object.entries(node.attributeAnalytic)
      .map(([name, v]) => `${name}="${v.actualValue}"`)
      .join(" ");

    return `&lt;${node.tagName}${attributes ? ` ${attributes}` : ""}&gt;`;
  }

  private static _panel(
    cls: "ref" | "tgt",
    label: string,
    node: ContextNode | null,
  ): string {
    if (!node) {
      return /* html */ `
      <div class="panel">
        <div class="panel-label none">${label} — none</div>
        <div class="empty">not present in DeepSpaceTheme snapshot</div>
      </div>`;
    }

    const attrEntries =
      Object.entries(node.attributeAnalytic)
        .map(([k, v]) => `${k}: {n:${v.numberOfValues}, len:${v.totalLength}}`)
        .join(", ") || "—";

    const textPreview = node.directText
      ? `"${node.directText.slice(0, 60)}${node.directText.length > 60 ? "..." : ""}"`
      : "—";

    const parentSurface = node.parentTagName
      ? `tag:${node.parentTagName} attrs:${node.parentAttributeCount} depth:${node.parentDepth}`
      : "—";

    return /* html */ `
<div class="panel">
  <div class="panel-label ${cls}">${label}</div>
  <div class="panel-body">
    <div class="field">
      <div class="field-key">tag</div>
      <div class="field-val">${DeepSpaceTheme._nodeLabel(node)}</div>
    </div>
    <div class="field">
      <div class="field-key">position</div>
      <div class="field-val">depth ${node.depth} | nth ${node.nthChild} | siblings ${node.siblingCount}</div>
    </div>
    <div class="field">
      <div class="field-key">size</div>
      <div class="field-val">children ${node.childCount} | height ${node.height}</div>
    </div>
    <div class="field">
      <div class="field-key">directText</div>
      <div class="field-val">${textPreview}</div>
    </div>
    <div class="field">
      <div class="field-key">attributeAnalytic (${node.attributeCount})</div>
      <div class="field-val sig">${attrEntries}</div>
    </div>
    <div class="field">
      <div class="field-key">surface</div>
      <div class="field-val sig">tag:${node.tagName} | attrs:${node.attributeCount} | text:${node.directTextHash.slice(0, 12)}</div>
    </div>
    <div class="field">
      <div class="field-key">inner</div>
      <div class="field-val sig">height:${node.height} | children:${node.childCount}</div>
    </div>
    <div class="field">
      <div class="field-key">positioning</div>
      <div class="field-val sig">depth:${node.depth} | nth:${node.nthChild} | siblings:${node.siblingCount}</div>
    </div>
    <div class="field">
      <div class="field-key">parentSurface</div>
      <div class="field-val sig">${parentSurface}</div>
    </div>
  </div>
</div>`;
  }

  private static _counts(points: DiffPoint<string>[]): Record<string, number> {
    return points.reduce(
      (acc, p) => {
        acc[p.type] = (acc[p.type] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  private static _summaryPills(counts: Record<string, number>): string {
    return Object.entries(counts)
      .map(
        ([type, count]) => /* html */ `
        <div class="pill ${type.toLowerCase().replace(/_/g, "-")}">
          <span class="pill-count">${count}</span>
          ${type.replace(/_/g, " ")}
        </div>`,
      )
      .join("\n");
  }
}
