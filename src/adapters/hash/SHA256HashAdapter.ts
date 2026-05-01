import { createHash } from "crypto";
import type { HashAdapter } from "../../core/crypto";

export class SHA256HashAdapter implements HashAdapter {
  hash(input: string): string {
    return createHash("sha256").update(input).digest("hex");
  }
}
