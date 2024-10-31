// Copyright 2023 Guillermo Peña
// SPDX-License-Identifier: GPL-3.0-or-later

import GObject from "gi://GObject";

import { GObjectClass, GObjectProperty } from "../common/decorators.js";
import { Interval } from "./interval.js";
import { Counter } from "./counter.js";

type CategoryConstructorProps = {
  id: string;
  title: string;
  iconName: string;
  interval: number | null;
};

@GObjectClass()
export class Category extends GObject.Object {
  private _title: string;
  private _iconName: string;
  private _interval: Interval | null;

  public id: string;

  constructor({ id, title, iconName, interval }: CategoryConstructorProps) {
    super();
    this.id = id;
    this._title = title;
    this._iconName = iconName;
    this._interval = interval;
  }

  public includesCounter(counter: Counter) {
    if (this.interval === null) {
      return true;
    }
    return counter.interval === this._interval;
  }

  @GObjectProperty("string")
  get title() {
    return this._title;
  }

  set title(title: string) {
    this._title = title;
  }

  @GObjectProperty("string")
  get iconName() {
    return this._iconName;
  }

  set iconName(iconName: string) {
    this._iconName = iconName;
  }

  @GObjectProperty("int")
  get interval() {
    return this._interval;
  }

  private set interval(interval: number | null) {
    this._interval = interval;
  }
}
