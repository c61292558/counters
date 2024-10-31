// Copyright 2023 Guillermo Peña
// SPDX-License-Identifier: GPL-3.0-or-later

import { EntryBase } from "../common/interfaces.js";
import builder from "../storage/builder.js";
import { Interval, getModifiers } from "./interval.js";

export class Entry {
  public id: number;
  public counterId: number;
  public created: number;

  constructor(params: EntryBase) {
    this.id = params.id;
    this.counterId = params.counter_id;
    this.created = params.created;
  }

  public static create(
    ...entries: [Omit<EntryBase, "id">, ...Omit<EntryBase, "id">[]]
  ) {
    let query = builder.insert("entries");
    entries.forEach((e) => (query = query.values(e)));

    try {
      const id = query.execute();
      return new Entry({ id, ...entries[0] });
    } catch {
      return null;
    }
  }

  public static async createAsync(
    ...entries: [Omit<EntryBase, "id">, ...Omit<EntryBase, "id">[]]
  ) {
    let query = builder.insert("entries");
    entries.forEach((e) => (query = query.values(e)));

    return query
      .execute_async()
      .then((id) => new Entry({ id, ...entries[0] }))
      .catch((e) => {
        logError(e);
        return null;
      });
  }

  static async selectByCounterIdAsync(counter_id: number) {
    return builder
      .select("entries")
      .where("counter_id", "=", counter_id)
      .execute_async()
      .then((rows) => rows.map((e) => new Entry(e)));
  }

  public static countByCounterId(counter_id: number, interval: Interval) {
    const { start, end } = getModifiers(interval);

    let q = builder
      .select("entries")
      .columns(({ fn }) => [fn.count().as("value")])
      .where("counter_id", "=", counter_id);

    if (interval !== Interval.LIFETIME) {
      q = q
        .where("created", ">=", ({ fn }) => fn.unixepoch("now", ...start))
        .where("created", "<", ({ fn }) => fn.unixepoch("now", ...end));
    }
    return q.execute()[0].value;
  }

  public static findLastByCounterId(counter_id: number) {
    const row = builder
      .select("entries")
      .where("counter_id", "=", counter_id)
      .orderBy("id", false)
      .limit(1)
      .execute()[0];
    if (row) return new Entry(row);
  }

  public static deleteByCounterId(counter_id: number) {
    return builder
      .delete("entries")
      .where("counter_id", "=", counter_id)
      .execute();
  }

  public delete() {
    return builder.delete("entries").where("id", "=", this.id).execute();
  }
}
