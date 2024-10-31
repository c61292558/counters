declare function _(id: string): string;
declare function print(args: string): void;
declare function log(obj: object, others?: object[]): void;
declare function log(msg: string, subsitutions?: any[]): void;
declare function logError(e: any): void;

declare const pkg: {
  version: string;
  name: string;
};

declare module console {
  export function error(obj: object, others?: object[]): void;
  export function error(msg: string, subsitutions?: any[]): void;
}

declare interface String {
  format(...replacements: string[]): string;
  format(...replacements: number[]): string;
}
declare interface Number {
  toFixed(digits: number): number;
}

declare function setTimeout(
  handler: any,
  timeout: number,
  ...args: any[]
): number;

declare function clearTimeout(id: number): void;

declare function setInterval(
  handler: any,
  timeout: number,
  ...args: any[]
): number;

declare function clearInterval(id: number): void;

interface TextDecoderOptions {
  fatal?: boolean;
  ignoreBOM?: boolean;
}

declare class TextDecoder {
  constructor(encoding?: string, options?: TextDecoderOptions);
  decode(input?: ArrayBufferView, options?: TextDecodeOptions): string;
}

interface TextEncodeOptions {
  stream?: boolean;
}

declare class TextEncoder {
  constructor();
  encode(input?: string, options?: TextEncodeOptions): Uint8Array;
}
