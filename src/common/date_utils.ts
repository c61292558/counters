// Copyright 2023 Guillermo Peña
// SPDX-License-Identifier: GPL-3.0-or-later

import GLib from "gi://GLib";

import { Interval } from "../models/interval.js";

export function getDateRange(interval: Interval): [number, number] | undefined {
  const now = GLib.DateTime.new_now_local();
  const [y, m, d] = now.get_ymd();

  let start: GLib.DateTime;
  let end: GLib.DateTime;
  switch (interval) {
    case Interval.DAILY: {
      start = GLib.DateTime.new_local(y, m, d, 0, 0, 0);
      end = GLib.DateTime.new_local(y, m, d, 23, 59, 59);
      break;
    }
    case Interval.WEEKLY: {
      const date = GLib.Date.new_dmy(d, m, y);
      date.subtract_days(now.get_day_of_week() - 1);
      start = GLib.DateTime.new_local(
        date.get_year(),
        date.get_month(),
        date.get_day(),
        0,
        0,
        0,
      );
      date.add_days(6);
      end = GLib.DateTime.new_local(
        date.get_year(),
        date.get_month(),
        date.get_day(),
        23,
        59,
        59,
      );
      break;
    }
    case Interval.MONTHLY:
      start = GLib.DateTime.new_local(y, m, 1, 0, 0, 0);
      end = GLib.DateTime.new_local(
        y,
        m,
        GLib.Date.get_days_in_month(m, y),
        23,
        59,
        59,
      );
      break;
    case Interval.YEARLY:
      start = GLib.DateTime.new_local(y, 1, 1, 0, 0, 0);
      end = GLib.DateTime.new_local(y, 12, 31, 23, 59, 59);
      break;
    default:
      return;
  }
  return [start.to_unix(), end.to_unix()];
}

export function getUnixTimeForNow() {
  return GLib.DateTime.new_now_local().to_unix();
}

export function isoDate() {
  return GLib.DateTime.new_now_local().format("%Y%m%dT%H%M%S") as string;
}

export function distanceToNow(timestamp: number) {
  const now = GLib.DateTime.new_now_local();
  const date = GLib.DateTime.new_from_unix_local(timestamp);

  const minutes = Math.floor(now.difference(date) / 60_000_000);

  if (!minutes) {
    return _("less than a minute ago");
  }

  const scale = {
    years: 525_960,
    months: 43_830,
    weeks: 10_080,
    days: 1_440,
    hours: 60,
  };

  let value = minutes;
  let unit = "minutes";
  for (const [k, v] of Object.entries(scale)) {
    const _value = Math.floor(minutes / v);
    if (_value) {
      unit = k;
      value = _value;
      break;
    }
  }

  return new Intl.RelativeTimeFormat().format(
    -value,
    unit as Intl.RelativeTimeFormatUnit,
  );
}
