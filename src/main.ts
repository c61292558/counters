// Copyright 2023 Guillermo Peña
// SPDX-License-Identifier: GPL-3.0-or-later

import Adw from "gi://Adw";
import Gio from "gi://Gio";
import Gtk from "gi://Gtk?version=4.0";

import "./widgets/index.js";

import { createAction } from "./common/action.js";
import { GObjectClass } from "./common/decorators.js";
import { Preferences } from "./widgets/preferences.js";
import { Window } from "./widgets/window.js";

@GObjectClass()
export class Application extends Adw.Application {
  constructor(params?: Partial<Adw.ApplicationWindow.ConstructorProperties>) {
    super({
      ...params,
      application_id: pkg.name,
      flags: Gio.ApplicationFlags.DEFAULT_FLAGS,
      resource_base_path: "/io/gitlab/guillermop/Counters/",
    });
    this.add_action(
      createAction("quit", () => {
        if (this.activeWindow) {
          this.activeWindow.close();
        }
        this.quit();
      }),
    );
    this.add_action(
      createAction("about", () => {
        const aboutWindow = new Adw.AboutDialog({
          application_icon: pkg.name,
          application_name: _("Counters"),
          comments: _("A counter application"),
          developer_name: "Guillermo Peña",
          version: "1.0.0",
          developers: ["Guillermo Peña <guillermop@keemail.me>"],
          copyright: "© 2023 Guillermo Peña",
          license_type: Gtk.License.GPL_3_0,
          translator_credits: _("translator-credits"),
          website: "https://gitlab.com/guillermop/counters",
        });
        aboutWindow.present(this.active_window);
      }),
    );
    this.add_action(
      createAction("preferences", () => {
        const preferences = new Preferences();
        preferences.present(this.active_window);
      }),
    );
    this.set_accels_for_action("app.quit", ["<primary>q"]);
    this.set_accels_for_action("app.preferences", ["<Ctrl>comma"]);
    this.set_accels_for_action("win.show-help-overlay", ["<Primary>question"]);
    this.set_accels_for_action("win.add", ["<Ctrl>N"]);
    this.set_accels_for_action("win.select-all", ["<Ctrl>A"]);
    this.set_accels_for_action("win.search", ["<Ctrl>F"]);
    this.set_accels_for_action("win.toggle-sidebar", ["F9"]);
    this.set_accels_for_action("window.close", ["<Ctrl>W"]);
  }

  public vfunc_activate(): void {
    let { active_window } = this;
    if (!active_window) {
      active_window = new Window({ application: this });
      if (this.application_id.endsWith("Devel"))
        active_window.add_css_class("devel");
    }
    active_window.present();
  }
}

export function main(argv: string[]): number {
  return new Application().run(argv);
}
