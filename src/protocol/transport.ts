export interface Transport {
  connect: () => Promise<void>;
  write: (
    data: string | Buffer | Uint8Array,
    encoding?: BufferEncoding | undefined,
  ) => Promise<void>;

  end: () => Promise<void>;
}
