// Copyright 2023 Guillermo Peña
// SPDX-License-Identifier: GPL-3.0-or-later

import Adw from "gi://Adw";
import Gtk from "gi://Gtk?version=4.0";
// @ts-expect-error This module doesn't import nicely
import Cairo from "cairo";

import { GObjectClass } from "../common/decorators.js";

@GObjectClass()
export class Chart extends Gtk.DrawingArea {
  private _data: { count: number; date: string }[] = [];

  constructor(params: Partial<Gtk.DrawingArea.ConstructorProperties>) {
    super(params);
    this.set_draw_func(this._drawFunc.bind(this));
    Adw.StyleManager.get_default().connect("notify::accent-color", () =>
      this.queue_draw(),
    );
  }

  get data() {
    return this._data;
  }

  set data(value) {
    this._data = value;
  }

  private _drawFunc(
    _self: Gtk.DrawingArea,
    cr: Cairo.Context,
    width: number,
    height: number,
  ) {
    const paddingBottom = 54;
    const paddingTop = 18;
    const paddingX = 18;

    const chartArea = {
      width: width - paddingX * 2.0,
      height: height - paddingTop - paddingBottom,
    };

    const maxX = this._data.length;
    const maxY = Math.max(...this._data.map(({ count: value }) => value));

    const sizeX = chartArea.width / (maxX + 1);
    const sizeY = chartArea.height / maxY;

    const barWidth = Math.min(64, sizeX * 0.8);

    const styleContext = this.get_style_context();
    const axisColor = styleContext.get_color();
    const barColor = styleContext.lookup_color("accent_bg_color")[1];

    /* eslint-disable @typescript-eslint/no-unsafe-call */
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    cr.translate(0, height);

    // Draw grid
    cr.setLineWidth(1);
    const gridHeight = chartArea.height / 4;
    cr.setSourceRGBA(axisColor.blue, axisColor.red, axisColor.green, 0.1);
    for (let i = 0; i < 4; i++) {
      const y = -(gridHeight * (i + 1) + paddingBottom);
      cr.moveTo(paddingX, y);
      cr.lineTo(chartArea.width + paddingX, y);
      cr.stroke();
    }
    for (let i = 0; i < maxX + 1; i++) {
      const x = sizeX * (i + 1) + paddingX;
      cr.moveTo(x, -paddingBottom);
      cr.lineTo(x, -chartArea.height - paddingBottom);
      cr.stroke();
    }

    cr.setFontSize(10);
    this._data.forEach(({ date: name, count: value }, index) => {
      const x = paddingX + sizeX * (index + 1);
      const y = paddingBottom + sizeY * value;
      if (value) {
        // Draw bar
        cr.setSourceRGBA(
          barColor.red,
          barColor.green,
          barColor.blue,
          barColor.alpha,
        );
        cr.rectangle(
          x - barWidth / 2,
          -paddingBottom - 1,
          barWidth,
          -y + paddingBottom + 1,
        );
        cr.fill();

        // Draw value
        cr.setSourceRGBA(
          axisColor.blue,
          axisColor.red,
          axisColor.green,
          axisColor.alpha,
        );
        const text = `${value}`;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const extents = cr.textExtents(text);
        cr.moveTo(x - extents.width / 2, -y - 10);
        cr.showText(text);
      }

      // Draw x values
      cr.setSourceRGBA(
        axisColor.blue,
        axisColor.red,
        axisColor.green,
        axisColor.alpha,
      );
      const rows = name.split("\n");
      rows.forEach((row, i) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const extents = cr.textExtents(row);
        cr.moveTo(x - extents.width / 2, -paddingBottom + 16 * (i + 1));
        cr.showText(row);
      });
    });

    cr.setSourceRGBA(
      axisColor.blue,
      axisColor.red,
      axisColor.green,
      axisColor.alpha,
    );

    // Draw x-axis
    cr.moveTo(paddingX, -paddingBottom);
    cr.lineTo(chartArea.width + paddingX, -paddingBottom);
    cr.stroke();

    //Draw y-axis
    cr.moveTo(paddingX, -paddingBottom);
    cr.lineTo(paddingX, -chartArea.height - paddingBottom);
    cr.stroke();

    cr.$dispose();
  }
}
