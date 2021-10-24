import type { Socket } from 'net';
import { createConnection } from 'net';
import type { Transport } from './transport';

export type TcpOption = Partial<{
  encoding: BufferEncoding,
  onClose: (hadError: boolean) => void,
  onError: (error: Error) => void,
  onData: (data: Buffer | string) => void,
}>;

export class Tcp implements Transport {
  private socket: Socket | null;

  constructor(private hostname: string, private port: number, private option: TcpOption) {
    this.socket = null;
  }

  public connect(): Promise<void> {
    return new Promise(((resolve) => {
      this.socket = createConnection(this.port, this.hostname, resolve);
      if (this.option.encoding) {
        this.socket.setEncoding(this.option.encoding);
      }
      if (this.option.onClose) {
        this.socket.on('close', this.option.onClose);
      }
      if (this.option.onError) {
        this.socket.on('error', this.option.onError);
      }
      if (this.option.onData) {
        this.socket.on('data', this.option.onData);
      }
    }));
  }

  private checkWritable(): void {
    if (!this.socket) {
      throw new Error('Not connected');
    }
    if (!this.socket.writable) {
      throw new Error('Not writable');
    }
  }

  public write(
    data: string | Buffer | Uint8Array,
    encoding: BufferEncoding | undefined = undefined,
  ): Promise<void> {
    this.checkWritable();
    return new Promise((resolve) => {
      this.socket?.write(data, encoding, (error) => {
        if (error) {
          throw error;
        }
        resolve();
      });
    });
  }

  public end(): Promise<void> {
    this.checkWritable();
    return new Promise((resolve) => this.socket?.end(resolve));
  }
}
