/**
 * Adapter interface for producing deterministic hash strings.
 *
 * Used throughout dom-agent to fingerprint text content (e.g. directText
 * hashing in {@link ContextNode}) and to compute tree-level identifiers
 * (e.g. treeId in {@link ContextTree}).
 *
 * @example
 * ```ts
 * const hasher: HashAdapter = new SHA256HashAdapter();
 * const hash = hasher.hash("Hello world");
 * // hash === "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e"
 * ```
 */
export interface HashAdapter {
  /**
   * Produces a deterministic hash string from the given input.
   *
   * @param input - The string to hash.
   * @returns A fixed-length hexadecimal hash string.
   */
  hash(input: string): string;
}
