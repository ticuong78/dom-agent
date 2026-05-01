export class Stack<T> {
  private items!: Array<T>;

  constructor() {
    this._init();
  }

  private _init() {
    if (!this.items) this.items = [];
  }

  push(element: T) {
    this._init();
    this.items.push(element); // Add to top
  }

  pop(): null | T {
    return this.isEmpty() ? null : this.items.pop()!;
  }

  peek(): T | null {
    return this.isEmpty() ? null : this.items[this.items.length - 1]!;
  }

  isEmpty() {
    this._init();
    return this.items.length === 0;
  }

  size() {
    this._init();
    return this.items.length;
  }
}
