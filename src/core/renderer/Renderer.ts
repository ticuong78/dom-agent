import type { DiffReport } from "@core/diff";

export interface Renderer {
  render(diffReport: DiffReport): string;
}
