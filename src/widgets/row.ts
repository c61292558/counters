// Copyright 2023 Guillermo Peña
// SPDX-License-Identifier: GPL-3.0-or-later

import Adw from "gi://Adw";
import GObject from "gi://GObject";
import Gtk from "gi://Gtk?version=4.0";

import {
  GObjectClass,
  GObjectProperty,
  GtkChild,
} from "../common/decorators.js";
import { Counter } from "../models/counter.js";
import { type ListBox } from "./list_box.js";
import { ProgressRing } from "./progress_ring.js";

@GObjectClass({
  Template: "resource:///io/gitlab/guillermop/Counters/ui/row.ui",
})
export class Row extends Adw.ActionRow {
  private _selecting: boolean;
  private _selected: boolean;

  private _counter: Counter | null;

  @GtkChild
  private _progressBox: Gtk.Box;
  @GtkChild
  private _decreaseButton: Gtk.Button;
  @GtkChild
  private _increaseButton: Gtk.Button;

  private _progressRing: ProgressRing;

  private _signals: { obj: GObject.Object; signal: number }[] = [];

  constructor(counter: Counter) {
    super();
    this.counter = counter;
    this._connectSignals();
    this._createProgressRing();
  }

  private _signalConnect(
    ...[obj, ...args]: Parameters<typeof GObject.signal_connect>
  ) {
    this._signals.push({ obj, signal: GObject.signal_connect(obj, ...args) });
  }

  private _connectSignals() {
    this._signalConnect(
      this,
      "notify::parent",
      this._onParentNotify.bind(this),
    );
    this._signalConnect(
      this,
      "notify::selecting",
      this._onSelectingChanged.bind(this),
    );
    this._signalConnect(
      this,
      "notify::selected",
      this._onSelectedChanged.bind(this),
    );
    this._signalConnect(
      this._decreaseButton,
      "clicked",
      this._onDecreaseButtonClicked.bind(this),
    );
    this._signalConnect(
      this._increaseButton,
      "clicked",
      this._onIncreaseButtonClicked.bind(this),
    );
  }

  private _createProgressRing() {
    this._progressRing = new ProgressRing({
      content_width: 28,
      content_height: 28,
    });
    this._progressBox.append(this._progressRing);

    const valueEx = Gtk.PropertyExpression.new(Counter.$gtype, null, "value");
    const goalEx = Gtk.PropertyExpression.new(Counter.$gtype, null, "goal");

    Gtk.ClosureExpression.new(
      GObject.TYPE_DOUBLE,
      (_, value, goal) => (goal ? Math.min(value / goal, 1) : 0),
      [valueEx, goalEx],
    ).bind(this._progressRing, "value", this.counter);
  }

  @GObjectProperty("boolean")
  get selecting() {
    return this._selecting;
  }

  set selecting(selecting: boolean) {
    this._selecting = selecting;
  }

  @GObjectProperty("boolean")
  get selected() {
    return this._selected;
  }

  set selected(selected: boolean) {
    this._selected = selected;
  }

  @GObjectProperty("object", { objectType: Counter })
  get counter() {
    if (this._counter === undefined) return null;
    return this._counter;
  }

  private set counter(counter: Counter | null) {
    this._counter = counter;
  }

  private _onIncreaseButtonClicked() {
    (this._counter as Counter).increase();
  }

  private _onDecreaseButtonClicked() {
    (this._counter as Counter).decrease();
  }

  private _onSelectedChanged() {
    const listbox = this.get_parent() as ListBox;
    if (this.selected) {
      if (!this.is_selected()) listbox.select_row(this);
    } else {
      listbox.unselect_row(this);
    }
  }

  private _onSelectingChanged() {
    this.selected = false;
  }

  private _onParentNotify() {
    if (!this.get_parent()) {
      this._progressRing.destroy();
      this._signals.forEach(({ obj, signal }) => obj.disconnect(signal));
      this.counter = null;
    }
  }
}
