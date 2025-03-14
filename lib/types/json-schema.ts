/* eslint-disable @typescript-eslint/no-empty-interface */

type StrictNullChecksWrapper<Name extends string, Type> = undefined extends null
  ? `strictNullChecks must be true in tsconfig to use ${Name}`
  : Type

type UnionToIntersection<U> = (U extends any ? (_: U) => void : never) extends (_: infer I) => void
  ? I
  : never

export type SomeJSONSchema = UncheckedJSONSchemaType<Known, true>

type UncheckedPartialSchema<T> = Partial<UncheckedJSONSchemaType<T, true>>

export type PartialSchema<T> = StrictNullChecksWrapper<"PartialSchema", UncheckedPartialSchema<T>>
type JSONType<T extends string, IsPartial extends boolean> = IsPartial extends true
  ? T | undefined
  : T

interface NumberKeywords {
  minimum?: number
  maximum?: number
  exclusiveMinimum?: number
  exclusiveMaximum?: number
  multipleOf?: number
  format?: string
}

interface StringKeywords {
  minLength?: number
  maxLength?: number
  pattern?: string
  format?: string
}

type UncheckedJSONSchemaType<T, IsPartial extends boolean> = (
  | // these two unions allow arbitrary unions of types
  {
      anyOf: readonly UncheckedJSONSchemaType<T, IsPartial>[]
    }
  | {
      oneOf: readonly UncheckedJSONSchemaType<T, IsPartial>[]
    }
  // this union allows for { type: (primitive)[] } style schemas
  | ({
      type: readonly (T extends number
        ? JSONType<"number" | "integer", IsPartial>
        : T extends string
        ? JSONType<"string", IsPartial>
        : T extends boolean
        ? JSONType<"boolean", IsPartial>
        : never)[]
    } & UnionToIntersection<
      T extends number
        ? NumberKeywords
        : T extends string
        ? StringKeywords
        : T extends boolean
        ? // eslint-disable-next-line @typescript-eslint/ban-types
          {}
        : never
    >)
  // this covers "normal" types; it's last so typescript looks to it first for errors
  | ((T extends number
      ? {
          type: JSONType<"number" | "integer", IsPartial>
        } & NumberKeywords
      : T extends string
      ? {
          type: JSONType<"string", IsPartial>
        } & StringKeywords
      : T extends boolean
      ? {
          type: JSONType<"boolean", IsPartial>
        }
      : T extends readonly [any, ...any[]]
      ? {
          // JSON AnySchema for tuple
          type: JSONType<"array", IsPartial>
          items: {
            readonly [K in keyof T]-?: UncheckedJSONSchemaType<T[K], false> & Nullable<T[K]>
          } & {length: T["length"]}
          minItems: T["length"]
        } & ({maxItems: T["length"]} | {additionalItems: false})
      : T extends readonly any[]
      ? {
          type: JSONType<"array", IsPartial>
          items: UncheckedJSONSchemaType<T[0], false>
          contains?: UncheckedPartialSchema<T[0]>
          minItems?: number
          maxItems?: number
          minContains?: number
          maxContains?: number
          uniqueItems?: true
          additionalItems?: never
        }
      : T extends Record<string, any>
      ? {
          // JSON AnySchema for records and dictionaries
          // "required" is not optional because it is often forgotten
          // "properties" are optional for more concise dictionary schemas
          // "patternProperties" and can be only used with interfaces that have string index
          type: JSONType<"object", IsPartial>
          additionalProperties?: boolean | UncheckedJSONSchemaType<T[string], false>
          unevaluatedProperties?: boolean | UncheckedJSONSchemaType<T[string], false>
          properties?: IsPartial extends true
            ? Partial<UncheckedPropertiesSchema<T>>
            : UncheckedPropertiesSchema<T>
          patternProperties?: Record<string, UncheckedJSONSchemaType<T[string], false>>
          propertyNames?: Omit<UncheckedJSONSchemaType<string, false>, "type"> & {type?: "string"}
          dependencies?: {[K in keyof T]?: Readonly<(keyof T)[]> | UncheckedPartialSchema<T>}
          dependentRequired?: {[K in keyof T]?: Readonly<(keyof T)[]>}
          dependentSchemas?: {[K in keyof T]?: UncheckedPartialSchema<T>}
          minProperties?: number
          maxProperties?: number
        } & (// "required" type does not guarantee that all required properties
        // are listed it only asserts that optional cannot be listed.
        // "required" is not necessary if it's a non-partial type with no required keys
        IsPartial extends true
          ? {required: Readonly<(keyof T)[]>}
          : [UncheckedRequiredMembers<T>] extends [never]
          ? {required?: Readonly<UncheckedRequiredMembers<T>[]>}
          : {required: Readonly<UncheckedRequiredMembers<T>[]>})
      : T extends null
      ? {
          type: JSONType<"null", IsPartial>
          nullable: true
        }
      : never) & {
      allOf?: Readonly<UncheckedPartialSchema<T>[]>
      anyOf?: Readonly<UncheckedPartialSchema<T>[]>
      oneOf?: Readonly<UncheckedPartialSchema<T>[]>
      if?: UncheckedPartialSchema<T>
      then?: UncheckedPartialSchema<T>
      else?: UncheckedPartialSchema<T>
      not?: UncheckedPartialSchema<T>
    })
) & {
  [keyword: string]: any
  $id?: string
  $ref?: string
  $defs?: Record<string, UncheckedJSONSchemaType<Known, true>>
  definitions?: Record<string, UncheckedJSONSchemaType<Known, true>>
}

export type JSONSchemaType<T> = StrictNullChecksWrapper<
  "JSONSchemaType",
  UncheckedJSONSchemaType<T, false>
>

type Known =
  | {[key: string]: Known}
  | [Known, ...Known[]]
  | Known[]
  | number
  | string
  | boolean
  | null

type UncheckedPropertiesSchema<T> = {
  [K in keyof T]-?: (UncheckedJSONSchemaType<T[K], false> & Nullable<T[K]>) | {$ref: string}
}

export type PropertiesSchema<T> = StrictNullChecksWrapper<
  "PropertiesSchema",
  UncheckedPropertiesSchema<T>
>

type UncheckedRequiredMembers<T> = {
  [K in keyof T]-?: undefined extends T[K] ? never : K
}[keyof T]

export type RequiredMembers<T> = StrictNullChecksWrapper<
  "RequiredMembers",
  UncheckedRequiredMembers<T>
>

type Nullable<T> = undefined extends T
  ? {
      nullable: true
      const?: null // any non-null value would fail `const: null`, `null` would fail any other value in const
      enum?: Readonly<(T | null)[]> // `null` must be explicitly included in "enum" for `null` to pass
      default?: T | null
    }
  : {
      const?: T
      enum?: Readonly<T[]>
      default?: T
    }

type JSONSchemaDataDef<S, D extends Record<string, unknown>> = S extends {ref: string} // ref
  ? D extends {[K in S["ref"]]: infer V}
    ? JSONSchemaDataDef<V, D>
    : never
  : // type
  S extends {type: readonly any[]}
  ? any // could not do better than an any type on mutable type
  : S extends {type: "number" | "integer"}
  ? number
  : S extends {type: "boolean"}
  ? boolean
  : S extends {type: "null"}
  ? null
  : S extends {type: "string"}
  ? string
  : S extends {type: "timestamp"}
  ? string | Date
  : // Enum
  S extends {enum: readonly (infer E)[]}
  ? any extends E
    ? never
    : [E] extends [any]
    ? E
    : never
  : // arrays
  S extends {type: "array"; items: infer E}
  ? JSONSchemaDataDef<E, D>[]
  : // properties
  S extends {
      properties: Record<string, unknown>
      additionalProperties?: boolean
    }
  ? {-readonly [K in keyof S["properties"]]-?: JSONSchemaDataDef<S["properties"][K], D>} & ([
      S["additionalProperties"]
    ] extends [true]
      ? Record<string, unknown>
      : unknown)
  : S extends {
      properties?: Record<string, unknown>
      additionalProperties?: boolean
    }
  ? {-readonly [K in keyof S["properties"]]-?: JSONSchemaDataDef<S["properties"][K], D>} & ([
      S["additionalProperties"]
    ] extends [true]
      ? Record<string, unknown>
      : unknown)
  : unknown // unmatched case, empty def or something is missing in this DataDef
export type JSONSchemaDataType<S> = S extends {$defs: Record<string, unknown>}
  ? JSONSchemaDataDef<S, S["$defs"]>
  : JSONSchemaDataDef<S, Record<string, never>>
