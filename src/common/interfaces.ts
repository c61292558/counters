// Copyright 2023 Guillermo Peña
// SPDX-License-Identifier: GPL-3.0-or-later

import Counters from "gi://Counters";
import GObject from "gi://GObject";

export type GParamSpecDict = {
  [name: string]: GObject.ParamSpec<unknown>;
};

export type GPropertyType = "string" | "int" | "boolean" | "object" | "float";

type GPropertyBase = {
  name?: string;
  nick?: string;
  blurb?: string;
  flags?: number;
};

export type GPropertyNumber = GPropertyBase & {
  minimum?: number;
  maximum?: number;
  defaultValue?: number;
};

export type GPropertyString = GPropertyBase & {
  defaultValue?: string;
};

export type GPropertyBoolean = GPropertyBase & {
  defaultValue?: boolean;
};

export type GPropertyObject = GPropertyBase & {
  objectType: GObject.GType | { $gtype: GObject.GType };
};

export type GObjectOptions = Pick<
  Parameters<typeof GObject.registerClass>[0],
  "Template" | "Signals"
>;

export type GPropertyOptions =
  | GPropertyNumber
  | GPropertyString
  | GPropertyBoolean
  | GPropertyObject;

export type QueryParams =
  | (string | number | null)[]
  | { [name: string]: string | number | null };

export interface DBMigrations {
  [version: string]: (db: Counters.Database) => void;
}

export interface DB {
  entries: EntryBase;
  counters: CounterBase;
}

export interface CounterBase {
  id: number;
  title: string;
  goal: number;
  interval: number;
  days: number | null;
}

export interface EntryBase {
  id: number;
  counter_id: number;
  created: number;
}

export type StringOrNumber = string | number;
export type AnyColumn<T> = keyof T & string;

export type DateUnit =
  | "days"
  | "hours"
  | "minutes"
  | "seconds"
  | "months"
  | "years";
export type DateModifiers =
  | `${"+" | "-"}${number} ${DateUnit}`
  | "auto"
  | "localtime"
  | "start of month"
  | "start of year"
  | "start of day"
  | "unixepoch"
  | "utc"
  | `weekday ${number}`;

type QueryBuilder = {
  toSQL(): { sql: string; params: StringOrNumber[] };
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface SQLAlias<AS extends string, T> extends QueryBuilder {
  alias: AS;
}

type SQLAliasType<T> = T extends SQLAlias<string, infer U> ? U : StringOrNumber;

export type Selects<
  T,
  C extends (SQLAlias<string, StringOrNumber> | AnyColumn<T>)[],
> = {
  [K in [...C][number] as `${K extends SQLAlias<string, StringOrNumber>
    ? K["alias"]
    : K}`]: K extends AnyColumn<T> ? T[K] : SQLAliasType<K>;
};

export interface SQLFragment<T> extends QueryBuilder {
  getType: () => T | undefined;
  alias?: string;
  as: <A extends string>(alias: A) => SQLAlias<A, T>;
}

export type BitwiseOperators = "&" | "|";
export type ArithmeticOperators = "+" | "-" | "*" | "/" | "%";
export type ComparisonOperators = "=" | ">" | "<" | ">=" | "<=" | "!=";

export type OnlyType<T, Target> = {
  [K in keyof T as T[K] extends Target ? K : never]: T[K];
};

export type SQLExpression<
  T,
  K extends AnyColumn<T>,
  TK extends StringOrNumber = T[K] & StringOrNumber,
> = [K | SQLFragment<TK>, ArithmeticOperators | BitwiseOperators, TK];

export type NotEmpty<N, Fallback> = [keyof N] extends [never] ? Fallback : N;

export type FragmentType<T> = T extends SQLFragment<infer U> ? U : never;

export type Split<S extends string> = S extends `${infer Name}(${infer Arg})`
  ? [Name, Arg]
  : never;

export type CTE = {
  name: string;
  query: QueryBuilder;
  recursive?: boolean;
};
