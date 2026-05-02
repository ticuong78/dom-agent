import { CheerioAdapter } from "@adapters/atom/CheerioAdapter";

describe("CheerioAdapter", () => {
  let adapter: CheerioAdapter;

  beforeEach(() => {
    adapter = new CheerioAdapter();
  });

  // --- parse() ---

  describe("parse()", () => {
    test("returns null when body has no children", () => {
      const result = adapter.parse("<html><body></body></html>");
      expect(result).toBeNull();
    });

    test("returns null when html is empty", () => {
      const result = adapter.parse("");
      expect(result).toBeNull();
    });

    test("returns root node as first direct child of body", () => {
      const result = adapter.parse("<div class='root'>Hello</div>");
      expect(result).not.toBeNull();
      expect(result!.tagName).toBe("div");
    });

    test("ignores second sibling — only returns first child of body", () => {
      const result = adapter.parse(`
        <div class='first'>First</div>
        <div class='second'>Second</div>
      `);
      expect(result!.attributes["class"]).toBe("first");
    });
  });

  // --- tagName ---

  describe("tagName", () => {
    test("correctly extracts tagName", () => {
      const result = adapter.parse("<section>content</section>");
      expect(result!.tagName).toBe("section");
    });

    test("correctly extracts nested tagName", () => {
      const result = adapter.parse("<div><span>text</span></div>");
      expect(result!.children[0]!.tagName).toBe("span");
    });
  });

  // --- attributes ---

  describe("attributes", () => {
    test("correctly extracts single attribute", () => {
      const result = adapter.parse("<div id='main'>text</div>");
      expect(result!.attributes["id"]).toBe("main");
    });

    test("correctly extracts multiple attributes", () => {
      const result = adapter.parse(`
        <div class="foo" data-testid="bar" aria-label="baz">text</div>
      `);
      expect(result!.attributes["class"]).toBe("foo");
      expect(result!.attributes["data-testid"]).toBe("bar");
      expect(result!.attributes["aria-label"]).toBe("baz");
    });

    test("returns empty object when no attributes", () => {
      const result = adapter.parse("<div>text</div>");
      expect(result!.attributes).toEqual({});
    });
  });

  // --- directText ---

  describe("directText", () => {
    test("extracts direct text content", () => {
      const result = adapter.parse("<div>Hello World</div>");
      expect(result!.directText).toBe("Hello World");
    });

    test("does not include descendant text", () => {
      const result = adapter.parse("<div>Direct <span>Nested</span></div>");
      expect(result!.directText).toBe("Direct");
    });

    test("trims whitespace from text", () => {
      const result = adapter.parse("<div>   Hello   </div>");
      expect(result!.directText).toBe("Hello");
    });

    test("joins multiple direct text nodes", () => {
      const result = adapter.parse("<div>Hello <span></span> World</div>");
      expect(result!.directText).toBe("Hello World");
    });

    test("returns empty string when no direct text", () => {
      const result = adapter.parse("<div><span>nested</span></div>");
      expect(result!.directText).toBe("");
    });
  });

  // --- children ---

  describe("children", () => {
    test("returns empty array for leaf node", () => {
      const result = adapter.parse("<div>text</div>");
      expect(result!.children).toHaveLength(0);
    });

    test("returns correct number of tag children", () => {
      const result = adapter.parse(`
        <div>
          <span>one</span>
          <span>two</span>
          <span>three</span>
        </div>
      `);
      expect(result!.children).toHaveLength(3);
    });

    test("skips text nodes in children", () => {
      const result = adapter.parse(
        "<div>text<span>child</span>more text</div>",
      );
      expect(result!.children).toHaveLength(1);
      expect(result!.children[0]!.tagName).toBe("span");
    });

    test("skips comment nodes in children", () => {
      const result = adapter.parse(
        "<div><!-- comment --><span>child</span></div>",
      );
      expect(result!.children).toHaveLength(1);
    });

    test("recursively normalizes children", () => {
      const result = adapter.parse(`
        <div>
          <section>
            <p>deep</p>
          </section>
        </div>
      `);
      expect(result!.children[0]!.tagName).toBe("section");
      expect(result!.children[0]!.children[0]!.tagName).toBe("p");
    });
  });

  // --- siblingCount ---

  describe("siblingCount", () => {
    test("root node has siblingCount of 0 when alone", () => {
      const result = adapter.parse("<div>only child</div>");
      expect(result!.siblingCount).toBe(0);
    });

    test("children with siblings have correct siblingCount", () => {
      const result = adapter.parse(`
        <div>
          <span>one</span>
          <span>two</span>
          <span>three</span>
        </div>
      `);
      // each child has 2 siblings (3 total - self)
      expect(result!.children[0]!.siblingCount).toBe(2);
      expect(result!.children[1]!.siblingCount).toBe(2);
      expect(result!.children[2]!.siblingCount).toBe(2);
    });
  });

  // --- nthChild ---

  describe("nthChild", () => {
    test("only child has nthChild of 0", () => {
      const result = adapter.parse("<div><span>only</span></div>");
      expect(result!.children[0]!.nthChild).toBe(0);
    });

    test("children have correct nthChild positions", () => {
      const result = adapter.parse(`
        <div>
          <span>first</span>
          <span>second</span>
          <span>third</span>
        </div>
      `);
      expect(result!.children[0]!.nthChild).toBe(0);
      expect(result!.children[1]!.nthChild).toBe(1);
      expect(result!.children[2]!.nthChild).toBe(2);
    });
  });

  // --- type ---

  describe("type", () => {
    test("all normalized nodes have type 'tag'", () => {
      const result = adapter.parse(`
        <div>
          <span>text</span>
        </div>
      `);
      expect(result!.type).toBe("tag");
      expect(result!.children[0]!.type).toBe("tag");
    });
  });
});
