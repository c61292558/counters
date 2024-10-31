/**
 * Counters 1
 *
 * Generated from 1.0
 */

import * as GLib from "glib2";
import * as GObject from "gobject2";
import * as Gio from "gio2";

export class SQLError extends GLib.Error {
    static $gtype: GObject.GType<SQLError>;

    constructor(options: { message: string; code: number });
    constructor(copy: SQLError);

    // Fields
    static SYNTAX_ERROR: number;
}
export module Database {
    export interface ConstructorProperties {
        [key: string]: any;
    }
}
export class Database {
    static $gtype: GObject.GType<Database>;

    constructor(properties?: Partial<Database.ConstructorProperties>, ...args: any[]);
    _init(properties?: Partial<Database.ConstructorProperties>, ...args: any[]): void;

    // Fields
    ref_count: number;

    // Constructors

    static ["new"](filename: string): Database;

    // Members

    execute_non_select_cb(sql: string): NonSelectResult;
    execute_non_select(sql: string): NonSelectResult;
    execute_non_select_async(sql: string): Promise<[NonSelectResult]>;
    execute_non_select_async(sql: string, _callback_: Gio.AsyncReadyCallback<this> | null): void;
    execute_non_select_async(
        sql: string,
        _callback_?: Gio.AsyncReadyCallback<this> | null
    ): Promise<[NonSelectResult]> | void;
    execute_non_select_finish(_res_: Gio.AsyncResult): NonSelectResult;
    execute_select(sql: string): GLib.HashTable[];
    execute_select_async(sql: string): Promise<GLib.HashTable[]>;
    execute_select_async(sql: string, _callback_: Gio.AsyncReadyCallback<this> | null): void;
    execute_select_async(
        sql: string,
        _callback_?: Gio.AsyncReadyCallback<this> | null
    ): Promise<GLib.HashTable[]> | void;
    execute_select_finish(_res_: Gio.AsyncResult): GLib.HashTable[];
    close(): void;
}

export class DatabasePrivate {
    static $gtype: GObject.GType<DatabasePrivate>;

    constructor(copy: DatabasePrivate);
}

export class NonSelectResult {
    static $gtype: GObject.GType<NonSelectResult>;

    constructor(
        properties?: Partial<{
            last_rowid?: number;
            changes?: number;
        }>
    );
    constructor(copy: NonSelectResult);

    // Fields
    last_rowid: number;
    changes: number;
}
