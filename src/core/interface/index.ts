export * from "./ISerializable";

// shall put this in the type check of a db:
// export class IGenericSerializing<U extends {}> {
//   protected _isValidJson(json: U): Boolean {
//     for (const [_, value] of Object.entries(json)) {
//       if (!this._isPrimitive(value)) return false;
//     }

//     return true;
//   }

//   private _isPrimitive(value: any): Boolean {
//     if (value === null) return true;

//     if (Array.isArray(value))
//       return value.every((item) => this._isPrimitive(item));

//     if (typeof value === "object")
//       if (Object.getPrototypeOf(value) !== Object.prototype) return false;

//     return Object.values(value).every((item) => this._isPrimitive(item));
//   }
// }

// export class ISerializable<T, U extends {}> extends IGenericSerializing<U> {
//   serialize(object: T, serializeFunction: (object: T) => U): U {
//     const serialized = serializeFunction(object);

//     if (this._isValidJson(serialized)) return serialized;
//     else
//       throw new Error(
//         "Input is not serializable. Ensure all values are JSON-compatible primitives.",
//       );
//   }
// }
