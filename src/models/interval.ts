// Copyright 2023 Guillermo Peña
// SPDX-License-Identifier: GPL-3.0-or-later

import { DateModifiers, DateUnit } from "../common/interfaces";

export enum Interval {
  LIFETIME = -1,
  DAILY,
  WEEKLY,
  MONTHLY,
  YEARLY,
}

export function getModifiers(interval: Interval) {
  const modifiers = ["localtime"];
  let increase: [number, DateUnit];
  switch (interval) {
    case Interval.WEEKLY:
      increase = [7, "days"];
      modifiers.push(...["start of day", "weekday 0", "-6 days"]);
      break;
    case Interval.MONTHLY:
      increase = [1, "months"];
      modifiers.push("start of month");
      break;
    case Interval.YEARLY:
      increase = [1, "years"];
      modifiers.push("start of year");
      break;
    default:
      increase = [1, "days"];
      modifiers.push("start of day");
  }

  const start = [...modifiers, "utc"] as DateModifiers[];
  const end = [
    ...modifiers,
    `+${increase[0]} ${increase[1]}`,
    "utc",
  ] as DateModifiers[];

  return {
    increase,
    start,
    end,
  };
}
