// Copyright 2023 Guillermo Peña
// SPDX-License-Identifier: GPL-3.0-or-later

import Gio from "gi://Gio";
import GObject from "gi://GObject";

export function createAction(
  name: string,
  callback?: () => void,
  bindEnabled?: { obj: GObject.Object; property: string; flags?: number },
) {
  const action = Gio.SimpleAction.new(name, null);
  if (callback) action.connect("activate", callback);
  if (bindEnabled) {
    const { obj, property, flags } = bindEnabled;
    obj.bind_property(
      property,
      action,
      "enabled",
      flags ?? GObject.BindingFlags.DEFAULT,
    );
  }
  return action;
}
