// Copyright 2023 Guillermo Peña
// SPDX-License-Identifier: GPL-3.0-or-later

import Gdk from "gi://Gdk";
import Gtk from "gi://Gtk?version=4.0";

import { GObjectClass } from "../common/decorators.js";
import { type Row } from "./row.js";
import { type Window } from "./window.js";

@GObjectClass()
export class ListBox extends Gtk.ListBox {
  constructor() {
    super();
    this._setupGestures();
    this._connectSignals();
  }

  private _connectSignals() {
    this.connect_after("selected-rows-changed", () => {
      let has_selection = false;
      let index = 0;
      let row = this.get_row_at_index(index) as Row;
      while (row) {
        row.selected = row.is_selected();
        has_selection = row.selected || has_selection;
        index += 1;
        row = this.get_row_at_index(index) as Row;
      }
    });
  }

  private _setupGestures() {
    const click = new Gtk.GestureClick();
    click.connect(
      "released",
      (gesture: Gtk.Gesture, n: number, x: number, y: number) => {
        const state = gesture.get_current_event_state();

        const win = this.root as Window;

        if (!win.mainPage.selecting) {
          if (
            state & Gdk.ModifierType.CONTROL_MASK ||
            state & Gdk.ModifierType.SHIFT_MASK
          )
            win.mainPage.selecting = true;
        }

        if (win.mainPage.selecting) {
          const row = this.get_row_at_y(y);
          if (!row) return;
          if (row.is_selected()) this.unselect_row(row);
          else this.select_row(row);
          gesture.set_state(Gtk.EventSequenceState.CLAIMED);
        }
      },
    );
    this.add_controller(click);
  }
}
