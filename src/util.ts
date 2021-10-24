export type PromiseCapability<T > = {
  promise: Promise<T>,
  resolve: (value: T) => void,
  reject: (error: Error) => void,
};

export const NewPromiseCapability = <T extends unknown>(): PromiseCapability<T> => {
  const capability: Partial<PromiseCapability<T>> = {};
  capability.promise = new Promise((resolve, reject) => {
    capability.resolve = resolve;
    capability.reject = reject;
  });
  return capability as PromiseCapability<T>;
};

export const NumToBytes = (num: number, minBytes?: number): Uint8Array => {
  let bytes = new Uint8Array();
  for (let rest = num; rest > 0; rest = Math.floor(rest / 256)) {
    bytes = new Uint8Array([rest % 256, ...bytes]);
  }
  if (!minBytes || bytes.length >= minBytes) {
    return bytes;
  }

  return new Uint8Array([...(new Uint8Array(minBytes - bytes.length)), ...bytes]);
};
