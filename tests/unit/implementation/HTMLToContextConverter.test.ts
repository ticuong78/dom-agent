import { describe, expect, it } from "vitest";
import type { HTMLNode } from "@core/plain";
import { HTMLToContextConverter } from "@implementation/converter";
import {
  DeterministicIDAdapter,
  createTreeFromHtml,
  fakeHasher,
} from "../helpers";

const converter = () =>
  new HTMLToContextConverter(new DeterministicIDAdapter(), fakeHasher);

describe("HTMLToContextConverter", () => {
  it("returns null when the root node is not a tag", () => {
    const node: HTMLNode = {
      type: "text",
      tagName: "",
      attributes: {},
      children: [],
      directText: "ignored",
      siblingCount: 0,
      nthChild: 0,
    };

    expect(converter().convert(node)).toBeNull();
  });

  it("converts tag nodes into a ContextTree with depth, height, and counts", () => {
    const tree = createTreeFromHtml(`
      <main id="app">
        <section class="hero">
          <h1>Hello</h1>
        </section>
        <footer>Bye</footer>
      </main>
    `);

    const [root, section, heading, footer] = tree.nodes();

    expect(tree.size()).toBe(4);
    expect(root).toMatchObject({
      id: "node-1",
      tagName: "main",
      depth: 0,
      childCount: 2,
      height: 2,
      parentTagName: null,
    });
    expect(section).toMatchObject({
      id: "node-2",
      tagName: "section",
      depth: 1,
      childCount: 1,
      height: 1,
      parentTagName: "main",
      parentAttributeCount: 1,
      parentDepth: 0,
    });
    expect(heading).toMatchObject({
      id: "node-3",
      tagName: "h1",
      directText: "Hello",
      depth: 2,
      childCount: 0,
      height: 0,
      parentTagName: "section",
      parentAttributeCount: 1,
      parentDepth: 1,
    });
    expect(footer).toMatchObject({
      id: "node-4",
      tagName: "footer",
      directText: "Bye",
      depth: 1,
      childCount: 0,
      height: 0,
    });
  });

  it("skips non-tag descendants and wires parent and sibling pointers", () => {
    const htmlNode: HTMLNode = {
      type: "tag",
      tagName: "div",
      attributes: {},
      directText: "",
      nthChild: 0,
      siblingCount: 0,
      children: [
        {
          type: "text",
          tagName: "",
          attributes: {},
          children: [],
          directText: "ignored",
          siblingCount: 0,
          nthChild: 0,
        },
        {
          type: "tag",
          tagName: "span",
          attributes: {},
          children: [],
          directText: "A",
          siblingCount: 2,
          nthChild: 0,
        },
        {
          type: "comment",
          tagName: "",
          attributes: {},
          children: [],
          directText: "ignored",
          siblingCount: 0,
          nthChild: 0,
        },
        {
          type: "tag",
          tagName: "strong",
          attributes: {},
          children: [],
          directText: "B",
          siblingCount: 2,
          nthChild: 1,
        },
      ],
    };

    const tree = converter().convert(htmlNode)!;
    const [root, span, strong] = tree.nodes();
    expect(root).toBeDefined();
    expect(span).toBeDefined();
    expect(strong).toBeDefined();

    expect(tree.nodes().map((node) => node.tagName)).toEqual([
      "div",
      "span",
      "strong",
    ]);
    expect(root!.children).toEqual([span, strong]);
    expect(span!.parent).toBe(root);
    expect(span!.previousSibling).toBeNull();
    expect(span!.nextSibling).toBe(strong);
    expect(strong!.parent).toBe(root);
    expect(strong!.previousSibling).toBe(span);
    expect(strong!.nextSibling).toBeNull();
  });
});
