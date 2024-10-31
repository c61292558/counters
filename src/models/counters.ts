// Copyright 2023 Guillermo Peña
// SPDX-License-Identifier: GPL-3.0-or-later

import Gio from "gi://Gio";
import GObject from "gi://GObject";
import Gtk from "gi://Gtk?version=4.0";

import { GObjectClass, GObjectProperty } from "../common/decorators.js";
import { type Category } from "./category.js";
import { Counter } from "./counter.js";
import { SortOrder } from "./settings.js";

@GObjectClass()
export class Model extends Gtk.FilterListModel<Counter> {
  private _model: Gio.ListStore<Counter>;

  constructor({
    sorter,
    ...params
  }: Partial<Gtk.FilterListModel.ConstructorProperties> & {
    sorter: Gtk.Sorter;
  }) {
    super(params);
    this._model = new Gio.ListStore<Counter>();
    this.model = new Gtk.SortListModel<Counter>({
      model: this._model,
      sorter,
    });
  }

  find(item: Counter) {
    return this._model.find(item);
  }

  remove(item: Counter) {
    const [found, position] = this.find(item);
    if (!found) return;
    this._model.remove(position);
  }

  insert(...counters: Counter[]) {
    this._model.splice(0, 0, counters);
  }

  splice(position: number, n_removals: number, counters: Counter[]) {
    this._model.splice(position, n_removals, counters);
  }
}

@GObjectClass()
export class Counters extends GObject.Object {
  private _filter: Gtk.CustomFilter;
  private _trash: Counter[] = [];
  private _filterText: string;
  private _empty: boolean = true;
  private _emptySearch: boolean = false;

  private _completedModel: Model;
  private _inProgressModel: Model;

  private _sorter: Gtk.CustomSorter;
  private _sortOrder: SortOrder = SortOrder.OLDEST;
  private _nItems: number = 0;

  private _completed: number = 0;
  private _inProgress: number = 0;

  constructor(params: { sortOrder: SortOrder }) {
    super();
    this._sortOrder = params.sortOrder;
    this._setup();
  }

  private _setup() {
    this._sorter = new Gtk.CustomSorter();
    this._sorter.set_sort_func((a: Counter, b: Counter) => {
      let desc: boolean;
      let x: number | string;
      let y: number | string;
      if (
        this._sortOrder === SortOrder.AZ ||
        this._sortOrder === SortOrder.ZA
      ) {
        x = a.title.toLocaleLowerCase();
        y = b.title.toLocaleLowerCase();
        desc = this._sortOrder === SortOrder.ZA;
      } else {
        x = a.id;
        y = b.id;
        desc = this._sortOrder === SortOrder.NEWEST;
      }
      return (x < y ? -1 : 1) * (desc ? -1 : 1);
    });

    this._filter = new Gtk.CustomFilter();
    this._filter.set_filter_func((counter) => {
      if (!this._filterText) return true;
      return (counter as Counter).title
        .toLowerCase()
        .includes(this._filterText.trim().toLowerCase());
    });

    this.connect("notify::filter-text", () => {
      this._filter.changed(Gtk.FilterChange.DIFFERENT);
      this.emptySearch =
        this._completedModel.nItems + this._inProgressModel.nItems === 0 &&
        Boolean(this._filterText);
    });

    this._completedModel = new Model({
      filter: this._filter,
      sorter: this._sorter,
    });
    this._completedModel.model.bind_property(
      "n-items",
      this,
      "completed",
      GObject.BindingFlags.SYNC_CREATE,
    );

    this._inProgressModel = new Model({
      filter: this._filter,
      sorter: this._sorter,
    });
    this._inProgressModel.model.bind_property(
      "n-items",
      this,
      "in-progress",
      GObject.BindingFlags.SYNC_CREATE,
    );
  }

  @GObjectProperty("boolean", { defaultValue: true })
  get empty() {
    return this._empty;
  }

  private set empty(empty: boolean) {
    this._empty = empty;
  }

  @GObjectProperty("boolean", { defaultValue: false })
  get emptySearch() {
    return this._emptySearch;
  }

  private set emptySearch(empty: boolean) {
    this._emptySearch = empty;
  }

  @GObjectProperty("string")
  get filterText() {
    return this._filterText;
  }

  private set filterText(text: string) {
    this._filterText = text;
  }

  get trashNItems() {
    return this._trash.length;
  }

  @GObjectProperty("int")
  get completed() {
    return this._completed;
  }

  private set completed(completed: number) {
    this._completed = completed;
  }

  @GObjectProperty("int")
  get inProgress() {
    return this._inProgress;
  }

  private set inProgress(inProgress: number) {
    this._inProgress = inProgress;
  }

  @GObjectProperty("int")
  get nItems() {
    return this._nItems;
  }

  private set nItems(nItems: number) {
    this._nItems = nItems;
  }

  @GObjectProperty("object", { objectType: Model })
  get completedModel() {
    return this._completedModel;
  }

  @GObjectProperty("object", { objectType: Model })
  get inProgressModel() {
    return this._inProgressModel;
  }

  public load(category: Category) {
    let counters: Counter[];
    counters = Counter.find(category.interval);
    if (this._trash.length) {
      counters = counters.filter(
        (c) => !this._trash.find((t) => c.id === t.id),
      );
    }
    this._insert(counters, true, true);
  }

  public insert(...counters: Counter[]) {
    this._insert(counters, true);
  }

  private _insert(counters: Counter[], track = false, replace = false) {
    const { completed, inProgress } = counters.reduce(
      ({ completed, inProgress }, cur) =>
        cur.goal > 0 && cur.value >= cur.goal
          ? { inProgress, completed: [...completed, cur] }
          : { completed, inProgress: [...inProgress, cur] },
      { completed: [], inProgress: [] } as {
        completed: Counter[];
        inProgress: Counter[];
      },
    );

    if (track) {
      const callback = (c: Counter) => {
        if (c.goal > 0 && c.value >= c.goal) {
          const [found] = this._completedModel.find(c);
          if (!found) {
            this._completedModel.insert(c);
          }
          this._inProgressModel.remove(c);
        } else {
          const [found] = this._inProgressModel.find(c);
          if (!found) this._inProgressModel.insert(c);
          this._completedModel.remove(c);
        }
      };

      counters.map((c) => {
        c.connect("notify::goal", callback);
        c.connect("notify::value", callback);
      });
    }

    this._completedModel.splice(
      0,
      replace ? this._completedModel.model.get_n_items() : 0,
      completed,
    );
    this._inProgressModel.splice(
      0,
      replace ? this._inProgressModel.model.get_n_items() : 0,
      inProgress,
    );
    const nItems = (replace ? 0 : this._nItems) + counters.length;
    this.nItems = nItems;
    this.empty = nItems === 0;
  }

  public remove(...counters: Counter[]) {
    counters.forEach((item) => {
      this._completedModel.remove(item);
      this._inProgressModel.remove(item);
    });
    this._trash.push(...counters);
    this.nItems -= counters.length;
    this.empty = this._nItems === 0;
  }

  public restoreTrash(category: Category) {
    const trash = this._trash.filter((c) => category.includesCounter(c));
    this._insert(trash);
    this._trash = [];
  }

  public emptyTrash() {
    this._trash.forEach((item) => {
      item.delete();
    });
    this._trash = [];
  }

  public updateAll() {
    for (let i = 0; i < this._completedModel.model.get_n_items(); i++) {
      (this._completedModel.model.get_item(i) as Counter).refresh();
    }
    for (let i = 0; i < this._inProgressModel.model.get_n_items(); i++) {
      (this._inProgressModel.model.get_item(i) as Counter).refresh();
    }
  }

  public resort(order?: SortOrder) {
    if (order !== undefined) this._sortOrder = order;
    this._sorter.changed(Gtk.SorterChange.DIFFERENT);
  }
}
