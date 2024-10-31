// Copyright 2023 Guillermo Peña
// SPDX-License-Identifier: GPL-3.0-or-later

import GLib from "gi://GLib";
import GObject from "gi://GObject";

import type {
  GObjectOptions,
  GParamSpecDict,
  GPropertyBoolean,
  GPropertyNumber,
  GPropertyObject,
  GPropertyOptions,
  GPropertyString,
  GPropertyType,
} from "../common/interfaces.js";

const GObjectOptionsSym = Symbol.for("GObjectOptions");

function ensureGObjectProperties(klass: typeof GObject.Object): {
  Properties: GParamSpecDict;
  InternalChildren: string[];
} {
  if (typeof klass[GObjectOptionsSym] !== "object") {
    klass[GObjectOptionsSym] = {
      Properties: {},
      InternalChildren: [],
    };
  }
  return klass[GObjectOptionsSym] as {
    Properties: GParamSpecDict;
    InternalChildren: string[];
  };
}

export function GObjectClass(args?: GObjectOptions) {
  return function (klass: typeof GObject.Object) {
    const { Properties, InternalChildren } = ensureGObjectProperties(klass);
    GObject.registerClass(
      {
        ...args,
        InternalChildren,
        Properties,
      },
      klass,
    );
    delete klass[GObjectOptionsSym];
  };
}

export function GtkChild(target: GObject.Object, name: string) {
  const props = ensureGObjectProperties(
    target.constructor as typeof GObject.Object,
  );
  props.InternalChildren.push(name.substring(1));
}

export function GObjectProperty(type: "int", options?: GPropertyNumber);
export function GObjectProperty(type: "float", options?: GPropertyNumber);
export function GObjectProperty(type: "string", options?: GPropertyString);
export function GObjectProperty(type: "boolean", options?: GPropertyBoolean);
export function GObjectProperty(type: "object", options: GPropertyObject);
export function GObjectProperty(
  type: GPropertyType,
  options: GPropertyOptions = {},
) {
  return function (
    target: GObject.Object,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const {
      name = propertyKey.replace(
        /[A-Z]/g,
        (substring: string) => `-${substring.toLocaleLowerCase()}`,
      ),
      nick = propertyKey,
      blurb = propertyKey,
      flags = GObject.ParamFlags.READWRITE,
    } = options;
    let paramSpec: GObject.ParamSpec<unknown>;
    switch (type) {
      case "int": {
        const {
          minimum = 0,
          maximum = GLib.MAXINT16,
          defaultValue = 0,
        } = options as GPropertyNumber;
        paramSpec = GObject.ParamSpec.int(
          name,
          nick,
          blurb,
          flags,
          minimum,
          maximum,
          defaultValue,
        );
        break;
      }
      case "float": {
        const {
          minimum = 0,
          maximum = GLib.MAXINT16,
          defaultValue = 0,
        } = options as GPropertyNumber;
        paramSpec = GObject.ParamSpec.float(
          name,
          nick,
          blurb,
          flags,
          minimum,
          maximum,
          defaultValue,
        );
        break;
      }
      case "string": {
        const { defaultValue = "" } = options as GPropertyString;
        paramSpec = GObject.ParamSpec.string(
          name,
          nick,
          blurb,
          flags,
          defaultValue,
        );
        break;
      }
      case "boolean": {
        const { defaultValue = false } = options as GPropertyBoolean;
        paramSpec = GObject.ParamSpec.boolean(
          name,
          nick,
          blurb,
          flags,
          defaultValue,
        );
        break;
      }
      case "object": {
        const { objectType } = options as GPropertyObject;
        paramSpec = GObject.ParamSpec.object(
          name,
          nick,
          blurb,
          flags,
          objectType,
        );
        break;
      }
    }

    const props = ensureGObjectProperties(
      target.constructor as typeof GObject.Object,
    );
    props.Properties[propertyKey] = paramSpec;

    // eslint-disable-next-line @typescript-eslint/unbound-method
    const setter = descriptor.set;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const getter = descriptor.get;
    descriptor.set = function (value: unknown) {
      if (setter) {
        if (getter?.call(this) !== value) {
          setter.call(this, value);
          (this as GObject.Object).notify(name);
        }
      }
    };
  };
}
