import { diff } from "../src";

// ─── V1: Reference snapshot ─────────────────────────────────
const html = `
<!DOCTYPE html>
<html lang="en">
<body>
  <div class="root" id="app" data-v="1">
    Version One

    <!-- TEXT_CHANGED: text will change -->
    <header class="site-header" data-s="header">Welcome Old</header>

    <!-- SHRUNK: will lose a child -->
    <nav class="site-nav" data-s="nav">
      <a class="lnk-home" data-to="home">Home</a>
      <a class="lnk-about" data-to="about">About</a>
      <a class="lnk-help" data-to="help">Help</a>
    </nav>

    <!-- REORDERED: children will swap -->
    <div class="columns" data-s="cols">
      <div class="col-left" data-pos="left">Left Panel</div>
      <div class="col-right" data-pos="right">Right Panel</div>
    </div>

    <!-- TRAP: uncle bob — must NOT match aunt sarah -->
    <div class="uncle" data-role="uncle">
      <span class="tag" data-who="bob">Uncle Bob</span>
    </div>

    <!-- TAG_CHANGED: div will become section -->
    <div class="bulletin" data-s="bulletin">
      <p class="note" data-id="n1">Note one</p>
    </div>

    <!-- ATTRIBUTE_CHANGED: will gain data-verified -->
    <div class="profile" data-s="profile">
      <p class="bio" data-id="bio">My bio</p>
    </div>

    <!-- REPARENTED: will move into a new wrapper -->
    <div class="widget" data-role="widget">
      <p class="w-body" data-id="w1">Widget body</p>
    </div>

    <!-- GROWN: will gain more images -->
    <div class="photos" data-s="photos">
      <img class="ph-one" data-id="p1" />
    </div>

    <!-- DEPTH_CHANGED: subtree will deepen without gaining direct children -->
    <div class="forum" data-s="forum">
      <div class="msg-a" data-id="ma">Message A</div>
      <div class="msg-b" data-id="mb">Message B</div>
    </div>

    <!-- DELETED: will be removed -->
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

    <!-- TRAP: aunt sarah — different attribute values -->
    <div class="aunt" data-role="aunt">
      <span class="tag" data-who="sarah">Aunt Sarah</span>
    </div>

    <!-- TAG_CHANGED: section instead of div, same attributes -->
    <section class="bulletin" data-s="bulletin">
      <p class="note" data-id="n1">Note one</p>
    </section>

    <!-- ATTRIBUTE_CHANGED: gained data-verified -->
    <div class="profile" data-s="profile" data-verified="true">
      <p class="bio" data-id="bio">My bio</p>
    </div>

    <!-- REPARENTED: widget now inside dock wrapper -->
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

    <!-- DEPTH_CHANGED: msg-a now has a nested reply, forum keeps 2 direct children -->
    <div class="forum" data-s="forum">
      <div class="msg-a" data-id="ma">
        Message A
        <div class="reply" data-id="r1">Reply to A</div>
      </div>
      <div class="msg-b" data-id="mb">Message B</div>
    </div>

    <!-- ADDED: entirely new -->
    <section class="promo" data-s="promo">
      <h2 class="promo-title" data-id="pt1">Special Offer</h2>
    </section>
  </div>
</body>
</html>
`;

// 3. Detect changes — output is deduplicated and free of viewer contradictions
const diffs = diff({
  first: html,
  second: htmlV2,
  // exclude: ["body > div > nav"],
});

for (const diff of diffs) {
  console.log(
    `[${diff.source}] ${diff.type}: ${diff.referenceNode?.tagName ?? "—"} -> ${diff.targetNode?.tagName ?? "—"}`,
  );
}
