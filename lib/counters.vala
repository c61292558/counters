// Copyright 2023 Guillermo Peña
// SPDX-License-Identifier: GPL-3.0-or-later

using GLib;
using Sqlite;


namespace Counters {

    public errordomain SQLError {
        SYNTAX_ERROR
    }

    public struct NonSelectResult {
        int64 last_rowid;
        int64 changes;
    }

    public class Database {

        private enum CommandType {
            CLOSE,
            SELECT,
            NON_SELECT,
        }

        private class Command {
            public CommandType command_type { get; private set; }
            public SourceFunc callback;

            public Command (CommandType command_type, owned SourceFunc? callback) {
                this.command_type = command_type;
                this.callback = (owned) callback;
            }
        }

        private Sqlite.Database connection;
        private AsyncQueue<Command> async_queue;
        private Thread<void> thread_b;

        public Database (string filename) {
            Sqlite.Database.open (filename, out this.connection);
            this.async_queue = new AsyncQueue<Command> ();
            this.thread_b = new Thread<void> ("thread_b", this.target);
        }

        public NonSelectResult execute_non_select_cb (string sql) throws SQLError {
            string errmsg = null;

            int rc = this.connection.exec (sql, null, out errmsg);
            if (rc == Sqlite.OK) {
                return NonSelectResult () {
                    last_rowid = this.connection.last_insert_rowid (),
                    changes = this.connection.changes (),
                };
            }

            throw new SQLError.SYNTAX_ERROR (errmsg);
        }

        public NonSelectResult execute_non_select (string sql) throws SQLError {
            AsyncQueue<bool> queue = new AsyncQueue<bool> ();

            var result = NonSelectResult () {
                last_rowid = 0,
                changes = 0,
            };

            SQLError sql_error = null;

            var cmd = new Command (CommandType.NON_SELECT, () => {
                try {
                    result = this.execute_non_select_cb (sql);
                } catch (SQLError e) {
                    sql_error = e;
                }

                queue.push (true);

                return false;
            });

            this.async_queue.push (cmd);

            queue.pop ();

            if (sql_error != null) {
                throw sql_error;
            }

            return result;
        }

        public async NonSelectResult execute_non_select_async (string sql) throws SQLError {
            SourceFunc callback = execute_non_select_async.callback;

            var result = NonSelectResult () {
                last_rowid = 0,
                changes = 0,
            };

            SQLError sql_error = null;

            var cmd = new Command (CommandType.NON_SELECT, () => {
                try {
                    result = this.execute_non_select_cb (sql);
                } catch (SQLError e) {
                    sql_error = e;
                }

                Idle.add ((owned) callback);

                return false;
            });

            this.async_queue.push (cmd);

            yield;

            if (sql_error != null) {
                throw sql_error;
            }

            return result;
        }

        private HashTable<string, GLib.Value>[] execute_select_cb (string sql) throws SQLError {
            HashTable<string, GLib.Value>[] rows = null;
            Sqlite.Statement stmt;

            int rc;
            string errmsg;


            if ((rc = this.connection.prepare_v2 (sql, -1, out stmt, null)) == 1) {
                errmsg = this.connection.errmsg ();
                throw new SQLError.SYNTAX_ERROR (errmsg);
            }

            int columns = stmt.column_count ();
            do {
                rc = stmt.step ();
                switch (rc) {
                case Sqlite.DONE :
                    break;
                case Sqlite.ROW:
                    HashTable<string, GLib.Value?> row = new HashTable<string, GLib.Value?> (str_hash, str_equal);
                    for (int col = 0; col < columns; col++) {
                        string name = stmt.column_name (col);
                        int type = stmt.column_type (col);

                        GLib.Value value;
                        switch (type) {
                        case Sqlite.INTEGER:
                            value = stmt.column_int (col);
                            break;
                        default:
                            value = stmt.column_text (col);
                            break;
                        }
                        row.insert (name, value);
                    }
                    rows += row;
                    break;
                default:
                    throw new SQLError.SYNTAX_ERROR (this.connection.errmsg ());
                }
            } while (rc == Sqlite.ROW);

            return rows;
        }

        public HashTable<string, GLib.Value>[] execute_select (string sql) throws SQLError {
            AsyncQueue<bool> queue = new AsyncQueue<bool> ();

            HashTable<string, GLib.Value>[] rows = null;

            SQLError sql_error = null;

            var cmd = new Command (CommandType.SELECT, () => {
                try {
                    rows = this.execute_select_cb (sql);
                } catch (SQLError e) {
                    sql_error = e;
                }

                queue.push (true);

                return false;
            });

            this.async_queue.push (cmd);

            queue.pop ();

            if (sql_error != null) {
                throw sql_error;
            }

            return rows;
        }

        public async HashTable<string, GLib.Value>[] execute_select_async (string sql) throws SQLError {
            SourceFunc callback = execute_select_async.callback;

            HashTable<string, GLib.Value>[] rows = null;

            SQLError sql_error = null;

            var cmd = new Command (CommandType.SELECT, () => {

                try {
                    rows = this.execute_select_cb (sql);
                } catch (SQLError e) {
                    sql_error = e;
                }

                Idle.add ((owned) callback);

                return false;
            });

            this.async_queue.push (cmd);

            yield;

            if (sql_error != null) {
                throw sql_error;
            }

            return rows;
        }

        private void target () {
            while (true) {
                var cmd = async_queue.pop ();

                if (cmd.command_type == CommandType.CLOSE || cmd.callback == null) {
                    break;
                }

                cmd.callback ();
            }
        }

        public void close () {
            this.async_queue.push (new Command (CommandType.CLOSE, null));
            this.thread_b.join ();
            this.connection = null;
        }
    }
}
