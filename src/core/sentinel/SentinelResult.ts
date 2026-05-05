import type { DiffPoint } from "@core/diff";

export type SentinelStatus = "UNCHANGED" | "AFFECTED" | "NEVER_EXISTED";

export type SentinelResult =
  | {
      found: true;
      status: "UNCHANGED";
    }
  | {
      found: true;
      status: "AFFECTED";
      points: DiffPoint<string>[];
    }
  | {
      found: false;
      reason: "NEVER_EXISTED";
    };
