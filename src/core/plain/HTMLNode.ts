export type HTMLNodeType = "tag" | "text" | "comment" | "script" | "style";

export type HTMLNode = {
  // element info
  type: HTMLNodeType;
  tagName: string;
  attributes: Record<string, string>;

  // pre-extracted by adapter — replaces children() + filter(tag)
  children: HTMLNode[];

  // pre-extracted by adapter — replaces contents() + filter(text)
  directText: string;

  // pre-extracted by adapter — replaces siblings() + filter(tag)
  siblingCount: number;

  // pre-extracted by adapter — replaces prevAll() + filter(tag)
  nthChild: number;
};
