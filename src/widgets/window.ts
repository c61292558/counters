// Copyright 2023 Guillermo Peña
// SPDX-License-Identifier: GPL-3.0-or-later

import Adw from "gi://Adw";
import GObject from "gi://GObject";
import Gtk from "gi://Gtk?version=4.0";

import { createAction } from "../common/action.js";
import {
  GObjectClass,
  GObjectProperty,
  GtkChild,
} from "../common/decorators.js";
import { Categories } from "../models/categories.js";
import { type Category } from "../models/category.js";
import { Counter } from "../models/counter.js";
import { Counters } from "../models/counters.js";
import { Settings, SortOrder } from "../models/settings.js";
import database from "../storage/database.js";
import { Dialog } from "../widgets/dialog.js";
import { type InnerPage } from "./inner_page.js";
import { type MainPage } from "./main_page.js";

@GObjectClass({
  Template: "resource:///io/gitlab/guillermop/Counters/ui/window.ui",
})
export class Window extends Adw.ApplicationWindow {
  @GtkChild
  private _navigationView: Adw.NavigationView;
  @GtkChild
  private _overlay: Adw.ToastOverlay;
  @GtkChild
  private _mainPage: MainPage;
  @GtkChild
  private _innerPage: InnerPage;

  private _dialog: Dialog | null = null;
  private _toast: Adw.Toast | null;
  private _intervalId: number;

  private _categories: Categories | null;
  private _counters: Counters | null;
  private _settings: Settings;

  constructor(params?: Partial<Adw.ApplicationWindow.ConstructorProperties>) {
    super(params);

    this._setModels();
    this._setActions();
    this._loadSettings();
    this._restartTimer();
  }

  private _setModels() {
    this._settings = new Settings();
    this._settings.connect("changed::sort-order", ({ sort_order }: Settings) =>
      (this._counters as Counters).resort(sort_order),
    );

    this.counters = new Counters({ sortOrder: this._settings.sort_order });

    const updateMainPage = (counters: Counters) =>
      this._mainPage.update(counters);

    this.counters.connect("notify::empty", updateMainPage);
    this.counters.connect("notify::empty-search", updateMainPage);

    this._mainPage.bindModel(this.counters);

    this.categories = new Categories();
    this.categories.connect(
      "notify::selected-item",
      ({ selectedCategory }: Categories) => {
        (this._counters as Counters).load(selectedCategory);
        this._settings.selected_category = selectedCategory.id;
        this._mainPage.selecting = false;
        this._mainPage.toggleSearch(false);
        this._mainPage.toggleSidebar();
      },
    );
  }

  private _setActions() {
    this.add_action(
      createAction("add", () => {
        if (
          this._navigationView.visiblePage.tag === "main" &&
          !this._mainPage.selecting
        )
          this.showCounterDialog();
      }),
    );
    this.add_action(
      createAction(
        "select-all",
        () => {
          if (this._navigationView.visiblePage.tag === "main")
            this._mainPage.selectAll();
        },
        {
          obj: this._counters as Counters,
          property: "empty",
          flags:
            GObject.BindingFlags.INVERT_BOOLEAN |
            GObject.BindingFlags.SYNC_CREATE,
        },
      ),
    );
    this.add_action(
      createAction(
        "select-none",
        () => {
          if (this._navigationView.visiblePage.tag === "main")
            this._mainPage.unselectAll();
        },
        {
          obj: this._counters as Counters,
          property: "empty",
          flags:
            GObject.BindingFlags.INVERT_BOOLEAN |
            GObject.BindingFlags.SYNC_CREATE,
        },
      ),
    );
    this.add_action(
      createAction(
        "search",
        () => {
          if (this._navigationView.visiblePage.tag === "main")
            this._mainPage.toggleSearch();
        },
        {
          obj: this._counters as Counters,
          property: "empty",
          flags:
            GObject.BindingFlags.INVERT_BOOLEAN |
            GObject.BindingFlags.SYNC_CREATE,
        },
      ),
    );
    this.add_action(
      createAction("toggle-sidebar", () => {
        if (this._navigationView.visiblePage.tag === "main")
          this._mainPage.toggleSidebar();
      }),
    );
    this.add_action(this._settings.create_action("sort-order"));
  }

  private _loadSettings() {
    const { window_height, window_width, is_maximized, selected_category } =
      this._settings;
    this.set_default_size(window_width, window_height);
    if (is_maximized) this.maximize();
    (this._categories as Categories).selectById(selected_category);
  }

  private _restartTimer() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
    }
    this._intervalId = setInterval(() => {
      (this._counters as Counters).updateAll();
    }, 60_000);
  }

  deleteCounters(counters: Counter[]) {
    (this._counters as Counters).remove(...counters);

    let message = _('Counter "%s" deleted.').format(counters[0].title);
    if ((this._counters as Counters).trashNItems > 1) {
      message = _("%d counters deleted").format(
        (this._counters as Counters).trashNItems,
      );
    }

    if (this._toast) {
      this._toast.set_title(message);
      return;
    }

    this._toast = new Adw.Toast({
      title: message,
      button_label: _("Undo"),
      priority: Adw.ToastPriority.HIGH,
    });

    this._toast.connect("dismissed", () => {
      (this._counters as Counters).emptyTrash();
      this._toast = null;
    });

    this._toast.connect("button-clicked", () => {
      (this._counters as Counters).restoreTrash(
        (this._categories as Categories).selectedCategory,
      );
      this._toast = null;
    });
    this._overlay.add_toast(this._toast);
  }

  private _onCloseRequest() {
    clearInterval(this._intervalId);
    const [width, height] = this.get_default_size();
    this._settings.window_width = width;
    this._settings.window_height = height;
    this._settings.is_maximized = this.is_maximized();
    database.close();
    return false;
  }

  showCounterDialog(counter?: Counter) {
    if (this._dialog !== null) return;
    const { selectedCategory } = this._categories as Categories;
    this._dialog = new Dialog({ counter, interval: selectedCategory.interval });
    this._dialog.connect("closed", () => (this._dialog = null));
    this._dialog.connect(
      "response",
      (dialog: Dialog, responseCode: Gtk.ResponseType) => {
        if (responseCode === Gtk.ResponseType.OK) {
          if (counter) {
            const oldTitle = counter.title;
            counter.update(dialog.getData());
            if (selectedCategory.includesCounter(counter)) {
              if (
                oldTitle !== counter.title &&
                [SortOrder.AZ, SortOrder.ZA].includes(this._settings.sort_order)
              ) {
                (this._counters as Counters).resort();
              }
            }
          } else {
            const counter = Counter.create(dialog.getData());
            if (counter) {
              if (selectedCategory.includesCounter(counter)) {
                (this._counters as Counters).insert(counter);
              } else {
                (this._categories as Categories).selectByInterval(
                  counter.interval,
                );
              }
            }
          }
        }
        dialog.close();
      },
    );
    this._dialog.present(this);
  }

  private _onIsActiveChanged() {
    if (this.isActive) {
      this._restartTimer();
      (this._counters as Counters).updateAll();
    }
  }

  goToInnerPage() {
    this._navigationView.push(this._innerPage);
  }

  refresh() {
    const category = this._categories?.selectedCategory as Category;
    (this._counters as Counters).load(category);
  }

  @GObjectProperty("object", { objectType: Gtk.Widget })
  get mainPage() {
    return this._mainPage;
  }

  @GObjectProperty("object", { objectType: Gtk.Widget })
  get innerPage() {
    return this._innerPage;
  }

  @GObjectProperty("object", { objectType: Gtk.SingleSelection })
  get categories() {
    if (this._categories === undefined) return null;
    return this._categories;
  }

  private set categories(categories: Categories | null) {
    this._categories = categories;
  }

  @GObjectProperty("object", { objectType: Counters })
  get counters() {
    if (this._counters === undefined) return null;
    return this._counters;
  }

  private set counters(counters: Counters | null) {
    this._counters = counters;
  }
}
