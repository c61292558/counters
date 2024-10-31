// Copyright 2023 Guillermo Peña
// SPDX-License-Identifier: GPL-3.0-or-later

import Counters from "gi://Counters";
import GLib from "gi://GLib";

import type {
  DBMigrations,
  QueryParams,
  StringOrNumber,
} from "../common/interfaces.js";

const DB_NAME = "counters";
const DB_DIR = GLib.build_pathv(GLib.DIR_SEPARATOR_S, [
  GLib.get_user_data_dir(),
  "counters",
]);

const MIGRATIONS: DBMigrations = {
  initial_schema: (db) => {
    db.execute_non_select(
      `CREATE TABLE IF NOT EXISTS "counters" (
          "id" INTEGER PRIMARY KEY AUTOINCREMENT,
          "title" TEXT NOT NULL,
          "goal"  INTEGER NOT NULL DEFAULT 0,
          "interval"  INTEGER NOT NULL DEFAULT 0
        );`,
    );
    db.execute_non_select(
      `CREATE TABLE IF NOT EXISTS "entries" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "counter_id" INTEGER NOT NULL,
        "created" INTEGER NOT NULL,
        FOREIGN KEY ("counter_id") REFERENCES "counters" ("id") ON DELETE CASCADE
      );`,
    );
  },
  custom_days: (db) => {
    db.execute_non_select(`ALTER TABLE counters ADD COLUMN days INTEGER`);
    db.execute_non_select(`UPDATE counters SET days = 127 WHERE interval = 0`);
  },
};

export class Database {
  private _connection: Counters.Database;

  private _migrationsTable =
    'CREATE TABLE IF NOT EXISTS "migrations" ("version" TEXT NOT NULL)';
  private _appliedMigrations = 'SELECT * FROM "migrations"';
  private _createMigration = 'INSERT INTO "migrations" VALUES ("%s")';

  constructor() {
    this._ensureDirs();
    this._createConnection();
    this._applyMigrations();
  }

  private _ensureDirs() {
    GLib.mkdir_with_parents(DB_DIR, parseInt("0755", 8));
  }

  private _createConnection() {
    this._connection = Counters.Database.new(
      GLib.build_filenamev([DB_DIR, `${DB_NAME}.db`]),
    );
    this._connection.execute_non_select("PRAGMA foreign_keys=ON");
    this._connection.execute_non_select("PRAGMA journal_mode=WAL");
    this._connection.execute_non_select("PRAGMA synchronous=NORMAL");
  }

  private _applyMigrations() {
    this._connection.execute_non_select(this._migrationsTable);
    const applied = this.execute_select(this._appliedMigrations).map(
      (row) => row["version"] as string,
    );
    Object.entries(MIGRATIONS).forEach(([version, migration]) => {
      if (!applied.includes(version)) {
        migration(this._connection);
        this.execute_non_select(this._createMigration.format(version));
      }
    });
  }

  close() {
    this._connection.close();
  }

  execute_non_select(
    query: string,
    params?: QueryParams,
  ): Counters.NonSelectResult {
    if (params) query = this._substituteParams(query, params);
    return this._connection.execute_non_select(query);
  }

  execute_select(
    query: string,
    params?: QueryParams,
  ): { [name: string]: StringOrNumber }[] {
    if (params) query = this._substituteParams(query, params);
    return this._connection
      .execute_select(query)
      .map((row) =>
        Object.entries(row).reduce(
          (prev, [k, v]) => ({ ...prev, [k]: v as unknown }),
          {},
        ),
      );
  }

  async execute_non_select_async(
    query: string,
    params?: QueryParams,
  ): Promise<Counters.NonSelectResult> {
    if (params) query = this._substituteParams(query, params);
    return new Promise((resolve, reject) => {
      this._connection.execute_non_select_async(query, (_obj, res) => {
        try {
          resolve(this._connection.execute_non_select_finish(res));
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  async execute_select_async(
    query: string,
    params?: QueryParams,
  ): Promise<{ [name: string]: StringOrNumber }[]> {
    if (params) query = this._substituteParams(query, params);
    return new Promise((resolve, reject) => {
      this._connection.execute_select_async(query, (_obj, res) => {
        try {
          resolve(
            this._connection.execute_select_finish(res).map((row) => {
              return Object.entries(row).reduce(
                (prev, [k, v]) => ({ ...prev, [k]: v as unknown }),
                {},
              );
            }),
          );
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  private _substituteParams(query: string, params: QueryParams) {
    const formatParam = (param: string | number | null) => {
      if (param === null) {
        return "NULL";
      } else if (typeof param === "string") {
        return `'${param.replaceAll('"', '""')}'`;
      }
      return param.toString();
    };
    if (Array.isArray(params)) {
      for (let index = 0; index < params.length; index++) {
        query = query.replace("?", formatParam(params[index]));
      }
    } else {
      Object.entries(params).forEach(([key, value]) => {
        query = query.replaceAll(`:${key}`, formatParam(value));
      });
    }
    return query;
  }
}

const db = new Database();

export default db;
