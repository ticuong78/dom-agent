import { createHash } from "crypto";

/** A plain function that hashes a string. */
export type HashFn = (input: string) => string;

export const defaultHash: HashFn = (input) =>
  createHash("sha256").update(input).digest("hex");

export function partitionArray<T>(
  array: Array<T>,
  isValid: (el: T) => boolean,
) {
  return array.reduce<[T[], T[]]>(
    ([pass, fail], element) => {
      return isValid(element)
        ? [[...pass, element], fail]
        : [pass, [...fail, element]];
    },
    [[], []],
  );
}
