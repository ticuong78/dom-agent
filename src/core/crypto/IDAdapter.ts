/**
 * Adapter interface for generating unique node identifiers.
 *
 * Each {@link ContextNode} receives a unique ID at creation time via this
 * adapter. IDs are scoped to a single snapshot — they identify nodes within
 * one {@link ContextTree}, not across snapshots.
 *
 * @example
 * ```ts
 * const idGen: IDAdapter = new UUIDAdapter();
 * const id = idGen.generate(); // "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 * ```
 */
export interface IDAdapter {
  /**
   * Generates a new unique identifier string.
   *
   * @returns A unique string suitable for use as a node ID.
   */
  generate(): string;
}
