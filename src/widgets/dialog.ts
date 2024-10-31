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
import { type Counter } from "../models/counter.js";
import { Interval } from "../models/interval.js";
import { type DaysRow } from "./days_row.js";

@GObjectClass({
  Template: "resource:///io/gitlab/guillermop/Counters/ui/dialog.ui",
  Signals: {
    response: {
      flags: GObject.SignalFlags.RUN_FIRST,
      param_types: [GObject.TYPE_INT],
    },
  },
})
export class Dialog extends Adw.Dialog {
  @GtkChild
  private _titleEntry: Adw.EntryRow;
  @GtkChild
  private _intervalCombo: Adw.ComboRow;
  @GtkChild
  private _goalSpin: Adw.SpinRow;
  @GtkChild
  private _daysRow: DaysRow;

  private _counter?: Counter;

  private _valid: boolean;

  private _validFields = {
    name: false,
    days: true,
  };
  private _interval: number;

  constructor(
    params: Partial<Adw.Dialog.ConstructorProperties> & {
      counter?: Counter;
      interval: number | null;
    },
  ) {
    const { counter, interval, ...other } = params;
    super(other);
    this._counter = counter;
    this._initWidgets(interval);
    this._titleEntry.grab_focus();
  }

  @GObjectProperty("boolean")
  get valid() {
    return this._valid;
  }

  private set valid(v: boolean) {
    this._valid = v;
  }

  private _initWidgets(interval: number | null) {
    if (this._counter) {
      const { title, goal, interval, days } = this._counter;
      if (interval === Interval.DAILY && days !== null) {
        this._daysRow.value = days;
      }
      this._titleEntry.text = title;
      this._goalSpin.value = goal;
      this._intervalCombo.selected =
        interval === Interval.LIFETIME ? 4 : interval;
      this.title = _("Edit Counter");
    } else {
      this._intervalCombo.selected =
        interval === null ? Interval.DAILY : interval;
      this.title = _("New Counter");
    }
  }

  private _validateDays() {
    const valid = this._daysRow.value !== 0;
    if (valid) {
      this._daysRow.get_style_context().remove_class("error");
    } else {
      this._daysRow.get_style_context().add_class("error");
    }
    this._validFields.days = valid;
    this.valid = Object.values(this._validFields).every((v) => v);
  }

  private _validateTitle() {
    const valid = Boolean(
      this._titleEntry.text && this._titleEntry.text.trim(),
    );
    if (valid) {
      this._titleEntry.get_style_context().remove_class("error");
    } else {
      this._titleEntry.get_style_context().add_class("error");
    }
    this._validFields.name = valid;
    this.valid = Object.values(this._validFields).every((v) => v);
  }

  private _onSaveButtonClicked() {
    if (this._valid) this.emit("response", Gtk.ResponseType.OK);
  }

  private _onDeleteButtonClicked() {
    this.emit("response", Gtk.ResponseType.CANCEL);
  }

  private _onIntervalSelectedNotify() {
    const is_daily = this._intervalCombo.selected === 0;
    this._daysRow.visible = is_daily;
    this._validFields.days = is_daily ? this._daysRow.value !== 0 : true;
    this.valid = Object.values(this._validFields).every((v) => v);
  }

  getData() {
    let interval = this._intervalCombo.selected as Interval;
    if (!(interval in Interval)) interval = -1;

    let days: number | null = null;
    if (interval === Interval.DAILY) {
      days = this._daysRow.value;
    }

    return {
      title: this._titleEntry.text,
      interval,
      goal: this._goalSpin.value,
      days,
    };
  }
}
