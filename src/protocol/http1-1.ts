// eslint-disable-next-line max-classes-per-file
import { writeFile } from 'fs/promises';
import { Tcp } from './tcp';
import { NewPromiseCapability } from '../util';

const crlf = '\r\n';

const separator = Buffer.from([0x0d, 0x0a, 0x0d, 0x0a]);

export type ResponseHeader = { [k: string]: string };

export class Response {
  private receivingData: Buffer | undefined;

  private isHeaderParsed = false;

  private statusCode: number | null = null;

  private statusText: string | null = null;

  private headers: ResponseHeader | null = null;

  private bodyBuffer: Buffer | undefined;

  public getBodyBuffer(): Buffer | undefined {
    return this.bodyBuffer;
  }

  public getStatusCode(): number | null {
    return this.statusCode;
  }

  public getStatusText(): string | null {
    return this.statusText;
  }

  public getHeaders(): ResponseHeader | null {
    return this.headers;
  }

  public appendData(buffer: Buffer): void {
    if (!this.receivingData) {
      this.receivingData = buffer;
      return;
    }
    this.receivingData = Buffer.concat([this.receivingData, buffer]);
  }

  public parseHeader(): boolean {
    if (this.isHeaderParsed) {
      return false;
    }
    if (!this.receivingData) {
      return false;
    }
    const index = this.receivingData.indexOf(separator);
    if (index < 0) {
      return false;
    }
    this.isHeaderParsed = true;
    const [statusRow, ...headerRows] = this.receivingData.slice(0, index).toString().split(crlf);
    this.statusCode = Number.parseInt(statusRow.slice(9, 12), 10);
    this.statusText = statusRow.slice(13);
    this.headers = headerRows.reduce((prev, row) => {
      const [name, value] = row.split(':', 2);
      return { ...prev, [name.toLowerCase().trim()]: value.trim() };
    }, {});
    return true;
  }

  public getExpectedLength(): number | null {
    if (!this.headers) {
      return null;
    }
    const index = this.receivingData?.indexOf(separator);
    if (index == null || index < 0) {
      return null;
    }
    const length = this.headers['content-length'];
    if (length) {
      return index + Number.parseInt(length, 10) + separator.length;
    }
    return null;
  }

  public isAllReceived(): boolean {
    const length = this.getExpectedLength();
    if (length == null) {
      return false;
    }
    return (this.receivingData?.length ?? 0) >= length;
  }

  public storeBody(): void {
    const index = this.receivingData?.indexOf(separator) ?? 0;
    this.bodyBuffer = this.receivingData?.slice(index + separator.length);
  }

  public async saveToFile(path: string): Promise<boolean> {
    if (!this.bodyBuffer) {
      return false;
    }
    await writeFile(path, new Uint8Array(this.bodyBuffer));
    return true;
  }
}

export type RequestOption = {
  method: 'GET' | 'POST' | 'HEAD' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'TRACE' | 'CONNECT',
  path: string,
  headers: { [k: string]: string }
};

const defaultOptions: RequestOption = {
  method: 'GET',
  path: '/',
  headers: {},
};

export class Request {
  private option: RequestOption;

  constructor(private hostname: string, private port: number, options: Partial<RequestOption>) {
    this.option = { ...defaultOptions, ...options };
  }

  public async execute(): Promise<Response> {
    const response = new Response();
    const { promise, resolve, reject } = NewPromiseCapability<Response>();
    const tcp = new Tcp(this.hostname, this.port, {
      onData: (async (data) => {
        if (typeof data === 'string') {
          reject(new Error('Unexpected error. (string data)'));
          return;
        }
        response.appendData(data);
        response.parseHeader();
        if (response.isAllReceived()) {
          response.storeBody();
          await tcp.end();
          resolve(response);
        }
      }),
      onClose: ((hadError) => {
        if (hadError) {
          reject(new Error('Unexpected error. (onClose error)'));
        }
      }),
    });
    await tcp.connect();
    const body = [
      `${this.option.method} ${this.option.path} HTTP/1.1`,
      `Host:${this.hostname}`,
      ...(Object.entries(this.option.headers).map(([k, v]) => {
        if (v.includes('\n')) {
          throw new Error('Http header must not contain line breaks');
        }
        return `${k}:${v}`;
      })),
      '',
      '',
    ].join(crlf);
    await tcp.write(body);
    return promise;
  }
}
