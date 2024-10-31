// Copyright 2023 Guillermo Peña
// SPDX-License-Identifier: GPL-3.0-or-later

import Gio from "gi://Gio";
import Gtk from "gi://Gtk?version=4.0";

import { GObjectClass } from "../common/decorators.js";
import { Category } from "./category.js";
import { Interval } from "./interval.js";

@GObjectClass()
export class Categories extends Gtk.SingleSelection<Category> {
  constructor() {
    super({ autoselect: false, model: new Gio.ListStore() });
    this._load();
  }

  get selectedCategory() {
    return this.selectedItem as Category;
  }

  private _selectByPropertyName(name: string, value: string | Interval) {
    for (let i = 0; i < this.nItems; i++) {
      const category = this.get_item(i) as Category;
      if (category[name] === value) {
        this.select_item(i, true);
        return;
      }
    }
    this.select_item(0, true);
  }

  public selectById(id: string) {
    this._selectByPropertyName("id", id);
  }

  public selectByInterval(interval: Interval) {
    this._selectByPropertyName("interval", interval);
  }

  private _load() {
    (this.model as Gio.ListStore).splice(0, 0, [
      new Category({
        id: "all",
        title: _("All Counters"),
        iconName: "io.gitlab.guillermop.Counters-symbolic",
        interval: null,
      }),
      new Category({
        id: "daily",
        title: _("Daily"),
        iconName: "today-symbolic",
        interval: Interval.DAILY,
      }),
      new Category({
        id: "weekly",
        title: _("Weekly"),
        iconName: "work-week-symbolic",
        interval: Interval.WEEKLY,
      }),
      new Category({
        id: "monthly",
        title: _("Monthly"),
        iconName: "month-symbolic",
        interval: Interval.MONTHLY,
      }),
      new Category({
        id: "yearly",
        title: _("Yearly"),
        iconName: "year-symbolic",
        interval: Interval.YEARLY,
      }),
    ]);
  }
}
