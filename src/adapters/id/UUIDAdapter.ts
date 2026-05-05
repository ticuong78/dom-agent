import { randomUUID } from "crypto";
import type { IDAdapter } from "../../core/crypto";

/**
 * An {@link IDAdapter} implementation using Node.js `crypto.randomUUID()`.
 *
 * Generates RFC 4122 v4 UUIDs. Each call produces a globally unique
 * identifier suitable for use as a {@link ContextNode} ID within a snapshot.
 *
 * @example
 * ```ts
 * const idGen = new UUIDAdapter();
 * idGen.generate(); // "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 * ```
 */
export class UUIDAdapter implements IDAdapter {
  /**
   * Generates a new v4 UUID string.
   *
   * @returns A 36-character UUID string (e.g. `"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"`).
   */
  generate(): string {
    return randomUUID();
  }
}
