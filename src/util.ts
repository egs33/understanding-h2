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
