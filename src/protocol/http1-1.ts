// eslint-disable-next-line max-classes-per-file
import { Tcp } from './tcp';

const crlf = '\r\n';

const separator = Buffer.from([0x0d, 0x0a, 0x0d, 0x0a]);

export type ResponseHeader = { [k: string]: string };

export class Response {
  private receivingData: Buffer | undefined;

  private isHeaderParsed = false;

  private headers: ResponseHeader | null = null;

  private bodyBuffer: Buffer | undefined;

  public getBodyBuffer(): Buffer | undefined {
    return this.bodyBuffer;
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
    const headerStr = this.receivingData.slice(0, index).toString();
    this.headers = headerStr.split(crlf).slice(1).reduce((prev, row) => {
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
}

export type RequestOption = {
  method: 'GET' | 'POST' | 'HEAD' | 'PUT' | 'DELETE' | 'OPTION' | 'TRACE',
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
    // eslint-disable-next-line @typescript-eslint/no-misused-promises,no-async-promise-executor
    return new Promise(async (resolve, reject) => {
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
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
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
      await tcp.write(`${this.option.method} ${this.option.path} HTTP/1.1${crlf}Host:${this.hostname}${crlf}${crlf}`);
    });
  }
}
