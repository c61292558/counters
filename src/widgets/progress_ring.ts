// Copyright 2023 Guillermo Peña
// SPDX-License-Identifier: GPL-3.0-or-later

import Adw from "gi://Adw";
import Gtk from "gi://Gtk?version=4.0";
// @ts-expect-error This module doesn't import nicely
import Cairo from "cairo";

import { GObjectClass, GObjectProperty } from "../common/decorators.js";

@GObjectClass()
export class ProgressRing extends Gtk.DrawingArea {
  private _value: number = 0;
  private _valueNotifyId: number;
  private _accentId: number;

  constructor(params: Partial<Gtk.DrawingArea.ConstructorProperties>) {
    super(params);
    this.set_draw_func(this._drawFunc.bind(this));
    this._valueNotifyId = this.connect("notify::value", () =>
      this.queue_draw(),
    );
    this._accentId = Adw.StyleManager.get_default().connect(
      "notify::accent-color",
      () => this.queue_draw(),
    );
  }

  @GObjectProperty("float", { maximum: 1, minimum: 0 })
  get value() {
    return this._value;
  }

  set value(value) {
    this._value = value;
  }

  private _drawFunc(_self: Gtk.DrawingArea, cr: Cairo.Context, width: number) {
    const styleContext = this.get_style_context();
    const color = styleContext.lookup_color(
      this._value === 1 ? "success_bg_color" : "accent_bg_color",
    )[1];

    const lineWidth = 5;
    const radius = width / 2 - lineWidth;

    /* eslint-disable @typescript-eslint/no-unsafe-call */
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    cr.translate(width / 2, width / 2);
    cr.arc(0, 0, radius, 0, 2 * Math.PI);
    cr.setSourceRGBA(color.red, color.green, color.blue, 0.2);
    cr.setLineWidth(lineWidth);
    cr.stroke();

    const start = -90 * (Math.PI / 180.0);
    const end = (360 * this._value - 90) * (Math.PI / 180.0);

    cr.arc(0, 0, radius, start, end);
    cr.setSourceRGBA(color.red, color.green, color.blue, 1);
    cr.setLineWidth(lineWidth);
    cr.stroke();

    cr.$dispose();
  }

  destroy() {
    this.disconnect(this._valueNotifyId);
    Adw.StyleManager.get_default().disconnect(this._accentId);
    this.unparent();
  }
}
