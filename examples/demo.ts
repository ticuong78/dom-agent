import { diff } from "../src";

const html = `
<!DOCTYPE html>
<html lang="en">
<body>
  <div class="root" id="app" data-v="1">
    Version One
    <header class="site-header" data-s="header">Welcome Old</header>
    <nav class="site-nav" data-s="nav">
      <a class="lnk-home" data-to="home">Home</a>
      <a class="lnk-about" data-to="about">About</a>
      <a class="lnk-help" data-to="help">Help</a>
    </nav>
    <div class="columns" data-s="cols">
      <div class="col-left" data-pos="left">Left Panel</div>
      <div class="col-right" data-pos="right">Right Panel</div>
    </div>
    <div class="uncle" data-role="uncle">
      <span class="tag" data-who="bob">Uncle Bob</span>
    </div>
    <div class="bulletin" data-s="bulletin">
      <p class="note" data-id="n1">Note one</p>
    </div>
    <div class="profile" data-s="profile">
      <p class="bio" data-id="bio">My bio</p>
    </div>
    <div class="widget" data-role="widget">
      <p class="w-body" data-id="w1">Widget body</p>
    </div>
    <div class="photos" data-s="photos">
      <img class="ph-one" data-id="p1" />
    </div>
    <div class="forum" data-s="forum">
      <div class="msg-a" data-id="ma">Message A</div>
      <div class="msg-b" data-id="mb">Message B</div>
    </div>
    <footer class="old-footer" data-s="footer">
      <p class="bye" data-id="bye">Goodbye</p>
    </footer>
  </div>
</body>
</html>`;

const htmlV2 = `
<!DOCTYPE html>
<html lang="en">
<body>
  <div class="root" id="app" data-v="1">
    Version Two
    <header class="site-header" data-s="header">Welcome New</header>
    <nav class="site-nav" data-s="nav">
      <a class="lnk-home" data-to="home">Home</a>
      <a class="lnk-about" data-to="about">About</a>
    </nav>
    <div class="columns" data-s="cols">
      <div class="col-right" data-pos="right">Right Panel</div>
      <div class="col-left" data-pos="left">Left Panel</div>
    </div>
    <div class="aunt" data-role="aunt">
      <span class="tag" data-who="sarah">Aunt Sarah</span>
    </div>
    <section class="bulletin" data-s="bulletin">
      <p class="note" data-id="n1">Note one</p>
    </section>
    <div class="profile" data-s="profile" data-verified="true">
      <p class="bio" data-id="bio">My bio</p>
    </div>
    <div class="widget-dock" data-s="dock">
      <div class="widget" data-role="widget">
        <p class="w-body" data-id="w1">Widget body</p>
      </div>
    </div>
    <div class="photos" data-s="photos">
      <img class="ph-one" data-id="p1" />
      <img class="ph-two" data-id="p2" />
      <img class="ph-three" data-id="p3" />
    </div>
    <div class="forum" data-s="forum">
      <div class="msg-a" data-id="ma">
        Message A
        <div class="reply" data-id="r1">Reply to A</div>
      </div>
      <div class="msg-b" data-id="mb">Message B</div>
    </div>
    <section class="promo" data-s="promo">
      <h2 class="promo-title" data-id="pt1">Special Offer</h2>
    </section>
  </div>
</body>
</html>`;

const diffs = diff({ first: html, second: htmlV2 });

console.log(`Total diffs: ${diffs.length}\n`);

for (const d of diffs) {
  const refTag = d.referenceNode?.tagName ?? "—";
  const tarTag = d.targetNode?.tagName ?? "—";
  const refText = d.referenceNode?.directText?.slice(0, 30) ?? "";
  const tarText = d.targetNode?.directText?.slice(0, 30) ?? "";
  console.log(
    `[${d.source}] ${d.type}: ${refTag}(${refText}) -> ${tarTag}(${tarText})  id:${d.referenceNode?.id ?? "—"}/${d.targetNode?.id ?? "—"}`,
  );
}
