// Copyright 2023 Guillermo Peña
// SPDX-License-Identifier: GPL-3.0-or-later

import GObject from "gi://GObject";

import {
  distanceToNow,
  getDateRange,
  getUnixTimeForNow,
} from "../common/date_utils.js";
import { GObjectClass, GObjectProperty } from "../common/decorators.js";
import { CounterBase } from "../common/interfaces.js";
import builder, { getDatesCTE } from "../storage/builder.js";
import { Entry } from "./entry.js";
import { Interval, getModifiers } from "./interval.js";

@GObjectClass()
export class Counter extends GObject.Object {
  private _title: string;
  private _value: number = 0;
  private _goal: number;
  private _interval: Interval;
  private _days: number | null;
  private _lastEntry?: Entry;
  private _lastCount: number;
  private _updated: string = _("never");
  private _updateTimeoutId?: number;

  public id: number;

  constructor(params: CounterBase) {
    super();
    this.id = params.id;
    this._title = params.title;
    this._goal = params.goal;
    this._interval = params.interval as Interval;
    this._days = params.days;
    this._lastCount = getUnixTimeForNow();
  }

  public initialSetup() {
    this._countEntries();
    this._findLastEntry();
  }

  private _findLastEntry() {
    this._lastEntry = Entry.findLastByCounterId(this.id);
    this._updated = this._lastEntry
      ? distanceToNow(this._lastEntry.created)
      : _("never");
  }

  private _countEntries() {
    this._value = Entry.countByCounterId(this.id, this._interval);
    this._lastCount = getUnixTimeForNow();
  }

  @GObjectProperty("string")
  get title() {
    return this._title;
  }

  set title(title: string) {
    this._title = title;
  }

  @GObjectProperty("int")
  get value() {
    return this._value;
  }

  private set value(value: number) {
    this._value = value;
  }

  @GObjectProperty("string")
  get updated() {
    return this._updated;
  }

  private set updated(updated: string) {
    this._updated = updated;
  }

  @GObjectProperty("int")
  get goal() {
    return this._goal;
  }

  set goal(goal: number) {
    this._goal = goal;
  }

  @GObjectProperty("int")
  get interval() {
    return this._interval;
  }

  set interval(interval: Interval) {
    if (this._interval == null) {
      this._interval = interval;
    } else if (this._interval !== interval) {
      this._interval = interval;
      this._countEntries();
      this.notify("value");
    }
  }

  @GObjectProperty("int")
  get days() {
    return this._days;
  }

  set days(days: number | null) {
    this._days = days;
  }

  public static create(
    ...counters: [Omit<CounterBase, "id">, ...Omit<CounterBase, "id">[]]
  ) {
    let query = builder.insert("counters");
    counters.forEach((c) => (query = query.values(c)));

    try {
      const id = query.execute();
      return new Counter({ id, ...counters[0] });
    } catch {
      return null;
    }
  }

  public static async createAsync(
    ...counters: [Omit<CounterBase, "id">, ...Omit<CounterBase, "id">[]]
  ) {
    let query = builder.insert("counters");
    counters.forEach((c) => (query = query.values(c)));

    return query
      .execute_async()
      .then((id) => new Counter({ id, ...counters[0] }))
      .catch(() => null);
  }

  public static find(interval?: Interval | null) {
    let q = builder.select("counters");
    if (typeof interval === "number") {
      q = q.where("interval", "=", interval);
    }
    return q.execute().map((row) => {
      const c = new Counter(row);
      c.initialSetup();
      return c;
    });
  }

  public static async findAsync(interval?: Interval | null) {
    let q = builder.select("counters");
    if (typeof interval === "number") {
      q = q.where("interval", "=", interval);
    }

    return q.execute_async().then((rows) =>
      rows.map((r) => {
        const c = new Counter(r);
        c.initialSetup();
        return c;
      }),
    );
  }

  public increase() {
    if (this._updateTimeoutId) {
      clearTimeout(this._updateTimeoutId);
      this._updateTimeoutId = undefined;
    }

    if (!this._inDateRange()) {
      this._countEntries();
    }

    const created = getUnixTimeForNow();
    const entry = Entry.create({ counter_id: this.id, created });
    if (entry) {
      this.value += 1;
      this._lastCount = created;
      this._lastEntry = entry;
    }
    this.updated = _("just now");
  }

  public decrease() {
    if (this._updateTimeoutId) {
      clearTimeout(this._updateTimeoutId);
      this._updateTimeoutId = undefined;
    }

    if (!this._inDateRange()) {
      this._countEntries();
      this._findLastEntry();
    }

    if (this._lastEntry && this._value) {
      this._lastEntry.delete();
      this._value -= 1;
    }
    this.notify("value");
    this._lastCount = getUnixTimeForNow();
    this._findLastEntry();
    this.notify("updated");
  }

  public refresh() {
    const _refresh = () => {
      if (!this._inDateRange()) {
        const { value } = this;
        this._countEntries();
        this._findLastEntry();
        if (this._value !== value) this.notify("value");
      }
      this.updated = this._lastEntry
        ? distanceToNow(this._lastEntry.created)
        : _("never");
    };
    this._updateTimeoutId = setTimeout(_refresh, 150);
  }

  public delete() {
    builder.delete("counters").where("id", "=", this.id).execute();
  }

  public update(counter: Partial<CounterBase>) {
    const changes = builder
      .update("counters")
      .set(counter)
      .where("id", "=", this.id)
      .execute();
    if (changes) {
      Object.assign(this, counter);
    }
  }

  public getHistory(page: number, interval: Interval, limit = 8) {
    const {
      start,
      increase: [increase, unit],
    } = getModifiers(interval);

    return getDatesCTE(this.id, start, increase, unit)
      .select("date_range")
      .columns(({ fn }) => ["d", fn.row_number().over("d").as("number")])
      .orderBy("d", false)
      .limit(limit)
      .offset(page * limit)
      .select()
      .unionAll(
        builder
          .select("entries")
          .columns(({ fn, val }) => [
            fn.unixepoch("created", "auto", ...start).as("d"),
            val(0).as("number"),
          ])
          .where("counter_id", "=", this.id),
      )
      .select()
      .columns(({ fn, ex }) => [
        "d",
        "number",
        ex(fn.count("*"), "-", 1).as("c"),
      ])
      .groupBy("d")
      .having("number", ">", 0)
      .execute();
  }

  public getStreaks() {
    const { start, increase } = getModifiers(this._interval);
    return getDatesCTE(this.id, start, ...increase)
      .with("filtered_date_range", (b) => {
        const q = b
          .select("date_range")
          .columns(({ fn }) => [
            "d",
            fn.row_number().over("d", true).as("number"),
          ]);
        if (this._days) {
          return q.where(
            ({ fn, ex, val }) =>
              ex(
                fn.pow(
                  val(2),
                  fn.strftime<number>("%w", "d", "unixepoch", "localtime"),
                ),
                "&",
                this._days as number,
              ),
            "!=",
            0,
          );
        }
        return q;
      })
      .with("completed", (b) => {
        let q = b
          .select("entries")
          .columns(({ fn }) => [
            fn.unixepoch("created", "auto", ...start).as("d"),
            fn.count("*").as("c"),
          ])
          .where("counter_id", "=", this.id);

        if (this._days) {
          q = q.where(
            ({ fn, ex, val }) =>
              ex(
                fn.pow(
                  val(2),
                  fn.strftime<number>("%w", "d", "unixepoch", "localtime"),
                ),
                "&",
                this._days as number,
              ),
            "!=",
            0,
          );
        }
        return q.groupBy("d").having("c", ">=", this._goal);
      })
      .with("combined", (b) =>
        b
          .select("filtered_date_range")
          .columns(({ val }) => ["d", "number", val(0).as("c")])
          .unionAll(
            b
              .select("completed")
              .columns(({ val }) => ["d", val(0).as("number"), "c"]),
          )
          .select()
          .columns(({ fn, ex }) => [
            "c",
            "d",
            "number",
            ex(fn.sum("c"), ">", 0).as("completed"),
          ])
          .groupBy("d")
          .having("completed", "=", 1),
      )
      .with("streaks", (b) =>
        b
          .select("combined")
          .columns(({ fn, ex }) => [
            "c",
            "completed",
            "d",
            "number",
            ex(
              ex(
                "number",
                "-",
                fn.lag<number>("number", 1, "number").over("number"),
              ),
              ">",
              1,
            ).as("diff"),
          ])
          .select()
          .columns(({ fn }) => [
            "c",
            "completed",
            "d",
            "number",
            fn.sum("diff").over("number").as("g"),
          ]),
      )
      .select("streaks")
      .columns(({ fn }) => [fn.count("*").as("streak"), "number"])
      .groupBy("g")
      .execute();
  }

  public getCompletions() {
    const {
      start,
      increase: [increase, unit],
    } = getModifiers(this._interval);
    let q = getDatesCTE(this.id, start, increase, unit)
      .select("date_range")
      .columns(({ fn }) => [fn.count("*").as("total")]);

    if (this._days) {
      q = q.where(
        ({ fn, ex, val }) =>
          ex(
            fn.pow(
              val(2),
              fn.strftime<number>("%w", "d", "unixepoch", "localtime"),
            ),
            "&",
            this._days as number,
          ),
        "!=",
        0,
      );
    }
    const {
      0: { total },
    } = q.execute();

    const {
      0: { completed },
    } = builder
      .select("entries")
      .columns(({ fn }) => [
        fn.unixepoch("created", "auto", ...start).as("d"),
        fn.count("*").as("c"),
      ])
      .where("counter_id", "=", this.id)
      .groupBy("d")
      .having("c", ">=", this._goal)
      .select()
      .columns(({ fn }) => [fn.count("*").as("completed")])
      .execute();

    return { completed, rate: completed / total };
  }

  private _inDateRange() {
    if (this._interval === Interval.LIFETIME) return true;
    const range = getDateRange(this._interval);
    return range
      ? range[0] <= this._lastCount && this._lastCount <= range[1]
      : true;
  }
}
