# Preparing Step

## What it does

This step converts raw HTML DOM nodes into the normalized shape required by downstream processes. The output of this step — referred to as HTMLNode — lives in src/core/plain and serves as the canonical input contract for all subsequent steps.

## How it works

The step is split into two sub-processes:

1. **Extracting**. Retrieves the raw HTML content from a source and passes it to the next sub-process.
2. **Parsing**. Takes the extracted content and transforms it into a higher-level representation that the rest of the project can work with.

Both sub-processes are open for extension — anyone can provide their own extracting or parsing logic.

## The Extractor

The extractor is any component that can read and interpret DOM structure. Its job is to translate an external representation of HTML into the extractor's own domain objects, which are then handed off to the parser. This indirection keeps later steps decoupled from any specific third-party library.

Two common extractor implementations:

- **Cheerio-based**. Parses a static HTML string into Cheerio's internal objects, which are then mapped to this project's domain objects.
- **Puppeteer-based**. Uses a headless browser to handle dynamic or JavaScript-rendered pages before extraction. This is useful when the target HTML cannot be obtained as a static string.
- **Playwright-based**. Similar to Puppeteer, but with broader browser support (Chromium, Firefox, WebKit) and a more capable automation API. A good choice when cross-browser consistency or more complex interaction sequences are needed before extraction.

## How to build your own logic

To create your own extracing and parsing logic, create a class that inherits `HTMLAdapter`, lives in `src\core\plain\HTMLAdapter.ts`. This adapter must adhere the

Currently, the project has given you a **Cheerio-based** extractor. Now, its your time to build your own.
