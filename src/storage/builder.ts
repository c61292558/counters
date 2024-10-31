import {
  AnyColumn,
  ArithmeticOperators,
  BitwiseOperators,
  CTE,
  ComparisonOperators,
  DB,
  DateModifiers,
  DateUnit,
  FragmentType,
  NotEmpty,
  OnlyType,
  SQLAlias,
  SQLFragment,
  Selects,
  Split,
  StringOrNumber,
} from "../common/interfaces.js";
import database from "../storage/database.js";

class QueryBuilder<T> {
  protected _from?: string | QueryBuilder<unknown>;
  protected _insertTable: string | null = null;
  protected _updateTable: string | null = null;
  protected _deleteFrom = false;

  protected _selects: (string | SQLAlias<string, StringOrNumber>)[] = [];
  protected _into?: string;
  protected _values: Omit<T, "id">[] = [];
  protected _set?: Partial<T>;

  protected _wheres: [
    string | SQLFragment<StringOrNumber>,
    string,
    StringOrNumber | SQLFragment<StringOrNumber>,
  ][] = [];

  protected _having: [string, string, StringOrNumber][] = [];

  protected _groupColumn?: string;
  protected _orderColumn?: string;
  protected _asc = true;

  protected _limit?: number;
  protected _offset?: number;

  protected _unions: [QueryBuilder<unknown>, boolean][] = [];

  private _cte?: CTE[];

  constructor(cte?: CTE[]) {
    this._cte = cte;
  }

  private _createConditions(
    conditions: [
      string | SQLFragment<StringOrNumber>,
      string,
      StringOrNumber | SQLFragment<StringOrNumber>,
    ][],
  ) {
    const { sql, params } = conditions.reduce(
      (acc, [left, op, right]) => {
        let condition = "";
        if (typeof left === "string") {
          condition += left;
        } else {
          const l = left.toSQL();
          condition += l.sql;
          acc.params.push(...l.params);
        }

        condition += op;

        if (typeof right !== "object") {
          condition += "?";
          acc.params.push(right);
        } else {
          const r = right.toSQL();
          condition += r.sql;
          acc.params.push(...r.params);
        }
        acc.sql.push(condition);
        return acc;
      },
      {
        sql: [],
        params: [],
      } as { sql: string[]; params: StringOrNumber[] },
    );
    return {
      sql: `${sql.join(" AND ")}`,
      params,
    };
  }

  toSQL() {
    let sql = "";
    const params: StringOrNumber[] = [];

    if (this._cte && this._cte.length > 0) {
      sql += "WITH ";
      if (this._cte.findIndex((value) => !value.recursive)) sql += "RECURSIVE ";

      const cte: string[] = [];
      this._cte
        .sort((value) => (value.recursive ? 0 : 1))
        .forEach((value) => {
          const c = value.query.toSQL();
          cte.push(`${value.name} AS (${c.sql})`);
          params.push(...c.params);
        });
      sql += cte.join(", ") + " ";
    }

    if (this._insertTable) {
      sql += `INSERT INTO "${this._insertTable}"`;
      if (this._values.length > 0) {
        const columns = Object.keys(this._values[0]);
        sql += ` (${columns.map((k) => `"${k}"`).join(",")}) VALUES `;

        sql += Array(this._values.length)
          .fill(`(${Array(columns.length).fill("?").join(",")})`)
          .join(",");

        this._values.forEach((v) =>
          params.push(...(Object.values(v) as StringOrNumber[])),
        );
      } else {
        throw new Error("Incomplete input in INSERT");
      }
      return { sql: sql, params };
    }

    if (this._updateTable) {
      sql += `UPDATE "${this._updateTable}"`;
      if (this._set) {
        sql += ` SET ${Object.keys(this._set)
          .map((k) => `${k}=?`)
          .join(",")}`;
        params.push(...(Object.values(this._set) as StringOrNumber[]));
      } else {
        throw new Error("Incomplete input in UPDATE");
      }
    } else if (this._deleteFrom) {
      sql += "DELETE";
    } else {
      sql += "SELECT";
      if (this._selects.length > 0) {
        const cols: string[] = [];
        for (let index = 0; index < this._selects.length; index++) {
          const element = this._selects[index];
          if (typeof element === "string") {
            cols.push(element);
          } else {
            const ex = element.toSQL();
            cols.push(ex.sql);
            params.push(...ex.params);
          }
        }
        sql += ` ${cols.join(",")}`;
      } else {
        sql += " *";
      }
    }

    if (this._from) {
      if (typeof this._from === "string") {
        sql += ` FROM "${this._from}"`;
      } else {
        const from_ = this._from.toSQL();
        sql += ` FROM (${from_.sql})`;
        params.push(...from_.params);
      }
    }

    if (this._wheres.length > 0) {
      const where = this._createConditions(this._wheres);
      params.push(...where.params);
      sql += ` WHERE ${where.sql}`;
    }

    if (this._groupColumn) {
      sql += ` GROUP BY ${this._groupColumn}`;
      if (this._having.length > 0) {
        const having = this._createConditions(this._having);
        params.push(...having.params);
        sql += ` HAVING ${having.sql}`;
      }
    }

    if (this._orderColumn) {
      sql += ` ORDER BY ${this._orderColumn} ${this._asc ? "ASC" : "DESC"}`;
    }

    if (this._limit) {
      sql += ` LIMIT ?`;
      params.push(this._limit);
    }

    if (this._offset) {
      sql += ` OFFSET ?`;
      params.push(this._offset);
    }

    if (this._unions.length > 0) {
      this._unions.forEach(([union, all]) => {
        const u = union.toSQL();
        sql += ` UNION${all ? " ALL " : ""} ${u.sql}`;
        params.push(...u.params);
      });
    }

    return { sql, params };
  }
}

class QueryWithWhere<
  Table,
  Columns extends Record<string, StringOrNumber> = NonNullable<unknown>,
> extends QueryBuilder<Table> {
  protected _eb = new ExpressionBuilder<Table & Columns>();

  where<
    K extends AnyColumn<Table & Columns>,
    F extends (
      b: ExpressionBuilder<Table & Columns>,
    ) => SQLFragment<(Table & Columns)[K]>,
  >(left: K, op: ComparisonOperators, right: (Table & Columns)[K] | F): this;
  where<
    T extends StringOrNumber,
    F extends (b: ExpressionBuilder<Table & Columns>) => SQLFragment<T>,
  >(
    left: F,
    op: ComparisonOperators,
    right: FragmentType<ReturnType<F>> | F,
  ): this;
  where<
    F extends (
      b: ExpressionBuilder<Table & Columns>,
    ) => SQLFragment<StringOrNumber>,
  >(left: string | F, op: string, right: StringOrNumber | F) {
    this._wheres.push([
      typeof left === "function" ? left(this._eb) : left,
      op,
      typeof right === "function" ? right(this._eb) : right,
    ]);
    return this;
  }
}

class SelectBuilder<
  Table,
  Columns extends Record<string, StringOrNumber> = NonNullable<unknown>,
> extends QueryWithWhere<Table, Columns> {
  constructor(
    from?: string | SelectBuilder<unknown, NonNullable<unknown>>,
    cte?: CTE[],
  ) {
    super(cte);
    this._from = from;
  }

  columns<K extends AnyColumn<Table>, S extends Selects<Table, K[]>>(
    arg: K[],
  ): SelectBuilder<Table, Columns & { [P in keyof S]: S[P] }>;

  columns<
    K extends AnyColumn<Table>,
    A extends string,
    F extends <T>(fn: ExpressionBuilder<Table>) => (SQLAlias<A, T> | K)[],
    S extends Selects<Table, ReturnType<F>>,
  >(arg: F): SelectBuilder<Table, Columns & { [P in keyof S]: S[P] }>;

  columns<
    K extends AnyColumn<Table>,
    A extends string,
    F extends <T>(fn: ExpressionBuilder<Table>) => (SQLAlias<A, T> | K)[],
  >(arg: K[] | F) {
    this._selects.push(...(typeof arg === "function" ? arg(this._eb) : arg));
    return this;
  }

  groupBy<K extends AnyColumn<Table & Columns>>(column: K) {
    this._groupColumn = column;
    return this;
  }

  having<T extends Table & Columns, K extends AnyColumn<T>>(
    left: K,
    op: ComparisonOperators,
    right: T[K],
  ) {
    this._having.push([left, op, right]);
    return this;
  }

  orderBy(column: AnyColumn<Table & Columns>, asc = true) {
    this._orderColumn = column;
    this._asc = asc;
    return this;
  }

  limit(limit: number) {
    this._limit = limit;
    return this;
  }

  offset(limit: number) {
    this._offset = limit;
    return this;
  }

  select<C extends NotEmpty<Columns, Table>>(): SelectBuilder<
    C,
    NonNullable<unknown>
  > {
    return new SelectBuilder<C>(this);
  }

  union<T, C extends NotEmpty<Columns, Table>>(
    builder: SelectBuilder<
      T,
      Extract<
        Extract<NotEmpty<Columns, Table> & Record<string, StringOrNumber>, C>,
        C
      >
    >,
  ): SelectBuilder<Table, Columns> {
    this._unions.push([builder, false]);
    return this;
  }

  unionAll<T, C extends NotEmpty<Columns, Table>>(
    builder: SelectBuilder<
      T,
      Extract<
        Extract<NotEmpty<Columns, Table> & Record<string, StringOrNumber>, C>,
        C
      >
    >,
  ): SelectBuilder<Table, Columns> {
    this._unions.push([builder, true]);
    return this;
  }

  execute() {
    const { sql, params } = this.toSQL();
    return database.execute_select(sql, params) as NotEmpty<Columns, Table>[];
  }

  execute_async() {
    const { sql, params } = this.toSQL();
    return database.execute_select_async(sql, params) as Promise<
      NotEmpty<Columns, Table>[]
    >;
  }
}

class InsertBuilder<Table> extends QueryBuilder<Table> {
  constructor(into: string) {
    super();
    this._insertTable = into;
  }

  values(values: Omit<Table, "id">) {
    this._values.push(values);
    return this;
  }

  execute() {
    const { sql, params } = this.toSQL();
    const { last_rowid } = database.execute_non_select(sql, params);
    return last_rowid;
  }

  async execute_async() {
    const { sql, params } = this.toSQL();
    return database
      .execute_non_select_async(sql, params)
      .then(({ last_rowid }) => last_rowid);
  }
}

class UpdateBuilder<DB> extends QueryWithWhere<DB> {
  constructor(table: string) {
    super();
    this._updateTable = table;
  }

  set<T extends Partial<DB>>(set: T) {
    this._set = set;
    return this;
  }

  execute() {
    const { sql, params } = this.toSQL();
    const { changes } = database.execute_non_select(sql, params);
    return changes;
  }
}

class DeleteBuilder<DB> extends QueryWithWhere<DB> {
  constructor(table: string) {
    super();
    this._from = table;
    this._deleteFrom = true;
  }

  execute() {
    const { sql, params } = this.toSQL();
    const { changes } = database.execute_non_select(sql, params);
    return changes;
  }
}

abstract class SQLFragmentImpl<T> {
  protected _alias?: string;

  abstract toSQL(): { sql: string; params: StringOrNumber[] };

  get alias() {
    return this._alias;
  }

  as<A extends string>(alias: A) {
    this._alias = alias;
    return {
      alias: this._alias,
      toSQL: this.toSQL.bind(this),
    } as SQLAlias<A, T>;
  }
}

class SQLValue<T extends string | number>
  extends SQLFragmentImpl<T>
  implements SQLFragment<T>
{
  private _value: T;

  constructor(value: T) {
    super();
    this._value = value;
  }

  getType(): T | undefined {
    return undefined;
  }

  toSQL() {
    let sql = "?";
    if (this._alias) {
      sql += ` AS ${this._alias}`;
    }
    return { sql, params: [this._value] };
  }
}

class SQLFunction<T extends StringOrNumber>
  extends SQLFragmentImpl<T>
  implements SQLFragment<T>
{
  protected _name: string;
  protected _args: (StringOrNumber | SQLFragment<StringOrNumber>)[];

  constructor(
    name: string,
    ...args: (StringOrNumber | SQLFragment<StringOrNumber>)[]
  ) {
    super();
    this._name = name;
    this._args = args;
  }

  getType(): T | undefined {
    return undefined;
  }

  protected _prepareArgs() {
    return this._args.reduce(
      (acc, current) => {
        if (typeof current === "object") {
          const val = current.toSQL();
          acc.sql.push(val.sql);
          acc.params.push(...val.params);
        } else {
          acc.sql.push(
            current === "*"
              ? "*"
              : typeof current === "string"
                ? `"${current}"`
                : current.toString(),
          );
        }
        return acc;
      },
      {
        sql: [],
        params: [],
      } as { sql: string[]; params: StringOrNumber[] },
    );
  }

  toSQL() {
    const args = this._prepareArgs();
    let sql = `${this._name}(${args.sql.join(",")})`;
    if (this._alias) {
      sql += ` AS ${this._alias}`;
    }
    return { sql, params: args.params };
  }
}

class SQLFunctionWithOver<
  T,
  TT extends StringOrNumber,
> extends SQLFunction<TT> {
  private _over?: { column: string; desc: boolean };

  constructor(
    name: string,
    ...args: (StringOrNumber | SQLFragment<StringOrNumber>)[]
  ) {
    super(name, ...args);
  }

  over(column: AnyColumn<T>, desc = false) {
    this._over = { column, desc };
    return this;
  }

  override toSQL(): { sql: string; params: StringOrNumber[] } {
    const args = this._prepareArgs();
    let sql = `${this._name}(${args.sql.join(",")})`;
    if (this._over) {
      sql += ` OVER(ORDER BY ${this._over.column}${this._over.desc ? " DESC" : ""})`;
    }
    if (this._alias) {
      sql += ` AS ${this._alias}`;
    }
    return { sql, params: args.params };
  }
}

class Functions<Table> {
  count(column?: AnyColumn<Table> | "*") {
    return new SQLFunction<number>("count", column || "*");
  }
  unixepoch(
    timeValue: AnyColumn<Table> | "now",
    ...modifiers: DateModifiers[]
  ) {
    return new SQLFunction<number>("unixepoch", timeValue, ...modifiers);
  }
  date(
    timeValue: AnyColumn<Table> | "now",
    ...modifiers: DateModifiers[]
  ): SQLFunction<string> {
    return new SQLFunction<string>("date", timeValue, ...modifiers);
  }
  pow(
    x: AnyColumn<OnlyType<Table, number>> | SQLFragment<number>,
    y: AnyColumn<OnlyType<Table, number>> | SQLFragment<number>,
  ) {
    return new SQLFunction<number>("pow", x, y);
  }
  strftime<T extends StringOrNumber>(
    format: string,
    timeValue: AnyColumn<Table> | "now",
    ...modifiers: DateModifiers[]
  ) {
    return new SQLFunction<T>("strftime", format, timeValue, ...modifiers);
  }
  sum(column: AnyColumn<OnlyType<Table, number>>) {
    return new SQLFunctionWithOver<Table, number>("sum", column);
  }
  row_number() {
    return new SQLFunctionWithOver<Table, number>("row_number");
  }
  lag<T extends StringOrNumber>(
    expression: AnyColumn<OnlyType<Table, T>>,
    offet: T,
    default_: AnyColumn<OnlyType<Table, T>>,
  ) {
    return new SQLFunctionWithOver<Table, T>(
      "lag",
      expression,
      offet,
      default_,
    );
  }
}

class SQLExpressionImpl<T extends StringOrNumber>
  extends SQLFragmentImpl<T>
  implements SQLFragment<T>
{
  private _left: string | SQLFragment<T>;
  private _op: string;
  private _right: StringOrNumber | SQLFragment<T>;

  constructor(
    left: string | SQLFragment<T>,
    op: string,
    right: StringOrNumber | SQLFragment<T>,
  ) {
    super();
    this._left = left;
    this._op = op;
    this._right = right;
  }

  getType(): T | undefined {
    return undefined;
  }

  toSQL() {
    let sql: string = "";
    const params: StringOrNumber[] = [];
    let l: string;
    if (typeof this._left === "object") {
      const left = this._left.toSQL();
      l = left.sql;
      params.push(...left.params);
    } else {
      l = `"${this._left}"`;
    }

    let r: string;
    if (typeof this._right === "object") {
      const right = this._right.toSQL();
      r = right.sql;
      params.push(...right.params);
    } else {
      r = "?";
      params.push(this._right);
    }

    sql += `(${l}${this._op}${r})`;
    if (this._alias) {
      sql += ` AS ${this._alias}`;
    }
    return { sql, params };
  }
}

class ExpressionBuilder<Table> {
  private _functions = new Functions<Table>();

  get fn() {
    return this._functions;
  }

  ex<K extends AnyColumn<Table>>(
    left: K,
    op: ArithmeticOperators | BitwiseOperators | ComparisonOperators,
    right: (Table[K] & StringOrNumber) | SQLFragment<Table[K]>,
  ): SQLExpressionImpl<Table[K] & StringOrNumber>;

  ex<T extends StringOrNumber>(
    left: SQLFragment<T>,
    op: ArithmeticOperators | BitwiseOperators | ComparisonOperators,
    right: T | SQLFragment<T>,
  ): SQLExpressionImpl<T>;

  ex<K extends AnyColumn<Table>, T extends StringOrNumber>(
    left: K | SQLFragment<T>,
    op: string,
    right: StringOrNumber | SQLFragment<T>,
  ) {
    return new SQLExpressionImpl<T>(left, op, right);
  }

  val(value: number): SQLValue<number>;
  val(value: string): SQLValue<string>;
  val(value: StringOrNumber) {
    return new SQLValue(value);
  }
}

export class Builder<DB> {
  private _cte?: CTE[];

  select(): SelectBuilder<NonNullable<unknown>>;
  select<T extends DB, K extends AnyColumn<T>>(from: K): SelectBuilder<T[K]>;
  select<T, C extends Record<string, StringOrNumber>>(
    from: SelectBuilder<T, C>,
  ): SelectBuilder<C>;
  select(from?: string | SelectBuilder<unknown>) {
    const cte = this._cte ? this._cte : undefined;
    return new SelectBuilder(from, cte);
  }

  insert<T extends DB, K extends AnyColumn<T>>(into: K) {
    return new InsertBuilder<T[K]>(into);
  }

  update<T extends DB, K extends AnyColumn<T>>(from: K) {
    return new UpdateBuilder<T[K]>(from);
  }

  delete<T extends DB, K extends AnyColumn<T>>(from: K) {
    return new DeleteBuilder<T[K]>(from);
  }

  with<T, K extends string, C extends Record<string, StringOrNumber>>(
    name: K,
    fn: (b: Builder<DB>) => SelectBuilder<T, C>,
  ): Builder<DB & { [P in K]: NotEmpty<C, T> }> {
    const builder = new Builder();
    const cte = this._cte ? this._cte : [];
    builder._cte = [...cte, { name, query: fn(builder) }];
    return builder;
  }

  withRecursive<
    T,
    Name extends string,
    K extends Split<Name>[0] & string,
    A extends Split<Name>[1] & string,
    C extends Record<string, StringOrNumber>,
  >(
    name: Name,
    fn: (
      b: Builder<DB & { [P in K]: { [P in A]: StringOrNumber } }>,
    ) => SelectBuilder<T, C>,
  ): Builder<DB & { [P in K]: NotEmpty<C, T> }> {
    const builder = new Builder();
    const cte = this._cte ? this._cte : [];
    builder._cte = [...cte, { name, query: fn(builder), recursive: true }];
    return builder;
  }
}

const builder = new Builder<DB>();

export default builder;

export function getDatesCTE(
  counter_id: number,
  start: DateModifiers[],
  increase: number,
  unit: DateUnit,
) {
  return builder.withRecursive("date_range(d)", (b) =>
    b
      .select("entries")
      .columns(({ fn }) => [fn.unixepoch("created", "auto", ...start).as("d")])
      .where("counter_id", "=", counter_id)
      .orderBy("created")
      .limit(1)
      .select()
      .union(
        b.select().columns(({ fn }) => [fn.unixepoch("now", ...start).as("d")]),
      )
      .union(
        b
          .select("date_range")
          .columns(({ fn }) => [
            fn.unixepoch("d", "auto", `+${increase} ${unit}`).as("d"),
          ])
          .where("d", "<", ({ fn }) => fn.unixepoch("now", ...start)),
      ),
  );
}
