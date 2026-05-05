import { createHash } from "crypto";
import type { HashAdapter } from "../../core/crypto";

/**
 * A {@link HashAdapter} implementation using SHA-256.
 *
 * Produces a 64-character hexadecimal hash string. Used by default
 * throughout dom-agent for text content hashing and treeId computation.
 *
 * @example
 * ```ts
 * const hasher = new SHA256HashAdapter();
 * hasher.hash("Hello"); // "185f8db32271fe25f561a6fc938b2e26..."
 * ```
 */
export class SHA256HashAdapter implements HashAdapter {
  /**
   * Computes a SHA-256 hash of the input string.
   *
   * @param input - The string to hash.
   * @returns A 64-character lowercase hexadecimal string.
   */
  hash(input: string): string {
    return createHash("sha256").update(input).digest("hex");
  }
}
