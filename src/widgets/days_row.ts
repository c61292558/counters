// Copyright 2023 Guillermo Peña
// SPDX-License-Identifier: GPL-3.0-or-later

import Gtk from "gi://Gtk?version=4.0";
import GObject from "gi://GObject";

import {
  GObjectClass,
  GtkChild,
  GObjectProperty,
} from "../common/decorators.js";

@GObjectClass({
  Template: "resource:///io/gitlab/guillermop/Counters/ui/days-row.ui",
})
export class DaysRow extends Gtk.ListBoxRow {
  @GtkChild
  private _sunButton: Gtk.ToggleButton;
  @GtkChild
  private _monButton: Gtk.ToggleButton;
  @GtkChild
  private _tueButton: Gtk.ToggleButton;
  @GtkChild
  private _wedButton: Gtk.ToggleButton;
  @GtkChild
  private _thuButton: Gtk.ToggleButton;
  @GtkChild
  private _friButton: Gtk.ToggleButton;
  @GtkChild
  private _satButton: Gtk.ToggleButton;

  private _value: number = 127;

  constructor(params?: Gtk.ListBoxRow.ConstructorProperties) {
    super(params);
  }

  @GObjectProperty("int")
  get value() {
    return this._value;
  }

  set value(value: number) {
    const [sun, mon, tue, wed, thu, fri, sat] = value
      .toString(2)
      .padStart(7, "0")
      .split("")
      .reverse()
      .map((v) => !!parseInt(v));

    this._toggleSignals(true);

    this._sunButton.active = sun;
    this._monButton.active = mon;
    this._tueButton.active = tue;
    this._wedButton.active = wed;
    this._thuButton.active = thu;
    this._friButton.active = fri;
    this._satButton.active = sat;

    this._toggleSignals(false);

    this._value = value;
  }

  private _toggleSignals(block: boolean) {
    const buttons = [
      this._sunButton,
      this._monButton,
      this._tueButton,
      this._wedButton,
      this._thuButton,
      this._friButton,
      this._satButton,
    ];
    buttons.forEach((button) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const handler = GObject.signal_handler_find(button, {
        signalId: "toggled",
      });
      if (block) {
        GObject.signal_handler_block(button, handler);
      } else {
        GObject.signal_handler_unblock(button, handler);
      }
    });
  }

  private _onButtonToggled() {
    this._value = [
      this._sunButton.active,
      this._monButton.active,
      this._tueButton.active,
      this._wedButton.active,
      this._thuButton.active,
      this._friButton.active,
      this._satButton.active,
    ].reduce((acc, cur, i) => (acc += cur ? 2 ** i : 0), 0);
    this.notify("value");
  }
}
