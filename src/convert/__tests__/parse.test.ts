import * as cheerio from "cheerio";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { CheerioParser } from "@convert/parse";
import type { HTMLNode, Profile } from "@types";

// ── Types ──────────────────────────────────────────────────────────────

type InjectData = (
  $: cheerio.CheerioAPI,
  selectors: string[],
  data: readonly [name: string, value: unknown],
) => void;

type Normalize = (
  $: cheerio.CheerioAPI,
  root: cheerio.Cheerio<Element>,
) => HTMLNode;

// ── Private method access ──────────────────────────────────────────────

const privateMethods = CheerioParser as unknown as {
  _injectData: InjectData;
  _normalize: Normalize;
};

// ── Fixtures ───────────────────────────────────────────────────────────

const HTML = `
  <body>
    <header>
      <div id="hero">
        Welcome to our application
      </div>

      <div class="outline">
        <div class="inline">This is a great visual</div>
      </div>

      <div class="outline">
        <div class="inline">This is a great visual</div>
      </div>

      <ul class="service-list">
        <li class="service">Service</li>
        <li class="service">Service</li>
        <li class="service">Service</li>
      </ul>
    </header>
  </body>
`;

const ID_KEY = "htmlnode-id";
const EXCLUSION_KEY = "is-excluded";
const EXCLUSION_VALUE = true;

// ── Tests ──────────────────────────────────────────────────────────────

describe("CheerioParser._injectData", () => {
  let $: cheerio.CheerioAPI;
  let injectData: InjectData;

  beforeEach(() => {
    $ = cheerio.load(HTML);
    injectData = privateMethods._injectData;
    expect(typeof injectData).toBe("function");
  });

  it("injects data into an element with a unique selector", () => {
    injectData($, ["#hero"], [EXCLUSION_KEY, EXCLUSION_VALUE]);

    expect($("#hero").data(EXCLUSION_KEY)).toBe(EXCLUSION_VALUE);
  });

  it("injects data into every identical matching element", () => {
    injectData($, [".service"], [EXCLUSION_KEY, EXCLUSION_VALUE]);

    expect($(".service")).toHaveLength(3);

    $(".service").each((_, element) => {
      expect($(element).data(EXCLUSION_KEY)).toBe(EXCLUSION_VALUE);
    });
  });

  it("injects data into elements from multiple selectors", () => {
    injectData($, ["#hero", ".outline"], [EXCLUSION_KEY, EXCLUSION_VALUE]);

    expect($("#hero").data(EXCLUSION_KEY)).toBe(EXCLUSION_VALUE);

    $(".outline").each((_, element) => {
      expect($(element).data(EXCLUSION_KEY)).toBe(EXCLUSION_VALUE);
    });
  });

  it("removes the data- prefix from the key", () => {
    const prefixedKey = `data-${EXCLUSION_KEY}`;

    injectData($, ["#hero"], [prefixedKey, EXCLUSION_VALUE]);

    expect($("#hero").data(EXCLUSION_KEY)).toBe(EXCLUSION_VALUE);
    expect($("#hero").data(prefixedKey)).toBeUndefined();
  });

  it("does not inject data into elements outside the selectors", () => {
    injectData($, [".service"], [EXCLUSION_KEY, EXCLUSION_VALUE]);

    $(".service").each((_, element) => {
      expect($(element).data(EXCLUSION_KEY)).toBe(EXCLUSION_VALUE);
    });

    expect($("#hero").data(EXCLUSION_KEY)).toBeUndefined();
    expect($(".outline").first().data(EXCLUSION_KEY)).toBeUndefined();
  });

  it("does nothing when the selector matches no element", () => {
    expect(() => {
      injectData($, [".does-not-exist"], [EXCLUSION_KEY, EXCLUSION_VALUE]);
    }).not.toThrow();
  });
});

describe("CheerioParser.parse", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes the <body> element to _normalize", () => {
    vi.spyOn(privateMethods, "_injectData").mockImplementation(() => {});

    const normalizeSpy = vi
      .spyOn(privateMethods, "_normalize")
      .mockReturnValue({} as HTMLNode);

    CheerioParser.parse(HTML);

    const [receivedCheerio, receivedRoot] = normalizeSpy.mock.calls[0]!;

    expect(receivedCheerio(receivedRoot as any).is("body")).toBe(true);
  });

  it("returns the normalized first root element", () => {
    const normalizedNode = { type: "tag" } as HTMLNode;

    vi.spyOn(privateMethods, "_injectData").mockImplementation(() => {});

    const normalizeSpy = vi
      .spyOn(privateMethods, "_normalize")
      .mockReturnValue(normalizedNode);

    const result = CheerioParser.parse(HTML);

    expect(result).toBe(normalizedNode);
    expect(normalizeSpy).toHaveBeenCalledOnce();

    const firstCall = normalizeSpy.mock.calls[0];

    if (!firstCall) {
      throw new Error("_normalize was not called");
    }

    const [receivedCheerio, receivedRoot] = firstCall;

    expect(receivedCheerio(receivedRoot as any).is("body")).toBe(true);
  });

  it("injects exclusion data into excluded selectors", () => {
    const profiles: Profile[] = [
      { id: "hero", selector: "#hero", isExcluded: false },
      { id: "services", selector: ".service", isExcluded: true },
    ];

    const injectDataSpy = vi
      .spyOn(privateMethods, "_injectData")
      .mockImplementation(() => {});

    vi.spyOn(privateMethods, "_normalize").mockReturnValue({} as HTMLNode);

    CheerioParser.parse(HTML, profiles);

    expect(injectDataSpy).toHaveBeenNthCalledWith(
      1,
      expect.any(Function),
      [".service"],
      [EXCLUSION_KEY, EXCLUSION_VALUE],
    );
  });

  it("injects each inclusion ID into its own selector", () => {
    const profiles: Profile[] = [
      { id: "hero-profile", selector: "#hero", isExcluded: false },
      { id: "outline-profile", selector: ".outline", isExcluded: false },
      { id: "service-profile", selector: ".service", isExcluded: true },
    ];

    const injectDataSpy = vi
      .spyOn(privateMethods, "_injectData")
      .mockImplementation(() => {});

    vi.spyOn(privateMethods, "_normalize").mockReturnValue({} as HTMLNode);

    CheerioParser.parse(HTML, profiles);

    expect(injectDataSpy).toHaveBeenNthCalledWith(
      2,
      expect.any(Function),
      ["#hero"],
      [ID_KEY, "hero-profile"],
    );

    expect(injectDataSpy).toHaveBeenNthCalledWith(
      3,
      expect.any(Function),
      [".outline"],
      [ID_KEY, "outline-profile"],
    );

    expect(injectDataSpy).toHaveBeenCalledTimes(3);
  });

  it("does not inject IDs from excluded profiles", () => {
    const profiles: Profile[] = [
      { id: "hero-profile", selector: "#hero", isExcluded: false },
      { id: "excluded-services", selector: ".service", isExcluded: true },
    ];

    const injectDataSpy = vi
      .spyOn(privateMethods, "_injectData")
      .mockImplementation(() => {});

    vi.spyOn(privateMethods, "_normalize").mockReturnValue({} as HTMLNode);

    CheerioParser.parse(HTML, profiles);

    expect(injectDataSpy).not.toHaveBeenCalledWith(
      expect.any(Function),
      [".service"],
      [ID_KEY, "excluded-services"],
    );
  });

  it("parses empty HTML without throwing", () => {
    const result = CheerioParser.parse("");

    expect(result.tagName).toBe("body");
    expect(result.children).toEqual([]);
  });
});

// ── _normalize ────────────────────────────────────────────────────────

describe("CheerioParser._normalize", () => {
  function normalize(html: string): HTMLNode {
    const $ = cheerio.load(html);
    const body = $("body")[0]!;
    return privateMethods._normalize($, body as any);
  }

  it("extracts tagName from each element", () => {
    const root = normalize("<div><span>hi</span></div>");
    // root = body
    expect(root.tagName).toBe("body");
    expect(root.children[0]!.tagName).toBe("div");
    expect(root.children[0]!.children[0]!.tagName).toBe("span");
  });

  it("extracts attributes as key-value pairs", () => {
    const root = normalize('<div id="app" class="main" data-v="1"></div>');
    const div = root.children[0]!;
    expect(div.attributes).toEqual({ id: "app", class: "main", "data-v": "1" });
  });

  it("extracts and trims directText from text nodes", () => {
    const root = normalize("<div>  Hello World  </div>");
    expect(root.children[0]!.directText).toBe("Hello World");
  });

  it("concatenates multiple text nodes with spaces", () => {
    const root = normalize("<div>First<span>skip</span>Second</div>");
    expect(root.children[0]!.directText).toBe("First Second");
  });

  it("returns empty directText when element has no text nodes", () => {
    const root = normalize("<div><span></span></div>");
    expect(root.children[0]!.directText).toBe("");
  });

  it("filters out non-tag children (text, comments)", () => {
    const root = normalize("<div>text<!-- comment --><span>ok</span></div>");
    const div = root.children[0]!;
    expect(div.children).toHaveLength(1);
    expect(div.children[0]!.tagName).toBe("span");
  });

  it("computes siblingCount excluding self", () => {
    const root = normalize("<div><a>1</a><b>2</b><c>3</c></div>");
    const div = root.children[0]!;
    // each child has 2 siblings
    for (const child of div.children) {
      expect(child.siblingCount).toBe(2);
    }
  });

  it("computes nthChild as 0-indexed position among tag siblings", () => {
    const root = normalize("<div><a>0</a><b>1</b><c>2</c></div>");
    const kids = root.children[0]!.children;
    expect(kids[0]!.nthChild).toBe(0);
    expect(kids[1]!.nthChild).toBe(1);
    expect(kids[2]!.nthChild).toBe(2);
  });

  it("sets isExcluded true when cheerio data is set", () => {
    const $ = cheerio.load('<div class="ad">Ad</div>');
    $(".ad").data("is-excluded", true);
    const body = $("body")[0]!;
    const result = privateMethods._normalize($, body as any);
    expect(result.children[0]!.isExcluded).toBe(true);
  });

  it("sets isExcluded false by default", () => {
    const root = normalize("<div>Normal</div>");
    expect(root.children[0]!.isExcluded).toBe(false);
  });

  it("sets passingId from cheerio data when present", () => {
    const $ = cheerio.load('<div class="hero">Hero</div>');
    $(".hero").data("htmlnode-id", "hero-123");
    const body = $("body")[0]!;
    const result = privateMethods._normalize($, body as any);
    expect(result.children[0]!.passingId).toBe("hero-123");
  });

  it("sets passingId undefined when data is null", () => {
    const $ = cheerio.load('<div class="x">X</div>');
    $(".x").data("htmlnode-id", null);
    const body = $("body")[0]!;
    const result = privateMethods._normalize($, body as any);
    expect(result.children[0]!.passingId).toBeUndefined();
  });

  it("sets passingId undefined when no data is set", () => {
    const root = normalize("<div>No profile</div>");
    expect(root.children[0]!.passingId).toBeUndefined();
  });

  it("recursively normalizes nested children", () => {
    const root = normalize(`
      <div class="a">
        <div class="b">
          <div class="c">Leaf</div>
        </div>
      </div>
    `);
    const a = root.children[0]!;
    const b = a.children[0]!;
    const c = b.children[0]!;
    expect(a.tagName).toBe("div");
    expect(b.tagName).toBe("div");
    expect(c.tagName).toBe("div");
    expect(c.directText).toBe("Leaf");
    expect(c.children).toHaveLength(0);
  });
});
