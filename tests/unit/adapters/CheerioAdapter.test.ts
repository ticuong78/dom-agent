import { describe, expect, it } from "vitest";
import { CheerioAdapter } from "@adapters/atom";
import type { HTMLNode } from "@core/plain";
import type { Element } from "domhandler";

describe("CheerioAdapter", () => {
  const adapter = new CheerioAdapter();

  it("returns null when body has no element children", () => {
    expect(adapter.parse("")).toBeNull();
    expect(adapter.parse("plain text only")).toBeNull();
  });

  it("uses the first direct body child as the root", () => {
    const root = adapter.parse("<main id='first'></main><section id='second'></section>");

    expect(root).toMatchObject({
      type: "tag",
      tagName: "main",
      attributes: { id: "first" },
      nthChild: 0,
      siblingCount: 1,
    });
  });

  it("normalizes attributes, direct text, and tag children", () => {
    const root = adapter.parse(`
      <article data-id="42" class="card primary">
        Hello
        <script>ignored()</script>
        <!-- ignored -->
        <h1>Title</h1>
        world
        <style>.x { color: red; }</style>
        <p>Body</p>
      </article>
    `);

    expect(root).not.toBeNull();
    expect(root!.tagName).toBe("article");
    expect(root!.attributes).toEqual({
      "data-id": "42",
      class: "card primary",
    });
    expect(root!.directText).toBe("Hello world");
    expect(root!.children.map((child) => child.tagName)).toEqual(["h1", "p"]);
  });

  it("computes zero-based nthChild and sibling counts among tag siblings", () => {
    const root = adapter.parse(`
      <ul>
        text
        <li>A</li>
        <li>B</li>
        <!-- comment -->
        <li>C</li>
      </ul>
    `);

    expect(root!.children).toHaveLength(3);
    expect(
      root!.children.map((child) => ({
        tagName: child.tagName,
        nthChild: child.nthChild,
        siblingCount: child.siblingCount,
        directText: child.directText,
      })),
    ).toEqual([
      { tagName: "li", nthChild: 0, siblingCount: 2, directText: "A" },
      { tagName: "li", nthChild: 1, siblingCount: 2, directText: "B" },
      { tagName: "li", nthChild: 2, siblingCount: 2, directText: "C" },
    ]);
  });

  it("normalizes a detached element with no parent as having no siblings", () => {
    const normalize = (
      adapter as unknown as {
        normalize: ($: unknown, el: Element) => HTMLNode;
      }
    ).normalize.bind(adapter);
    const node = normalize(null, {
      type: "tag",
      name: "section",
      attribs: {},
      children: [],
      parent: null,
    } as unknown as Element);

    expect(node).toMatchObject({
      tagName: "section",
      siblingCount: -1,
      nthChild: -1,
      directText: "",
      children: [],
    });
  });
});
