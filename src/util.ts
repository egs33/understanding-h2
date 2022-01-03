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

export const NumToBytes = (num: number, bytes: number): Buffer => {
  const buf = Buffer.allocUnsafe(bytes);
  buf.writeUIntBE(num, 0, bytes);
  return buf;
};

export const BytesToNum = (buf: Buffer): number => buf.readUIntBE(0, buf.length);

export class BufferStream {
  private index = 0;

  constructor(private readonly buffer: Buffer) {}

  public readBytes(bytes: number): Buffer {
    const buf = this.buffer.slice(this.index, this.index + bytes);
    this.index += bytes;
    return buf;
  }

  public readNumber(bytes: number): number {
    return BytesToNum(this.readBytes(bytes));
  }

  public skip(bytes: number): void {
    this.index += bytes;
  }

  get restLength(): number {
    return this.buffer.length - this.index;
  }
}
