// Copyright 2023 Guillermo Peña
// SPDX-License-Identifier: GPL-3.0-or-later

import Gio from "gi://Gio";

import { GObjectClass } from "../common/decorators.js";

export enum SortOrder {
  AZ = 0,
  ZA,
  OLDEST,
  NEWEST,
}

@GObjectClass()
export class Settings extends Gio.Settings {
  private static _instance: Settings;

  constructor() {
    if (Settings._instance) {
      return Settings._instance;
    }
    super({ schema_id: pkg.name });
    Settings._instance = this;
  }

  static get default(): Settings {
    return new Settings();
  }

  get window_width() {
    return this.get_int("window-width");
  }

  set window_width(width: number) {
    this.set_int("window-width", width);
  }

  get window_height() {
    return this.get_int("window-height");
  }

  set window_height(height: number) {
    this.set_int("window-height", height);
  }

  get is_maximized() {
    return this.get_boolean("window-maximized");
  }

  set is_maximized(maximized: boolean) {
    this.set_boolean("window-maximized", maximized);
  }

  get sort_order() {
    return this.get_enum("sort-order");
  }

  get selected_category() {
    return this.get_string("selected-category");
  }

  set selected_category(category: string) {
    this.set_string("selected-category", category);
  }
}
