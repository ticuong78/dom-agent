import { describe, expect, it } from "vitest";
import { diff } from "../src";
import type { DiffPoint } from "../src/diffs/points";
import type { StandardDiffType } from "../src/diffs/viewers";

// ─── V1: Reference snapshot ─────────────────────────────────
const htmlV1 = `
<!DOCTYPE html>
<html lang="en">
<body>
  <div class="root" id="app" data-v="1">
    Version One

    <!-- TEXT_CHANGED: directText will change from "Welcome Old" to "Welcome New" -->
    <header class="site-header" data-s="header">Welcome Old</header>

    <!-- SHRUNK: will lose third child (lnk-help) → childCount 3→2 -->
    <nav class="site-nav" data-s="nav">
      <a class="lnk-home" data-to="home">Home</a>
      <a class="lnk-about" data-to="about">About</a>
      <a class="lnk-help" data-to="help">Help</a>
    </nav>

    <!-- REORDERED: col-left (nthChild 0→1) and col-right (nthChild 1→0) will swap -->
    <div class="columns" data-s="cols">
      <div class="col-left" data-pos="left">Left Panel</div>
      <div class="col-right" data-pos="right">Right Panel</div>
    </div>

    <!-- TRAP: uncle/bob must NOT match aunt/sarah — attr values differ -->
    <!-- Expected: DELETED uncle + span[bob] -->
    <div class="uncle" data-role="uncle">
      <span class="tag" data-who="bob">Uncle Bob</span>
    </div>

    <!-- TAG_CHANGED: div→section (mutation viewer pairs by depth+attrs, hierarchy sees DELETED+ADDED) -->
    <!-- REPARENTED: child p.note gets parentTagName change div→section -->
    <div class="bulletin" data-s="bulletin">
      <p class="note" data-id="n1">Note one</p>
    </div>

    <!-- ATTRIBUTE_CHANGED: will gain data-verified="true" (attributeCount 2→3) -->
    <!-- REPARENTED: child p.bio gets parentAttributeCount change 2→3 -->
    <div class="profile" data-s="profile">
      <p class="bio" data-id="bio">My bio</p>
    </div>

    <!-- REPARENTED: widget moves from depth 1→2 inside new dock wrapper -->
    <!-- REPARENTED: child p.w-body follows widget deeper (depth 2→3) -->
    <div class="widget" data-role="widget">
      <p class="w-body" data-id="w1">Widget body</p>
    </div>

    <!-- GROWN: childCount 1→3 (gains ph-two, ph-three) -->
    <div class="photos" data-s="photos">
      <img class="ph-one" data-id="p1" />
    </div>

    <!-- DEPTH_CHANGED: forum height 1→2 (msg-a gains nested reply) -->
    <!-- msg-a itself: GROWN childCount 0→1, DEPTH_CHANGED height 0→1 -->
    <div class="forum" data-s="forum">
      <div class="msg-a" data-id="ma">Message A</div>
      <div class="msg-b" data-id="mb">Message B</div>
    </div>

    <!-- DELETED: entire footer subtree removed -->
    <footer class="old-footer" data-s="footer">
      <p class="bye" data-id="bye">Goodbye</p>
    </footer>
  </div>
</body>
</html>
`;

// ─── V2: Target snapshot ─────────────────────────────────────
const htmlV2 = `
<!DOCTYPE html>
<html lang="en">
<body>
  <div class="root" id="app" data-v="1">
    Version Two

    <!-- TEXT_CHANGED -->
    <header class="site-header" data-s="header">Welcome New</header>

    <!-- SHRUNK: lost lnk-help -->
    <nav class="site-nav" data-s="nav">
      <a class="lnk-home" data-to="home">Home</a>
      <a class="lnk-about" data-to="about">About</a>
    </nav>

    <!-- REORDERED: children swapped -->
    <div class="columns" data-s="cols">
      <div class="col-right" data-pos="right">Right Panel</div>
      <div class="col-left" data-pos="left">Left Panel</div>
    </div>

    <!-- TRAP: aunt sarah — different attribute values → ADDED -->
    <div class="aunt" data-role="aunt">
      <span class="tag" data-who="sarah">Aunt Sarah</span>
    </div>

    <!-- TAG_CHANGED: section instead of div -->
    <section class="bulletin" data-s="bulletin">
      <p class="note" data-id="n1">Note one</p>
    </section>

    <!-- ATTRIBUTE_CHANGED: gained data-verified -->
    <div class="profile" data-s="profile" data-verified="true">
      <p class="bio" data-id="bio">My bio</p>
    </div>

    <!-- REPARENTED: widget now inside dock wrapper -->
    <!-- ADDED: widget-dock is entirely new -->
    <div class="widget-dock" data-s="dock">
      <div class="widget" data-role="widget">
        <p class="w-body" data-id="w1">Widget body</p>
      </div>
    </div>

    <!-- GROWN: more images -->
    <div class="photos" data-s="photos">
      <img class="ph-one" data-id="p1" />
      <img class="ph-two" data-id="p2" />
      <img class="ph-three" data-id="p3" />
    </div>

    <!-- DEPTH_CHANGED: msg-a now has a nested reply -->
    <div class="forum" data-s="forum">
      <div class="msg-a" data-id="ma">
        Message A
        <div class="reply" data-id="r1">Reply to A</div>
      </div>
      <div class="msg-b" data-id="mb">Message B</div>
    </div>

    <!-- ADDED: entirely new promo section -->
    <section class="promo" data-s="promo">
      <h2 class="promo-title" data-id="pt1">Special Offer</h2>
    </section>
  </div>
</body>
</html>
`;

// ─── Helpers ─────────────────────────────────────────────────

type DiffKey = `[${string}] ${string}`;

/** Build a lookup-friendly key from a DiffPoint. */
function toKey(d: DiffPoint<StandardDiffType>): DiffKey {
  const ref = d.referenceNode?.tagName ?? "—";
  const tar = d.targetNode?.tagName ?? "—";
  return `[${d.source}] ${d.type}: ${ref} -> ${tar}`;
}

/** Collect all diffs matching a key pattern. */
function findAll(
  diffs: DiffPoint<StandardDiffType>[],
  source: string,
  type: string,
): DiffPoint<StandardDiffType>[] {
  return diffs.filter((d) => d.source === source && d.type === type);
}

/** Find first diff matching source + type + optional node predicate. */
function findOne(
  diffs: DiffPoint<StandardDiffType>[],
  source: string,
  type: string,
  predicate?: (d: DiffPoint<StandardDiffType>) => boolean,
): DiffPoint<StandardDiffType> | undefined {
  return diffs.find(
    (d) =>
      d.source === source && d.type === type && (!predicate || predicate(d)),
  );
}

// ─── Tests ───────────────────────────────────────────────────

describe("e2e: V1 → V2 full diff", () => {
  const diffs = diff({ first: htmlV1, second: htmlV2 });

  it("produces exactly 37 diffs", () => {
    expect(diffs).toHaveLength(37);
  });

  // ── Hierarchy: REORDERED ────────────────────────────────────

  describe("hierarchy: REORDERED", () => {
    const reordered = findAll(diffs, "hierarchy", "REORDERED");

    it("detects 2 reordered nodes (col-left, col-right)", () => {
      expect(reordered).toHaveLength(2);
    });

    it("col-left swapped from nthChild 0 to 1", () => {
      const colLeft = reordered.find(
        (d) => d.referenceNode!.directText === "Left Panel",
      );

      expect(colLeft).toBeDefined();
      expect(colLeft!.referenceNode!.nthChild).toBe(0);
      expect(colLeft!.targetNode!.nthChild).toBe(1);
    });

    it("col-right swapped from nthChild 1 to 0", () => {
      const colRight = reordered.find(
        (d) => d.referenceNode!.directText === "Right Panel",
      );

      expect(colRight).toBeDefined();
      expect(colRight!.referenceNode!.nthChild).toBe(1);
      expect(colRight!.targetNode!.nthChild).toBe(0);
    });
  });

  // ── Hierarchy: REPARENTED ───────────────────────────────────

  describe("hierarchy: REPARENTED", () => {
    const reparented = findAll(diffs, "hierarchy", "REPARENTED");

    it("detects 4 reparented nodes", () => {
      expect(reparented).toHaveLength(4);
    });

    it("p.note reparented due to bulletin tag change (div→section)", () => {
      const pNote = reparented.find(
        (d) => d.referenceNode!.directText === "Note one",
      );

      expect(pNote).toBeDefined();
      expect(pNote!.referenceParentNode!.tagName).toBe("div");
      expect(pNote!.targetParentNode!.tagName).toBe("section");
    });

    it("p.bio reparented due to profile gaining data-verified", () => {
      const pBio = reparented.find(
        (d) => d.referenceNode!.directText === "My bio",
      );

      expect(pBio).toBeDefined();
      expect(pBio!.referenceParentNode!.attributeCount).toBe(2);
      expect(pBio!.targetParentNode!.attributeCount).toBe(3);
    });

    it("div.widget reparented into dock wrapper (depth 2→3)", () => {
      const widget = reparented.find(
        (d) =>
          d.referenceNode!.tagName === "div" &&
          d.referenceNode!.attributeAnalytic["data-role"]?.actualValue ===
            "widget",
      );

      expect(widget).toBeDefined();
      expect(widget!.referenceNode!.depth).toBe(2);
      expect(widget!.targetNode!.depth).toBe(3);
    });

    it("p.w-body follows widget deeper (depth 3→4)", () => {
      const wBody = reparented.find(
        (d) => d.referenceNode!.directText === "Widget body",
      );

      expect(wBody).toBeDefined();
      expect(wBody!.referenceNode!.depth).toBe(3);
      expect(wBody!.targetNode!.depth).toBe(4);
    });
  });

  // ── Hierarchy: DELETED ──────────────────────────────────────

  describe("hierarchy: DELETED", () => {
    const deleted = findAll(diffs, "hierarchy", "DELETED");

    it("detects 7 deleted nodes", () => {
      expect(deleted).toHaveLength(7);
    });

    it("includes body (noise — 0-attr root cannot pair)", () => {
      expect(deleted.some((d) => d.referenceNode!.tagName === "body")).toBe(
        true,
      );
    });

    it("includes a.lnk-help (SHRUNK child)", () => {
      expect(
        deleted.some((d) => d.referenceNode!.directText === "Help"),
      ).toBe(true);
    });

    it("includes div.uncle (TRAP — attr values differ)", () => {
      expect(
        deleted.some(
          (d) =>
            d.referenceNode!.attributeAnalytic["data-role"]?.actualValue ===
            "uncle",
        ),
      ).toBe(true);
    });

    it("includes span.tag[bob] (TRAP child)", () => {
      expect(
        deleted.some((d) => d.referenceNode!.directText === "Uncle Bob"),
      ).toBe(true);
    });

    it("includes div.bulletin (hierarchy can't pair tag change)", () => {
      expect(
        deleted.some(
          (d) =>
            d.referenceNode!.tagName === "div" &&
            d.referenceNode!.attributeAnalytic["data-s"]?.actualValue ===
              "bulletin",
        ),
      ).toBe(true);
    });

    it("includes footer.old-footer", () => {
      expect(
        deleted.some((d) => d.referenceNode!.tagName === "footer"),
      ).toBe(true);
    });

    it("includes p.bye (footer child)", () => {
      expect(
        deleted.some((d) => d.referenceNode!.directText === "Goodbye"),
      ).toBe(true);
    });
  });

  // ── Hierarchy: ADDED ────────────────────────────────────────

  describe("hierarchy: ADDED", () => {
    const added = findAll(diffs, "hierarchy", "ADDED");

    it("detects 10 added nodes", () => {
      expect(added).toHaveLength(10);
    });

    it("includes body (noise — mirror of body DELETED)", () => {
      expect(added.some((d) => d.targetNode!.tagName === "body")).toBe(true);
    });

    it("includes div.aunt (TRAP counterpart)", () => {
      expect(
        added.some(
          (d) =>
            d.targetNode!.attributeAnalytic["data-role"]?.actualValue ===
            "aunt",
        ),
      ).toBe(true);
    });

    it("includes span.tag[sarah] (TRAP child counterpart)", () => {
      expect(
        added.some((d) => d.targetNode!.directText === "Aunt Sarah"),
      ).toBe(true);
    });

    it("includes section.bulletin (hierarchy can't pair tag change)", () => {
      expect(
        added.some(
          (d) =>
            d.targetNode!.tagName === "section" &&
            d.targetNode!.attributeAnalytic["data-s"]?.actualValue ===
              "bulletin",
        ),
      ).toBe(true);
    });

    it("includes div.widget-dock (new wrapper)", () => {
      expect(
        added.some(
          (d) =>
            d.targetNode!.attributeAnalytic["data-s"]?.actualValue === "dock",
        ),
      ).toBe(true);
    });

    it("includes 2 new images (ph-two, ph-three)", () => {
      const newImgs = added.filter(
        (d) => d.targetNode!.tagName === "img",
      );

      expect(newImgs).toHaveLength(2);
    });

    it("includes div.reply (new nested reply)", () => {
      expect(
        added.some((d) => d.targetNode!.directText === "Reply to A"),
      ).toBe(true);
    });

    it("includes section.promo and h2.promo-title", () => {
      expect(
        added.some(
          (d) =>
            d.targetNode!.attributeAnalytic["data-s"]?.actualValue === "promo",
        ),
      ).toBe(true);

      expect(
        added.some((d) => d.targetNode!.directText === "Special Offer"),
      ).toBe(true);
    });
  });

  // ── Mutation: TEXT_CHANGED ──────────────────────────────────

  describe("mutation: TEXT_CHANGED", () => {
    const textChanged = findAll(diffs, "mutation", "TEXT_CHANGED");

    it("detects 2 text changes", () => {
      expect(textChanged).toHaveLength(2);
    });

    it("div.root: 'Version One' → 'Version Two'", () => {
      const root = textChanged.find(
        (d) => d.referenceNode!.directText === "Version One",
      );

      expect(root).toBeDefined();
      expect(root!.targetNode!.directText).toBe("Version Two");
    });

    it("header: 'Welcome Old' → 'Welcome New'", () => {
      const header = textChanged.find(
        (d) => d.referenceNode!.tagName === "header",
      );

      expect(header).toBeDefined();
      expect(header!.referenceNode!.directText).toBe("Welcome Old");
      expect(header!.targetNode!.directText).toBe("Welcome New");
    });
  });

  // ── Mutation: TAG_CHANGED ──────────────────────────────────

  describe("mutation: TAG_CHANGED", () => {
    it("detects div.bulletin → section.bulletin", () => {
      const tagChanged = findOne(diffs, "mutation", "TAG_CHANGED");

      expect(tagChanged).toBeDefined();
      expect(tagChanged!.referenceNode!.tagName).toBe("div");
      expect(tagChanged!.targetNode!.tagName).toBe("section");

      expect(
        tagChanged!.referenceNode!.attributeAnalytic["data-s"]?.actualValue,
      ).toBe("bulletin");
    });
  });

  // ── Mutation: ATTRIBUTE_CHANGED ────────────────────────────

  describe("mutation: ATTRIBUTE_CHANGED", () => {
    it("detects profile gaining data-verified (attributeCount 2→3)", () => {
      const attrChanged = findOne(diffs, "mutation", "ATTRIBUTE_CHANGED");

      expect(attrChanged).toBeDefined();
      expect(attrChanged!.referenceNode!.attributeCount).toBe(2);
      expect(attrChanged!.targetNode!.attributeCount).toBe(3);
      expect(attrChanged!.delta).toBe(1);
    });
  });

  // ── Mutation: DELETED + ADDED (reparented nodes miss mutation) ──

  describe("mutation: DELETED + ADDED for reparented widget", () => {
    it("widget DELETED from depth 1 (mutation can't pair across depths)", () => {
      const deleted = findAll(diffs, "mutation", "DELETED");

      expect(deleted).toHaveLength(2);

      expect(
        deleted.some(
          (d) =>
            d.referenceNode!.attributeAnalytic["data-role"]?.actualValue ===
            "widget",
        ),
      ).toBe(true);
    });

    it("widget ADDED at depth 2", () => {
      const added = findAll(diffs, "mutation", "ADDED");

      expect(added).toHaveLength(2);

      expect(
        added.some(
          (d) =>
            d.targetNode!.attributeAnalytic["data-role"]?.actualValue ===
            "widget",
        ),
      ).toBe(true);
    });
  });

  // ── Shape: SHRUNK ──────────────────────────────────────────

  describe("shape: SHRUNK", () => {
    it("detects nav losing 1 child (3→2)", () => {
      const shrunk = findOne(diffs, "shape", "SHRUNK");

      expect(shrunk).toBeDefined();
      expect(shrunk!.referenceNode!.tagName).toBe("nav");
      expect(shrunk!.referenceNode!.childCount).toBe(3);
      expect(shrunk!.targetNode!.childCount).toBe(2);
      expect(shrunk!.delta).toBe(1);
    });
  });

  // ── Shape: GROWN ──────────────────────────────────────────

  describe("shape: GROWN", () => {
    const grown = findAll(diffs, "shape", "GROWN");

    it("detects 2 grown nodes", () => {
      expect(grown).toHaveLength(2);
    });

    it("photos: childCount 1→3 (delta 2)", () => {
      const photos = grown.find(
        (d) =>
          d.referenceNode!.attributeAnalytic["data-s"]?.actualValue ===
          "photos",
      );

      expect(photos).toBeDefined();
      expect(photos!.referenceNode!.childCount).toBe(1);
      expect(photos!.targetNode!.childCount).toBe(3);
      expect(photos!.delta).toBe(2);
    });

    it("msg-a: childCount 0→1 (gained reply)", () => {
      const msgA = grown.find(
        (d) => d.referenceNode!.directText === "Message A",
      );

      expect(msgA).toBeDefined();
      expect(msgA!.referenceNode!.childCount).toBe(0);
      expect(msgA!.targetNode!.childCount).toBe(1);
      expect(msgA!.delta).toBe(1);
    });
  });

  // ── Shape: DEPTH_CHANGED ──────────────────────────────────

  describe("shape: DEPTH_CHANGED", () => {
    const depthChanged = findAll(diffs, "shape", "DEPTH_CHANGED");

    it("detects 3 depth changes", () => {
      expect(depthChanged).toHaveLength(3);
    });

    it("div.root: height changed (forum subtree deepened)", () => {
      const root = depthChanged.find(
        (d) => d.referenceNode!.directText === "Version One",
      );

      expect(root).toBeDefined();
    });

    it("forum: height 1→2 (msg-a gained reply subtree)", () => {
      const forum = depthChanged.find(
        (d) =>
          d.referenceNode!.attributeAnalytic["data-s"]?.actualValue === "forum",
      );

      expect(forum).toBeDefined();
      expect(forum!.referenceNode!.height).toBe(1);
      expect(forum!.targetNode!.height).toBe(2);
      expect(forum!.delta).toBe(1);
    });

    it("msg-a: height 0→1 (gained child reply)", () => {
      const msgA = depthChanged.find(
        (d) => d.referenceNode!.directText === "Message A",
      );

      expect(msgA).toBeDefined();
      expect(msgA!.referenceNode!.height).toBe(0);
      expect(msgA!.targetNode!.height).toBe(1);
      expect(msgA!.delta).toBe(1);
    });
  });

  // ── TRAP: uncle/bob must NOT match aunt/sarah ──────────────

  describe("trap: uncle/bob ≠ aunt/sarah", () => {
    it("uncle/bob never appear as reference in a pair", () => {
      const paired = diffs.filter(
        (d) =>
          d.referenceNode !== null &&
          d.targetNode !== null &&
          (d.referenceNode.directText === "Uncle Bob" ||
            d.referenceNode.attributeAnalytic["data-role"]?.actualValue ===
              "uncle"),
      );

      expect(paired).toHaveLength(0);
    });

    it("aunt/sarah never appear as target in a pair", () => {
      const paired = diffs.filter(
        (d) =>
          d.referenceNode !== null &&
          d.targetNode !== null &&
          (d.targetNode.directText === "Aunt Sarah" ||
            d.targetNode.attributeAnalytic["data-role"]?.actualValue ===
              "aunt"),
      );

      expect(paired).toHaveLength(0);
    });
  });

  // ── Snapshot: full diff type distribution ───────────────────

  describe("diff type distribution", () => {
    it("matches the expected count per source×type", () => {
      const counts = new Map<string, number>();

      for (const d of diffs) {
        const key = `[${d.source}] ${d.type}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }

      expect(Object.fromEntries(counts)).toEqual({
        "[hierarchy] REORDERED": 2,
        "[hierarchy] REPARENTED": 4,
        "[hierarchy] DELETED": 7,
        "[hierarchy] ADDED": 10,
        "[mutation] TEXT_CHANGED": 2,
        "[mutation] TAG_CHANGED": 1,
        "[mutation] ATTRIBUTE_CHANGED": 1,
        "[mutation] DELETED": 2,
        "[mutation] ADDED": 2,
        "[shape] DEPTH_CHANGED": 3,
        "[shape] SHRUNK": 1,
        "[shape] GROWN": 2,
      });
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// e2e WITH PROFILES
// ═══════════════════════════════════════════════════════════════
//
// Profiles only apply to the FIRST (reference) tree. The second
// (target) tree is always parsed without profiles. This asymmetry
// is tested thoroughly below.
//
// Design dimensions:
//   EXCL-A  excluded node whose text changes in V2
//   EXCL-B  excluded node removed entirely in V2
//   EXCL-C  excluded PARENT, non-excluded child — child still participates
//   EXCL-D  single selector excludes 3 elements at once
//   ID-A    explicit passingId → stable dedup keys
//   ID-B    profile with id:null → falls back to auto-counter
//   ID-C    same selector matches 2 elements → id collision on ref side

const profileV1 = `
<!DOCTYPE html>
<html lang="en">
<body>
  <div class="app" id="main" data-v="1">
    App V1

    <!-- EXCL-A: excluded, text changes in V2 → invisible on ref side,
         V2 counterpart becomes hierarchy ADDED -->
    <div class="ad-banner" data-s="ad">Buy now!</div>

    <!-- EXCL-B: excluded AND removed in V2 → zero footprint anywhere -->
    <div class="tracker" data-s="tracker">Pixel</div>

    <!-- EXCL-C: excluded parent; child p.tip is NOT excluded.
         In V2 sidebar gains data-folded → child sees parentAttributeCount
         change 2→3 → REPARENTED -->
    <div class="sidebar" data-s="sidebar">
      <p class="tip" data-id="tip">Useful tip</p>
    </div>

    <!-- EXCL-D: one selector excludes all 3 toasts.
         Only t1 survives in V2 → appears as ADDED (ref excluded). -->
    <div class="toast" data-s="t1">Toast 1</div>
    <div class="toast" data-s="t2">Toast 2</div>
    <div class="toast" data-s="t3">Toast 3</div>

    <!-- ID-A: explicit passingId "prod" / "price".
         price text changes → TEXT_CHANGED with refId="price". -->
    <div class="product" data-s="product">
      <span class="price" data-id="price">$10</span>
    </div>

    <!-- ID-B: profile with id:null → passingId undefined → counter.
         Text changes → TEXT_CHANGED with counter-based refId. -->
    <div class="status" data-s="status">Online</div>

    <!-- ID-C: both cards match ".card" → both get passingId="card".
         Greedy position-matching causes cross-pairing:
           ref card[A] (nthChild 8) → tar card[B] (nthChild 6, dist 2)
           ref card[B] (nthChild 9) → tar card[A] (nthChild 5, dist 4)
         Both TEXT_CHANGED survive dedup because tarIds differ. -->
    <div class="card" data-role="item">Card A</div>
    <div class="card" data-role="item">Card B</div>
  </div>
</body>
</html>
`;

const profileV2 = `
<!DOCTYPE html>
<html lang="en">
<body>
  <div class="app" id="main" data-v="1">
    App V2

    <!-- EXCL-A counterpart: NOT excluded (profiles not on V2) → ADDED -->
    <div class="ad-banner" data-s="ad">New ad!</div>

    <!-- EXCL-B: removed entirely → nothing -->

    <!-- EXCL-C: sidebar gains data-folded; tip text changes -->
    <div class="sidebar" data-s="sidebar" data-folded="true">
      <p class="tip" data-id="tip">Updated tip</p>
    </div>

    <!-- EXCL-D: only t1 remains → ADDED (V1 excluded) -->
    <div class="toast" data-s="t1">Toast 1</div>

    <!-- ID-A: price changes $10 → $15 -->
    <div class="product" data-s="product">
      <span class="price" data-id="price">$15</span>
    </div>

    <!-- ID-B: text changes Online → Offline -->
    <div class="status" data-s="status">Offline</div>

    <!-- ID-C: both texts change -->
    <div class="card" data-role="item">Card A updated</div>
    <div class="card" data-role="item">Card B updated</div>

    <!-- Brand-new element -->
    <footer class="site-footer" data-s="footer">Bye</footer>
  </div>
</body>
</html>
`;

const profiles: import("../src/types").Profile[] = [
  // ── Exclusions ──
  { selector: ".ad-banner", id: null, isExcluded: true },   // EXCL-A
  { selector: ".tracker", id: null, isExcluded: true },      // EXCL-B
  { selector: ".sidebar", id: null, isExcluded: true },      // EXCL-C (parent only)
  { selector: ".toast", id: null, isExcluded: true },        // EXCL-D (matches 3)

  // ── Inclusions with explicit IDs ──
  { selector: ".product", id: "prod", isExcluded: false },   // ID-A
  { selector: ".price", id: "price", isExcluded: false },    // ID-A

  // ── Inclusion with null id → counter fallback ──
  { selector: ".status", id: null, isExcluded: false },      // ID-B

  // ── Inclusion that collides (matches 2 elements → same id) ──
  { selector: ".card", id: "card", isExcluded: false },      // ID-C
];

describe("e2e with profiles", () => {
  const diffs = diff({ first: profileV1, second: profileV2, profiles });

  // ── Total count ────────────────────────────────────────────

  it("produces exactly 18 diffs", () => {
    expect(diffs).toHaveLength(18);
  });

  // ── Exclusion: invisible nodes ─────────────────────────────

  describe("excluded nodes produce zero diffs", () => {
    const excludedClasses = [
      "ad-banner",
      "tracker",
      "sidebar",
      "toast",
    ];

    it("no excluded node appears as referenceNode in any diff", () => {
      for (const d of diffs) {
        if (!d.referenceNode) continue;
        const cls =
          d.referenceNode.attributeAnalytic["class"]?.actualValue ?? "";
        expect(excludedClasses).not.toContain(cls);
      }
    });

    it("EXCL-B (tracker): zero footprint — excluded in V1, removed in V2", () => {
      const trackerDiffs = diffs.filter((d) => {
        const refClass =
          d.referenceNode?.attributeAnalytic["class"]?.actualValue;
        const tarClass =
          d.targetNode?.attributeAnalytic["class"]?.actualValue;
        return refClass === "tracker" || tarClass === "tracker";
      });
      expect(trackerDiffs).toHaveLength(0);
    });
  });

  // ── Exclusion asymmetry: V2 counterparts become ADDED ──────

  describe("profile asymmetry (profiles only on first tree)", () => {
    const added = findAll(diffs, "hierarchy", "ADDED");

    it("V2 ad-banner appears as ADDED (V1 counterpart excluded)", () => {
      expect(
        added.some(
          (d) =>
            d.targetNode!.attributeAnalytic["data-s"]?.actualValue === "ad",
        ),
      ).toBe(true);
    });

    it("V2 sidebar appears as ADDED (V1 counterpart excluded)", () => {
      expect(
        added.some(
          (d) =>
            d.targetNode!.attributeAnalytic["data-s"]?.actualValue ===
            "sidebar",
        ),
      ).toBe(true);
    });

    it("V2 toast[t1] appears as ADDED (V1 counterpart excluded)", () => {
      expect(
        added.some(
          (d) =>
            d.targetNode!.attributeAnalytic["data-s"]?.actualValue === "t1",
        ),
      ).toBe(true);
    });
  });

  // ── Excluded parent, non-excluded child ────────────────────

  describe("EXCL-C: excluded parent with non-excluded child", () => {
    it("tip is REPARENTED (parent sidebar gained data-folded → parentAttributeCount 2→3)", () => {
      const tipReparented = findOne(diffs, "hierarchy", "REPARENTED", (d) =>
        d.referenceNode!.directText === "Useful tip",
      );
      expect(tipReparented).toBeDefined();
      expect(tipReparented!.referenceParentNode!.attributeCount).toBe(2);
      expect(tipReparented!.targetParentNode!.attributeCount).toBe(3);
    });

    it("tip text change detected (mutation viewer still pairs it)", () => {
      const tipText = findOne(diffs, "mutation", "TEXT_CHANGED", (d) =>
        d.referenceNode!.directText === "Useful tip" &&
        d.targetNode!.directText === "Updated tip",
      );
      expect(tipText).toBeDefined();
    });
  });

  // ── Multiple exclusions via one selector ───────────────────

  describe("EXCL-D: single selector excludes 3 toasts", () => {
    it("no toast appears as DELETED (all excluded on ref side)", () => {
      const toastDeleted = diffs.filter(
        (d) =>
          d.type === "DELETED" &&
          d.referenceNode?.attributeAnalytic["class"]?.actualValue === "toast",
      );
      expect(toastDeleted).toHaveLength(0);
    });
  });

  // ── passingId: explicit IDs ────────────────────────────────

  describe("ID-A: explicit passingId", () => {
    it("product ref node has id 'prod'", () => {
      const productDiff = diffs.find(
        (d) =>
          d.referenceNode?.attributeAnalytic["data-s"]?.actualValue ===
          "product",
      );
      expect(productDiff).toBeDefined();
      expect(productDiff!.referenceNode!.id).toBe("prod");
    });

    it("price TEXT_CHANGED has refId 'price'", () => {
      const priceText = findOne(diffs, "mutation", "TEXT_CHANGED", (d) =>
        d.referenceNode?.id === "price",
      );
      expect(priceText).toBeDefined();
      expect(priceText!.referenceNode!.directText).toBe("$10");
      expect(priceText!.targetNode!.directText).toBe("$15");
    });
  });

  // ── passingId: null id → counter fallback ──────────────────

  describe("ID-B: null id falls back to counter", () => {
    it("status ref node gets a numeric counter id (not 'null' or 'undefined')", () => {
      const statusDiff = diffs.find(
        (d) =>
          d.referenceNode?.attributeAnalytic["data-s"]?.actualValue ===
          "status",
      );
      expect(statusDiff).toBeDefined();
      const id = statusDiff!.referenceNode!.id;
      expect(id).not.toBe("null");
      expect(id).not.toBe("undefined");
      expect(Number.isFinite(Number(id))).toBe(true);
    });

    it("status TEXT_CHANGED detected", () => {
      const statusText = findOne(diffs, "mutation", "TEXT_CHANGED", (d) =>
        d.referenceNode?.directText === "Online" &&
        d.targetNode?.directText === "Offline",
      );
      expect(statusText).toBeDefined();
    });
  });

  // ── passingId collision ────────────────────────────────────

  describe("ID-C: same selector gives both cards id='card'", () => {
    it("both cards have id 'card'", () => {
      const cardDiffs = diffs.filter(
        (d) => d.referenceNode?.id === "card",
      );
      // Multiple diffs reference nodes with id "card"
      expect(cardDiffs.length).toBeGreaterThanOrEqual(2);
    });

    it("cross-pairing: ref card[A] pairs with tar card[B] (closer by nthChild)", () => {
      // ref card[A] at nthChild 8, tar card[B] at nthChild 6 → dist 2 (closest)
      const reordered = findAll(diffs, "hierarchy", "REORDERED");
      const crossPair = reordered.find(
        (d) =>
          d.referenceNode?.id === "card" &&
          d.referenceNode?.directText === "Card A" &&
          d.targetNode?.directText === "Card B updated",
      );
      expect(crossPair).toBeDefined();
    });

    it("both TEXT_CHANGED survive dedup (same refId 'card' but different tarIds)", () => {
      const cardTexts = findAll(diffs, "mutation", "TEXT_CHANGED").filter(
        (d) => d.referenceNode?.id === "card",
      );
      expect(cardTexts).toHaveLength(2);

      // Confirm different target ids (counter-based, so they differ)
      const tarIds = cardTexts.map((d) => d.targetNode!.id);
      expect(tarIds[0]).not.toBe(tarIds[1]);
    });
  });

  // ── Position shifts from exclusion ─────────────────────────

  describe("excluded elements cause nthChild shifts → REORDERED", () => {
    it("product REORDERED (nthChild shifted because excluded nodes before it are gone)", () => {
      const productReorder = findOne(diffs, "hierarchy", "REORDERED", (d) =>
        d.referenceNode?.id === "prod",
      );
      expect(productReorder).toBeDefined();
      expect(productReorder!.referenceNode!.nthChild).toBeGreaterThan(
        productReorder!.targetNode!.nthChild,
      );
    });

    it("status REORDERED for same reason", () => {
      const statusReorder = findOne(diffs, "hierarchy", "REORDERED", (d) =>
        d.referenceNode?.attributeAnalytic["data-s"]?.actualValue === "status",
      );
      expect(statusReorder).toBeDefined();
    });
  });

  // ── Shape: app SHRUNK ──────────────────────────────────────

  describe("shape changes from structural removal", () => {
    it("app SHRUNK: childCount 10→8 (tracker removed, 2 toasts removed, footer added)", () => {
      const appShrunk = findOne(diffs, "shape", "SHRUNK", (d) =>
        d.referenceNode?.tagName === "div" &&
        d.referenceNode?.attributeAnalytic["id"]?.actualValue === "main",
      );
      expect(appShrunk).toBeDefined();
      expect(appShrunk!.referenceNode!.childCount).toBe(10);
      expect(appShrunk!.targetNode!.childCount).toBe(8);
      expect(appShrunk!.delta).toBe(2);
    });
  });

  // ── Full distribution snapshot ─────────────────────────────

  describe("diff type distribution", () => {
    it("matches the expected count per source×type", () => {
      const counts = new Map<string, number>();
      for (const d of diffs) {
        const key = `[${d.source}] ${d.type}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }

      expect(Object.fromEntries(counts)).toEqual({
        "[hierarchy] DELETED": 1,
        "[hierarchy] ADDED": 5,
        "[hierarchy] REORDERED": 4,
        "[hierarchy] REPARENTED": 1,
        "[mutation] TEXT_CHANGED": 6,
        "[shape] SHRUNK": 1,
      });
    });
  });
});
