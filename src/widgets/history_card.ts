// Copyright 2023 Guillermo Peña
// SPDX-License-Identifier: GPL-3.0-or-later

import GLib from "gi://GLib";
import Gtk from "gi://Gtk?version=4.0";

import {
  GObjectClass,
  GObjectProperty,
  GtkChild,
} from "../common/decorators.js";
import { Counter } from "../models/counter.js";
import { Interval } from "../models/interval.js";
import { type Chart } from "./chart.js";

@GObjectClass({
  Template: "resource:///io/gitlab/guillermop/Counters/ui/history-card.ui",
})
export class HistoryCard extends Gtk.Box {
  @GtkChild
  private _previousButton: Gtk.Button;
  @GtkChild
  private _dateRangeLabel: Gtk.Label;
  @GtkChild
  private _chart: Chart;

  private _page = 0;
  private _interval: Interval;
  private _counter: Counter;

  @GObjectProperty("int")
  get page() {
    return this._page;
  }

  set page(page) {
    this._page = page;
  }

  @GObjectProperty("int")
  get interval() {
    return this._interval;
  }

  set interval(interval: Interval) {
    this._interval = interval;
  }

  @GObjectProperty("object", { objectType: Counter })
  get counter(): Counter {
    return this._counter;
  }

  set counter(counter: Counter) {
    this._counter = counter;
  }

  private _paginate() {
    const history = this._counter.getHistory(this._page, this._interval);
    let fmt = "%x";
    if (this._interval === Interval.MONTHLY) {
      fmt = "%b %y";
    } else if (this._interval === Interval.YEARLY) {
      fmt = "%Y";
    }

    const { 0: first, length, [length - 1]: last } = history;

    this._previousButton.sensitive = first.number > 1;

    const startDate = GLib.DateTime.new_from_unix_local(first.d);
    const endDate = GLib.DateTime.new_from_unix_local(last.d);

    this._dateRangeLabel.label =
      first === last
        ? (startDate.format(fmt) as string)
        : `${startDate.format(fmt) as string} - ${endDate.format(fmt) as string}`;

    this._chart.data = history.map(({ c, d }, index, array) => {
      const date = GLib.DateTime.new_from_unix_local(d);
      let fmt: string;
      switch (this._interval) {
        case Interval.MONTHLY:
          fmt = `%b${date.get_month() === 1 || index === 0 ? `\n%Y` : ""}`;
          break;
        case Interval.YEARLY:
          fmt = "%Y";
          break;
        default:
          fmt =
            date.get_day_of_month() === 1 || index === 0
              ? `%b${array.length === 0 ? " %d " : ""}\n%Y`
              : "%d";
          break;
      }
      return { date: date.format(fmt) as string, count: c };
    });
  }

  public update() {
    this._paginate();
    this._chart.queue_draw();
  }

  private _onIntervalNotify() {
    this.page = 0;
    this.update();
  }

  private _onPreviousButtonClicked() {
    this.page += 1;
    this.update();
  }

  private _onNextButtonClicked() {
    this.page -= 1;
    this.update();
  }

  private _onCounterNotify() {
    if (this._counter) {
      this.page = 0;

      const interval =
        this._counter.interval === Interval.LIFETIME
          ? Interval.DAILY
          : this._counter.interval;

      if (this._interval !== interval) {
        this.interval = interval;
      } else {
        this.update();
      }
    }
  }
}
