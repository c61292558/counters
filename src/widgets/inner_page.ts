// Copyright 2023 Guillermo Peña
// SPDX-License-Identifier: GPL-3.0-or-later

import Adw from "gi://Adw";
import Gtk from "gi://Gtk?version=4.0";

import {
  GObjectClass,
  GObjectProperty,
  GtkChild,
} from "../common/decorators.js";
import { Counter } from "../models/counter.js";
import { Interval } from "../models/interval.js";
import { HistoryCard } from "./history_card.js";
import { type Window } from "./window.js";
import { type Categories } from "../models/categories.js";

@GObjectClass({
  Template: "resource:///io/gitlab/guillermop/Counters/ui/inner-page.ui",
})
export class InnerPage extends Adw.NavigationPage {
  @GtkChild
  private _levelBar: Gtk.LevelBar;
  @GtkChild
  private _bestStreakRow: Adw.ActionRow;
  @GtkChild
  private _currentStreakRow: Adw.ActionRow;
  @GtkChild
  private _completionsRow: Adw.ActionRow;
  @GtkChild
  private _completionRateRow: Adw.ActionRow;
  @GtkChild
  private _historyCard: HistoryCard;

  private _counter: Counter | null;
  private _signals: number[] = [];

  constructor(params?: Partial<Adw.NavigationPage.ConstructorProperties>) {
    super(params);
  }

  static get default(): InnerPage {
    return new InnerPage();
  }

  @GObjectProperty("object", { objectType: Counter })
  get counter(): Counter | null {
    if (this._counter === undefined) return null;
    return this._counter;
  }

  set counter(v: Counter | null) {
    this._counter = v;
  }

  private _onCounterNotify() {
    if (this._counter) {
      this._signals.push(
        this._counter.connect("notify::goal", () => {
          this._updateStreaks();
          this._updateCompletions();
        }),
        this._counter.connect("notify::value", () => {
          this._updateStreaks();
          this._updateCompletions();
          this._historyCard.update();
        }),
        this._counter.connect("notify::days", () => {
          this._updateStreaks();
          this._updateCompletions();
        }),
      );
      this._updateStreaks();
      this._updateCompletions();
    }
  }

  private _visibilityClosure(_self: this, interval: Interval, goal: number) {
    return interval !== Interval.LIFETIME && Boolean(goal);
  }

  private _progressClosure(_self: this, value: number, goal: number) {
    return _("%d of %d").format(value, goal);
  }

  private _subtitleClosure(_self: this, interval: Interval) {
    if (interval === Interval.DAILY) {
      return _("Daily");
    } else if (interval === Interval.WEEKLY) {
      return _("Weekly");
    } else if (interval === Interval.MONTHLY) {
      return _("Monthly");
    } else if (interval === Interval.YEARLY) {
      return _("Yearly");
    }
    return _("Lifetime");
  }

  private _valueClosure(_self: this, value: number) {
    return Math.min(value, this._levelBar.maxValue);
  }

  private _updateStreaks() {
    const counter = this._counter as Counter;
    if (counter.interval === Interval.LIFETIME || !counter.goal) return;
    let current = 0;
    let best = 0;
    counter.getStreaks().forEach((s) => {
      best = Math.max(s.streak, best);
      current = s.number === 1 || s.number === 2 ? s.streak : current;
    });
    this._bestStreakRow.subtitle = best.toString();
    this._currentStreakRow.subtitle = current.toString();
  }

  private _updateCompletions() {
    const counter = this._counter as Counter;
    if (counter.interval === Interval.LIFETIME || !counter.goal) return;
    const { rate, completed } = counter.getCompletions();
    this._completionsRow.subtitle = completed.toString();
    this._completionRateRow.subtitle = Intl.NumberFormat(undefined, {
      style: "percent",
      minimumFractionDigits: 1,
    }).format(rate);
  }

  private _onDeleteButtonClicked() {
    (this.root as Window).deleteCounters([this._counter as Counter]);
    (this.get_parent() as Adw.NavigationView).pop();
  }

  private _onEditButtonClicked() {
    (this.root as Window).showCounterDialog(this._counter as Counter);
  }

  private _onIncreaseButtonClicked() {
    (this._counter as Counter).increase();
  }

  private _onDecreaseButtonClicked() {
    (this._counter as Counter).decrease();
  }

  private _updateLevelBarOffsets() {
    const { value, goal } = this._counter as Counter;
    this._levelBar.value = 0;
    this._levelBar.value = Math.min(goal, value);

    this._levelBar.remove_offset_value("ignore");
    this._levelBar.remove_offset_value("ignore-2");
    this._levelBar.remove_offset_value("completed");

    if (goal) {
      this._levelBar.add_offset_value("ignore", 1);
      if (goal > 1) {
        this._levelBar.add_offset_value("ignore-2", goal - 1);
      }
      this._levelBar.add_offset_value("completed", goal);
    }
  }

  private _onHidden() {
    this._signals.forEach((signal) =>
      (this._counter as Counter).disconnect(signal),
    );
    this._signals.length = 0;
    const categories = (this.root as Window).categories as Categories;
    if (!categories.selectedCategory.includesCounter(this.counter as Counter)) {
      categories.selectByInterval((this.counter as Counter).interval);
    }
    this.counter = null;
  }
}
