import { randomUUID } from "crypto";
import type { IDAdapter } from "../../core/crypto";

export class UUIDAdapter implements IDAdapter {
  generate(): string {
    return randomUUID();
  }
}
