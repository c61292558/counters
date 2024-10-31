// Copyright 2023 Guillermo Peña
// SPDX-License-Identifier: GPL-3.0-or-later

import Gettext from "gettext";
import Adw from "gi://Adw";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import Gtk from "gi://Gtk?version=4.0";

import { isoDate } from "../common/date_utils.js";
import { GObjectClass, GObjectProperty } from "../common/decorators.js";
import { Counter } from "../models/counter.js";
import { Entry } from "../models/entry.js";
import { Interval } from "../models/interval.js";
import { type Window } from "./window.js";

Gio._promisify(Gtk.FileDialog.prototype, "open", "open_finish");
Gio._promisify(Gtk.FileDialog.prototype, "save", "save_finish");
Gio._promisify(Gio.File.prototype, "replace_async", "replace_finish");
Gio._promisify(
  Gio.FileOutputStream.prototype,
  "write_bytes_async",
  "write_bytes_finish",
);
Gio._promisify(Gio.File.prototype, "read_async", "read_finish");
Gio._promisify(
  Gio.DataInputStream.prototype,
  "read_line_async",
  "read_line_finish",
);

@GObjectClass({
  Template: "resource:///io/gitlab/guillermop/Counters/ui/preferences.ui",
})
export class Preferences extends Adw.PreferencesDialog {
  private _importing: boolean;
  private _exporting: boolean;

  constructor(params?: Partial<Adw.PreferencesDialog.ConstructorProperties>) {
    super(params);
  }

  private async _onExportRowActivated() {
    const win = this.root as Window;

    const fileDialog = new Gtk.FileDialog({
      default_filter: new Gtk.FileFilter({ mime_types: ["text/csv"] }),
      initial_name: `habits_${isoDate()}.csv`,
    });

    let n_counters = 0;

    await fileDialog
      .save(win, null)
      .then(async (file) => {
        if (file) {
          const counters = await Counter.findAsync();

          if (counters.length > 0) {
            this.exporting = true;
            this.canClose = false;

            const stream = await file.replace_async(
              null,
              true,
              GLib.PRIORITY_DEFAULT,
              Gio.FileCreateFlags.REPLACE_DESTINATION,
              null,
            );

            const encoder = new TextEncoder();
            for (let index = 0; index < counters.length; index++) {
              const { title, id } = counters[index];
              const entries = await Entry.selectByCounterIdAsync(id);
              const line = `${title},${entries.map(({ created }) => `${created}000`).join(",")}\n`;
              await stream.write_bytes_async(
                encoder.encode(line),
                GLib.PRIORITY_DEFAULT,
                null,
              );
            }

            n_counters = counters.length;
          }
        }
      })
      .catch((e) => {
        if (!(e instanceof Gtk.DialogError)) {
          logError(e);
        }
      })
      .finally(() => {
        this.exporting = false;
        this.canClose = true;

        const title = Gettext.ngettext(
          "%d counter exported",
          "%d counters exported",
          n_counters,
        ).format(n_counters);

        if (n_counters > 0) {
          this.add_toast(new Adw.Toast({ title }));
        }
      });
  }

  private async _onImportRowActivated() {
    if (this._importing) return;

    const win = this.root as Window;

    const fileDialog = new Gtk.FileDialog({
      default_filter: new Gtk.FileFilter({ mime_types: ["text/csv"] }),
    });

    let n_counters = 0;

    await fileDialog
      .open(win, null)
      .then(async (file) => {
        if (file) {
          this.importing = true;
          this.canClose = false;

          const base_stream = await file.read_async(
            GLib.PRIORITY_DEFAULT,
            null,
          );
          const input = new Gio.DataInputStream({ base_stream });
          const decoder = new TextDecoder("utf-8");
          let [line] = await input.read_line_async(GLib.PRIORITY_DEFAULT, null);
          while (line) {
            const decoded = decoder.decode(line);
            const columns = decoded.split(",");

            const counter = await Counter.createAsync({
              title: columns[0],
              goal: 1,
              interval: Interval.DAILY,
              days: 127,
            });

            if (counter) {
              await Entry.createAsync(
                ...(columns.splice(1).map((timestamp) => {
                  return {
                    counter_id: counter.id,
                    created: parseInt(timestamp.substring(0, 10)),
                  };
                }) as Parameters<typeof Entry.createAsync>),
              );
              n_counters++;
            }

            [line] = await input.read_line_async(GLib.PRIORITY_DEFAULT, null);
          }
        }
      })
      .catch((e) => {
        if (!(e instanceof Gtk.DialogError)) {
          logError(e);
        }
      })
      .finally(() => {
        this.importing = false;
        this.canClose = true;

        const title = Gettext.ngettext(
          "%d counter imported",
          "%d counters imported",
          n_counters,
        ).format(n_counters);

        if (n_counters > 0) {
          this.add_toast(new Adw.Toast({ title }));
          win.refresh();
        }
      });
  }

  @GObjectProperty("boolean")
  get importing() {
    return this._importing;
  }

  set importing(importing: boolean) {
    this._importing = importing;
  }

  @GObjectProperty("boolean")
  get exporting() {
    return this._exporting;
  }

  set exporting(exporting: boolean) {
    this._exporting = exporting;
  }
}
