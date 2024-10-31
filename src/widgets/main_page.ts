// Copyright 2023 Guillermo Peña
// SPDX-License-Identifier: GPL-3.0-or-later

import Gettext from "gettext";
import Adw from "gi://Adw";
import GObject from "gi://GObject";
import Gtk from "gi://Gtk?version=4.0";
import {
  GObjectClass,
  GObjectProperty,
  GtkChild,
} from "../common/decorators.js";
import { Counter } from "../models/counter.js";
import { type Counters } from "../models/counters.js";
import { type ListBox } from "./list_box.js";
import { Row } from "./row.js";
import { type Window } from "./window.js";

@GObjectClass({
  Template: "resource:///io/gitlab/guillermop/Counters/ui/main-page.ui",
})
export class MainPage extends Adw.NavigationPage {
  @GtkChild
  private _splitView: Adw.OverlaySplitView;
  @GtkChild
  private _headerStack: Gtk.Stack;
  @GtkChild
  private _headerBar: Adw.HeaderBar;
  @GtkChild
  private _selectionButton: Gtk.Button;
  @GtkChild
  private _deleteButton: Gtk.Button;
  @GtkChild
  private _searchButton: Gtk.ToggleButton;
  @GtkChild
  private _stack: Gtk.Stack;
  @GtkChild
  private _completedListBox: ListBox;
  @GtkChild
  private _inProgressListBox: ListBox;
  @GtkChild
  private _searchBar: Gtk.SearchBar;
  @GtkChild
  private _searchEntry: Gtk.SearchEntry;

  private _selecting: boolean;

  constructor(params?: Partial<Adw.NavigationPage.ConstructorProperties>) {
    super(params);
  }

  public bindModel(counters: Counters) {
    const { completedModel, inProgressModel } = counters;
    this._completedListBox.bind_model(
      completedModel,
      (obj) => new Row(obj as Counter),
    );
    this._inProgressListBox.bind_model(
      inProgressModel,
      (obj) => new Row(obj as Counter),
    );
    this._searchEntry.bind_property(
      "text",
      counters,
      "filter-text",
      GObject.BindingFlags.SYNC_CREATE,
    );
  }

  public update({ empty, emptySearch }: Counters) {
    if (empty) {
      this._stack.visibleChildName = "empty";
      this._searchBar.set_key_capture_widget(null);
      this.selecting = false;
      this._searchBar.searchModeEnabled = false;
    } else if (emptySearch) {
      this._stack.visibleChildName = "empty-search";
      return;
    } else {
      this._stack.visibleChildName = "default";
      this._searchBar.set_key_capture_widget(this);
    }
  }

  selectAll() {
    if (!this.selecting) this.selecting = true;
    this._completedListBox.select_all();
    this._inProgressListBox.select_all();
  }

  unselectAll() {
    this._completedListBox.unselect_all();
    this._inProgressListBox.unselect_all();
  }

  toggleSearch(toggle?: boolean) {
    if (toggle !== undefined) {
      this._searchBar.searchModeEnabled = toggle;
      return;
    }
    const mode = this._searchBar.searchModeEnabled;
    if (mode && !this._searchBar.get_focus_child()) {
      this._searchEntry.grab_focus();
    } else {
      this._searchBar.searchModeEnabled = !mode;
    }
  }

  @GObjectProperty("boolean")
  get selecting() {
    return this._selecting;
  }

  set selecting(selecting: boolean) {
    this._selecting = selecting;
  }

  private _onSearchModeChanged(bar: Gtk.SearchBar) {
    if (!bar.searchModeEnabled) this._searchButton.grab_focus();
  }

  private _onSelectingChanged() {
    this._completedListBox.unselect_all();
    this._inProgressListBox.unselect_all();

    if (this.selecting) {
      this._headerStack.visibleChildName = "selection";
      this._headerBar.set_decoration_layout("None");
      this._selectionButton.grab_focus();
    } else {
      this._headerStack.visibleChildName = "default";
      this._headerBar.set_decoration_layout(null);
    }
  }

  private _onCancelButtonClicked() {
    this.selecting = false;
  }

  private _onDeleteButtonClicked() {
    const rows = [
      ...this._completedListBox.get_selected_rows(),
      ...this._inProgressListBox.get_selected_rows(),
    ] as Row[];
    (this.root as Window).deleteCounters(
      rows.map((row) => row.counter as Counter),
    );
  }

  private _onSelectedRowsChanged() {
    const rows = [
      ...this._completedListBox.get_selected_rows(),
      ...this._inProgressListBox.get_selected_rows(),
    ];
    const selected = rows.length;
    let text: string = _("Select items");
    if (selected > 0) {
      text = Gettext.ngettext(
        "%d selected counter",
        "%d selected counters",
        selected,
      ).format(selected);
      this._deleteButton.sensitive = true;
    } else {
      this._deleteButton.sensitive = false;
    }
    this._selectionButton.set_label(text);
  }

  private _onRowActivated(_listBox: ListBox, row: Row) {
    const win = this.root as Window;
    win.innerPage.counter = row.counter as Counter;
    win.goToInnerPage();
  }

  private _updateSubtitleClosure(
    _self: this,
    completed: number,
    total: number,
  ) {
    return "Completed: %s / %s".format(completed, total);
  }

  public toggleSidebar() {
    if (this._splitView.collapsed) {
      this._splitView.showSidebar = !this._splitView.showSidebar;
    }
  }
}
