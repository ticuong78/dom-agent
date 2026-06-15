import type { ContextNode } from "@core/atoms";
import type { DiffPoint, DiffReport } from "@core/diff";
import type { Renderer } from "@core/renderer";

export class DashboardLikeTheme implements Renderer {
  public render(diffReport: DiffReport): string {
    const diffPoints = diffReport.diffPoints;
    const counts = DashboardLikeTheme._counts(diffPoints);
    const totalChanges = diffPoints.length;
    const cards = diffPoints.map((p) => DashboardLikeTheme._card(p)).join("\n");
    const timestamp = diffReport.reportDate;

    const mostFrequentType =
      Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "NONE";
    const criticalCount =
      (counts.DELETED ?? 0) +
      (counts.REPARENTED ?? 0) +
      (counts.TAG_CHANGED ?? 0) +
      (counts.ATTRIBUTE_CHANGED ?? 0);

    return /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DOM Agent • ${diffReport.reportName}</title>

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap"
    rel="stylesheet"
  />

  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    :root {
      --bg: #081018;
      --bg-2: #0b1420;
      --surface: rgba(15, 23, 36, 0.82);
      --surface-2: rgba(18, 28, 44, 0.92);
      --surface-3: rgba(12, 20, 32, 0.96);
      --border: rgba(130, 160, 220, 0.14);
      --border-strong: rgba(130, 160, 220, 0.24);
      --text: #c9d5e7;
      --text-dim: #7f93b2;
      --text-soft: #9eb0ca;
      --text-bright: #f4f8ff;

      --shadow: 0 10px 30px rgba(0, 0, 0, 0.28);
      --radius: 18px;
      --radius-sm: 12px;

      --added: #22c55e;
      --added-bg: rgba(34, 197, 94, 0.12);

      --deleted: #f43f5e;
      --deleted-bg: rgba(244, 63, 94, 0.12);

      --reordered: #60a5fa;
      --reordered-bg: rgba(96, 165, 250, 0.12);

      --reparented: #f59e0b;
      --reparented-bg: rgba(245, 158, 11, 0.12);

      --tag-changed: #d946ef;
      --tag-changed-bg: rgba(217, 70, 239, 0.12);

      --attribute-changed: #22d3ee;
      --attribute-changed-bg: rgba(34, 211, 238, 0.12);

      --text-changed: #facc15;
      --text-changed-bg: rgba(250, 204, 21, 0.12);

      --grown: #4ade80;
      --grown-bg: rgba(74, 222, 128, 0.12);

      --shrunk: #fb923c;
      --shrunk-bg: rgba(251, 146, 60, 0.12);

      --depth-changed: #a78bfa;
      --depth-changed-bg: rgba(167, 139, 250, 0.12);
    }

    html, body {
      min-height: 100%;
      background:
        radial-gradient(circle at top left, rgba(56, 189, 248, 0.08), transparent 30%),
        radial-gradient(circle at top right, rgba(168, 85, 247, 0.08), transparent 28%),
        linear-gradient(180deg, var(--bg), var(--bg-2));
      color: var(--text);
      font-family: "Inter", sans-serif;
    }

    body::before {
      content: "";
      position: fixed;
      inset: 0;
      pointer-events: none;
      opacity: 0.06;
      background-image:
        linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
      background-size: 32px 32px;
      mask-image: radial-gradient(circle at center, black 35%, transparent 100%);
    }

    code, .mono, .node-tag, .metric-value, .badge, .mini-kpi-value, .card-meta, .timestamp {
      font-family: "JetBrains Mono", monospace;
    }

    .app {
      position: relative;
      z-index: 1;
      max-width: 1480px;
      margin: 0 auto;
      padding: 28px;
    }

    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-mark {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: linear-gradient(135deg, #22d3ee, #8b5cf6);
      box-shadow: 0 0 24px rgba(34, 211, 238, 0.5);
    }

    .brand-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .brand-label {
      font-size: 11px;
      color: var(--text-dim);
      letter-spacing: 0.18em;
      text-transform: uppercase;
      font-weight: 700;
    }

    .brand-title {
      color: var(--text-bright);
      font-size: 14px;
      font-weight: 700;
    }

    .timestamp {
      color: var(--text-dim);
      font-size: 12px;
    }

    .hero {
      display: grid;
      grid-template-columns: 1.6fr 1fr;
      gap: 18px;
      margin-bottom: 18px;
    }

    .hero-main,
    .hero-side,
    .stats-grid,
    .sidebar-card,
    .stream-card,
    .card,
    .empty-state {
      background: var(--surface);
      border: 1px solid var(--border);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      box-shadow: var(--shadow);
    }

    .hero-main,
    .hero-side,
    .stream-card,
    .sidebar-card,
    .empty-state {
      border-radius: var(--radius);
    }

    .hero-main {
      padding: 24px;
      min-height: 190px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .eyebrow {
      color: #7dd3fc;
      font-size: 11px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      font-weight: 700;
      margin-bottom: 10px;
    }

    .hero-title {
      color: var(--text-bright);
      font-size: 34px;
      line-height: 1.05;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin-bottom: 12px;
    }

    .hero-subtitle {
      color: var(--text-soft);
      max-width: 820px;
      line-height: 1.65;
      font-size: 14px;
    }

    .hero-main-footer {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 22px;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(255,255,255,0.04);
      border: 1px solid var(--border);
      color: var(--text-soft);
      font-size: 12px;
      font-weight: 600;
    }

    .chip strong {
      color: var(--text-bright);
      font-weight: 700;
    }

    .hero-side {
      padding: 18px;
      display: grid;
      gap: 12px;
      align-content: start;
    }

    .mini-kpi {
      border: 1px solid var(--border);
      background: var(--surface-2);
      border-radius: 14px;
      padding: 14px;
    }

    .mini-kpi-label {
      font-size: 11px;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.14em;
      margin-bottom: 8px;
    }

    .mini-kpi-value {
      font-size: 24px;
      color: var(--text-bright);
      font-weight: 800;
      letter-spacing: -0.04em;
      margin-bottom: 6px;
    }

    .mini-kpi-sub {
      font-size: 12px;
      color: var(--text-soft);
      line-height: 1.55;
    }

    .stats-grid {
      border-radius: var(--radius);
      padding: 18px;
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 14px;
      margin-bottom: 18px;
    }

    .metric {
      min-width: 0;
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 16px;
      background: var(--surface-2);
    }

    .metric-label {
      font-size: 11px;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.14em;
      margin-bottom: 10px;
    }

    .metric-value {
      font-size: 28px;
      line-height: 1;
      color: var(--text-bright);
      font-weight: 800;
      letter-spacing: -0.05em;
      margin-bottom: 8px;
    }

    .metric-sub {
      color: var(--text-soft);
      font-size: 12px;
      line-height: 1.55;
    }

    .dashboard {
      display: grid;
      grid-template-columns: minmax(0, 1.8fr) 360px;
      gap: 18px;
      align-items: start;
    }

    .stream-card {
      padding: 18px;
    }

    .stream-header,
    .sidebar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .section-title {
      color: var(--text-bright);
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .section-caption {
      color: var(--text-dim);
      font-size: 12px;
    }

    .filter-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    }

    .filter-pill {
      padding: 8px 12px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: rgba(255,255,255,0.03);
      color: var(--text-soft);
      font-size: 12px;
      font-weight: 600;
    }

    .cards {
      display: grid;
      gap: 14px;
    }

    .card {
      border-radius: 16px;
      overflow: hidden;
      background: var(--surface-2);
      border: 1px solid var(--border);
      transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
    }

    .card:hover {
      border-color: var(--border-strong);
      transform: translateY(-1px);
    }

    .card-header {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto auto;
      align-items: center;
      gap: 12px;
      padding: 16px 18px;
      cursor: pointer;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 28px;
      padding: 0 10px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      white-space: nowrap;
      border: 1px solid transparent;
    }

    .badge.ADDED { color: var(--added); background: var(--added-bg); border-color: rgba(34,197,94,0.28); }
    .badge.DELETED { color: var(--deleted); background: var(--deleted-bg); border-color: rgba(244,63,94,0.28); }
    .badge.REORDERED { color: var(--reordered); background: var(--reordered-bg); border-color: rgba(96,165,250,0.28); }
    .badge.REPARENTED { color: var(--reparented); background: var(--reparented-bg); border-color: rgba(245,158,11,0.28); }
    .badge.TAG_CHANGED { color: var(--tag-changed); background: var(--tag-changed-bg); border-color: rgba(217,70,239,0.28); }
    .badge.ATTRIBUTE_CHANGED { color: var(--attribute-changed); background: var(--attribute-changed-bg); border-color: rgba(34,211,238,0.28); }
    .badge.TEXT_CHANGED { color: var(--text-changed); background: var(--text-changed-bg); border-color: rgba(250,204,21,0.28); }
    .badge.GROWN { color: var(--grown); background: var(--grown-bg); border-color: rgba(74,222,128,0.28); }
    .badge.SHRUNK { color: var(--shrunk); background: var(--shrunk-bg); border-color: rgba(251,146,60,0.28); }
    .badge.DEPTH_CHANGED { color: var(--depth-changed); background: var(--depth-changed-bg); border-color: rgba(167,139,250,0.28); }

    .card-title-wrap {
      min-width: 0;
    }

    .card-title {
      color: var(--text-bright);
      font-size: 14px;
      font-weight: 700;
      line-height: 1.5;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-bottom: 4px;
    }

    .node-tag {
      color: #8be9fd;
    }

    .card-subtitle {
      color: var(--text-dim);
      font-size: 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .card-meta {
      color: var(--text-soft);
      font-size: 12px;
      white-space: nowrap;
    }

    .chevron {
      color: var(--text-dim);
      transition: transform 0.2s ease;
      font-size: 12px;
    }

    .card.open .chevron {
      transform: rotate(90deg);
    }

    .card-body {
      display: none;
      padding: 0 18px 18px;
      border-top: 1px solid var(--border);
      background: linear-gradient(180deg, rgba(255,255,255,0.01), transparent 26%);
    }

    .card.open .card-body {
      display: block;
    }

    .move-summary {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: var(--surface-3);
      padding: 14px;
      margin-top: 16px;
      margin-bottom: 14px;
    }

    .move-arrow {
      color: var(--reparented);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .panels {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
      margin-top: 16px;
    }

    .panel {
      border: 1px solid var(--border);
      border-radius: 14px;
      overflow: hidden;
      background: rgba(255,255,255,0.02);
    }

    .panel-label {
      padding: 12px 14px;
      background: rgba(255,255,255,0.025);
      border-bottom: 1px solid var(--border);
      color: var(--text-bright);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .panel-label.ref {
      border-left: 3px solid var(--deleted);
    }

    .panel-label.tgt {
      border-left: 3px solid var(--added);
    }

    .panel-label.none {
      border-left: 3px solid var(--text-dim);
      color: var(--text-dim);
      font-style: italic;
    }

    .panel-body {
      padding: 14px;
      display: grid;
      gap: 12px;
    }

    .field {
      padding: 10px 12px;
      border: 1px solid rgba(255,255,255,0.04);
      border-radius: 10px;
      background: rgba(255,255,255,0.015);
    }

    .field-key {
      color: var(--text-dim);
      font-size: 11px;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
      text-transform: uppercase;
    }

    .field-val {
      color: var(--text-bright);
      font-size: 13px;
      word-break: break-word;
      line-height: 1.55;
    }

    .sig {
      color: var(--text-soft);
      font-size: 12px;
    }

    .empty {
      padding: 16px;
      color: var(--text-dim);
      font-style: italic;
      font-size: 13px;
    }

    .sidebar {
      position: sticky;
      top: 24px;
      display: grid;
      gap: 18px;
    }

    .sidebar-card {
      padding: 18px;
    }

    .legend {
      display: grid;
      gap: 10px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--surface-2);
    }

    .legend-left {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .legend-name {
      color: var(--text-soft);
      font-size: 13px;
      font-weight: 600;
    }

    .legend-value {
      color: var(--text-bright);
      font-size: 13px;
      font-weight: 800;
    }

    .sidebar-list {
      display: grid;
      gap: 10px;
    }

    .sidebar-list-item {
      padding: 12px 14px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: var(--surface-2);
    }

    .sidebar-list-label {
      color: var(--text-dim);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 6px;
    }

    .sidebar-list-value {
      color: var(--text-bright);
      font-size: 14px;
      font-weight: 700;
      line-height: 1.55;
      word-break: break-word;
    }

    .empty-state {
      text-align: center;
      padding: 80px 24px;
    }

    .empty-icon {
      font-size: 42px;
      margin-bottom: 12px;
    }

    .empty-title {
      color: var(--text-bright);
      font-size: 24px;
      font-weight: 800;
      margin-bottom: 8px;
    }

    .empty-copy {
      color: var(--text-soft);
      max-width: 560px;
      margin: 0 auto;
      line-height: 1.7;
      font-size: 14px;
    }

    @media (max-width: 1180px) {
      .hero,
      .dashboard {
        grid-template-columns: 1fr;
      }

      .sidebar {
        position: static;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 760px) {
      .app {
        padding: 18px;
      }

      .hero-title {
        font-size: 28px;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }

      .card-header {
        grid-template-columns: 1fr;
        align-items: start;
      }

      .panels {
        grid-template-columns: 1fr;
      }

      .topbar {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  </style>
</head>
<body>
  <div class="app">
    <div class="topbar">
      <div class="brand">
        <div class="brand-mark"></div>
        <div class="brand-text">
          <div class="brand-label">DOM Agent</div>
          <div class="brand-title">Structural Diff Dashboard</div>
        </div>
      </div>
      <div class="timestamp">${timestamp}</div>
    </div>

    <section class="hero">
      <div class="hero-main">
        <div>
          <div class="eyebrow">Comparison Report</div>
          <h1 class="hero-title">${diffReport.reportName}</h1>
          <p class="hero-subtitle">
            A dashboard-oriented structural diff report showing change distribution,
            node-level impact, and side-by-side reference versus target analysis.
          </p>
        </div>

        <div class="hero-main-footer">
          <div class="chip">Total Changes <strong>${totalChanges}</strong></div>
          <div class="chip">Primary Signal <strong>${mostFrequentType.replace(/_/g, " ")}</strong></div>
          <div class="chip">Critical Set <strong>${criticalCount}</strong></div>
        </div>
      </div>

      <div class="hero-side">
        <div class="mini-kpi">
          <div class="mini-kpi-label">Dominant Change</div>
          <div class="mini-kpi-value">${mostFrequentType.replace(/_/g, " ")}</div>
          <div class="mini-kpi-sub">The most frequent diff category in this snapshot comparison.</div>
        </div>

        <div class="mini-kpi">
          <div class="mini-kpi-label">Change Density</div>
          <div class="mini-kpi-value">${totalChanges === 0 ? "0%" : "100%"}</div>
          <div class="mini-kpi-sub">This page is focused entirely on surfaced structural deviations.</div>
        </div>
      </div>
    </section>

    <section class="stats-grid">
      <div class="metric">
        <div class="metric-label">Added</div>
        <div class="metric-value">${counts.ADDED ?? 0}</div>
        <div class="metric-sub">Nodes introduced in the target snapshot.</div>
      </div>
      <div class="metric">
        <div class="metric-label">Deleted</div>
        <div class="metric-value">${counts.DELETED ?? 0}</div>
        <div class="metric-sub">Nodes present in reference but missing in target.</div>
      </div>
      <div class="metric">
        <div class="metric-label">Attribute Changed</div>
        <div class="metric-value">${counts.ATTRIBUTE_CHANGED ?? 0}</div>
        <div class="metric-sub">Attribute footprint or value changes detected.</div>
      </div>
      <div class="metric">
        <div class="metric-label">Reparented</div>
        <div class="metric-value">${counts.REPARENTED ?? 0}</div>
        <div class="metric-sub">Nodes that moved under a different parent.</div>
      </div>
      <div class="metric">
        <div class="metric-label">Text Changed</div>
        <div class="metric-value">${counts.TEXT_CHANGED ?? 0}</div>
        <div class="metric-sub">Direct textual content differences surfaced.</div>
      </div>
    </section>

    ${
      totalChanges === 0
        ? `
        <div class="empty-state">
          <div class="empty-icon">◎</div>
          <div class="empty-title">No differences found</div>
          <p class="empty-copy">
            The reference and target snapshots are structurally identical.
            No meaningful node-level deviations were detected in this run.
          </p>
        </div>
        `
        : `
        <section class="dashboard">
          <div class="stream-card">
            <div class="stream-header">
              <div>
                <div class="section-title">Diff Stream</div>
                <div class="section-caption">${totalChanges} surfaced item${totalChanges !== 1 ? "s" : ""}</div>
              </div>
              <div class="section-caption">Click a row to inspect full node context</div>
            </div>

            <div class="filter-row">
              ${DashboardLikeTheme._summaryPills(counts)}
            </div>

            <div class="cards">
              ${cards}
            </div>
          </div>

          <aside class="sidebar">
            <div class="sidebar-card">
              <div class="sidebar-header">
                <div class="section-title">Change Legend</div>
              </div>
              <div class="legend">
                ${DashboardLikeTheme._legendItem("Added", counts.ADDED ?? 0, "var(--added)")}
                ${DashboardLikeTheme._legendItem("Deleted", counts.DELETED ?? 0, "var(--deleted)")}
                ${DashboardLikeTheme._legendItem("Reordered", counts.REORDERED ?? 0, "var(--reordered)")}
                ${DashboardLikeTheme._legendItem("Reparented", counts.REPARENTED ?? 0, "var(--reparented)")}
                ${DashboardLikeTheme._legendItem("Tag Changed", counts.TAG_CHANGED ?? 0, "var(--tag-changed)")}
                ${DashboardLikeTheme._legendItem("Attribute Changed", counts.ATTRIBUTE_CHANGED ?? 0, "var(--attribute-changed)")}
                ${DashboardLikeTheme._legendItem("Text Changed", counts.TEXT_CHANGED ?? 0, "var(--text-changed)")}
                ${DashboardLikeTheme._legendItem("Grown", counts.GROWN ?? 0, "var(--grown)")}
                ${DashboardLikeTheme._legendItem("Shrunk", counts.SHRUNK ?? 0, "var(--shrunk)")}
                ${DashboardLikeTheme._legendItem("Depth Changed", counts.DEPTH_CHANGED ?? 0, "var(--depth-changed)")}
              </div>
            </div>

            <div class="sidebar-card">
              <div class="sidebar-header">
                <div class="section-title">Run Summary</div>
              </div>
              <div class="sidebar-list">
                <div class="sidebar-list-item">
                  <div class="sidebar-list-label">Report Name</div>
                  <div class="sidebar-list-value">${diffReport.reportName}</div>
                </div>
                <div class="sidebar-list-item">
                  <div class="sidebar-list-label">Timestamp</div>
                  <div class="sidebar-list-value">${timestamp}</div>
                </div>
                <div class="sidebar-list-item">
                  <div class="sidebar-list-label">Most Frequent Type</div>
                  <div class="sidebar-list-value">${mostFrequentType.replace(/_/g, " ")}</div>
                </div>
                <div class="sidebar-list-item">
                  <div class="sidebar-list-label">Critical Change Count</div>
                  <div class="sidebar-list-value">${criticalCount}</div>
                </div>
              </div>
            </div>
          </aside>
        </section>
        `
    }
  </div>

  <script>
    document.querySelectorAll(".card-header").forEach((header) => {
      header.addEventListener("click", () => {
        header.closest(".card")?.classList.toggle("open");
      });
    });
  </script>
</body>
</html>`;
  }

  private static _card(point: DiffPoint<string>): string {
    const node = point.referenceNode ?? point.targetNode;
    const title = DashboardLikeTheme._nodeLabel(node);
    const baseMeta = node
      ? `depth ${node.depth} • child ${node.nthChild}/${node.siblingCount}`
      : "no node metadata";
    const deltaMeta = point.delta !== undefined ? ` • Δ ${point.delta}` : "";

    const parentSummary =
      point.type === "REPARENTED"
        ? `
          <div class="move-summary">
            <span class="move-arrow">FROM</span>
            <span>${DashboardLikeTheme._nodeLabel(point.referenceParentNode ?? null)}</span>
            <span class="move-arrow">TO</span>
            <span>${DashboardLikeTheme._nodeLabel(point.targetParentNode ?? null)}</span>
          </div>
        `
        : "";

    const parentPanels =
      point.type === "REPARENTED"
        ? `
          <div class="panels">
            ${DashboardLikeTheme._panel("ref", "Reference Parent", point.referenceParentNode ?? null)}
            ${DashboardLikeTheme._panel("tgt", "Target Parent", point.targetParentNode ?? null)}
          </div>
        `
        : "";

    return /* html */ `
<div class="card">
  <div class="card-header">
    <span class="badge ${point.type}">${point.type.replace(/_/g, " ")}</span>

    <div class="card-title-wrap">
      <div class="card-title">${title}</div>
      <div class="card-subtitle">Node-level structural diff inspection</div>
    </div>

    <span class="card-meta">${baseMeta}${deltaMeta}</span>
    <span class="chevron">▶</span>
  </div>

  <div class="card-body">
    ${parentSummary}

    <div class="panels">
      ${DashboardLikeTheme._panel("ref", "Reference", point.referenceNode)}
      ${DashboardLikeTheme._panel("tgt", "Target", point.targetNode)}
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

    return `<span class="node-tag">&lt;${node.tagName}${attributes ? ` ${attributes}` : ""}&gt;</span>`;
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
  <div class="empty">Not present in this snapshot.</div>
</div>`;
    }

    const attrEntries =
      Object.entries(node.attributeAnalytic)
        .map(([k, v]) => `${k}: {n:${v.numberOfValues}, len:${v.totalLength}}`)
        .join(", ") || "—";

    const textPreview = node.directText
      ? `"${node.directText.slice(0, 90)}${node.directText.length > 90 ? "..." : ""}"`
      : "—";

    const parentSurface = node.parentTagName
      ? `tag:${node.parentTagName} attrs:${node.parentAttributeCount} depth:${node.parentDepth}`
      : "—";

    return /* html */ `
<div class="panel">
  <div class="panel-label ${cls}">${label}</div>
  <div class="panel-body">
    <div class="field">
      <div class="field-key">Tag</div>
      <div class="field-val">${DashboardLikeTheme._nodeLabel(node)}</div>
    </div>

    <div class="field">
      <div class="field-key">Position</div>
      <div class="field-val">depth ${node.depth} | nth ${node.nthChild} | siblings ${node.siblingCount}</div>
    </div>

    <div class="field">
      <div class="field-key">Size</div>
      <div class="field-val">children ${node.childCount} | height ${node.height}</div>
    </div>

    <div class="field">
      <div class="field-key">Direct Text</div>
      <div class="field-val">${textPreview}</div>
    </div>

    <div class="field">
      <div class="field-key">Attribute Analytic (${node.attributeCount})</div>
      <div class="field-val sig">${attrEntries}</div>
    </div>

    <div class="field">
      <div class="field-key">Surface</div>
      <div class="field-val sig">tag:${node.tagName} | attrs:${node.attributeCount} | text:${node.directTextHash.slice(0, 12)}</div>
    </div>

    <div class="field">
      <div class="field-key">Inner</div>
      <div class="field-val sig">height:${node.height} | children:${node.childCount}</div>
    </div>

    <div class="field">
      <div class="field-key">Positioning</div>
      <div class="field-val sig">depth:${node.depth} | nth:${node.nthChild} | siblings:${node.siblingCount}</div>
    </div>

    <div class="field">
      <div class="field-key">Parent Surface</div>
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
        ([type, count]) => `
          <div class="filter-pill">
            ${type.replace(/_/g, " ")} · ${count}
          </div>
        `,
      )
      .join("\n");
  }

  private static _legendItem(
    label: string,
    value: number,
    color: string,
  ): string {
    return `
      <div class="legend-item">
        <div class="legend-left">
          <span class="legend-dot" style="background:${color}"></span>
          <span class="legend-name">${label}</span>
        </div>
        <span class="legend-value">${value}</span>
      </div>
    `;
  }
}
