import { randomBytes } from 'crypto';
import type { Transport } from './transport';
import { Tcp } from './tcp';
import { NumToBytes } from '../util';

// eslint-disable-next-line @typescript-eslint/naming-convention
export type Tls1_2Option = Partial<{
  encoding: BufferEncoding,
  onClose: (hadError: boolean) => void,
  onError: (error: Error) => void,
  onData: (data: Buffer | string) => void,
}>;

// eslint-disable-next-line @typescript-eslint/naming-convention
export class Tls1_2 implements Transport {
  private tcp: Tcp;

  constructor(private hostname: string, port: number, option: Tls1_2Option) {
    this.tcp = new Tcp(hostname, port, {
      onData: (data) => {
        console.log(data);
      },
      onClose: (hadError) => option.onClose?.(hadError),
      onError: (error) => option.onError?.(error),
      ...(option.encoding ? { encoding: option.encoding } : undefined),
    });
  }

  private sendClientHello(): Promise<void> {
    const hostnameLength = this.hostname.length;
    const serverNameExtension: number[] = [
      0, 0, // ExtensionType: server_name
      ...NumToBytes(hostnameLength + 5, 2), // ServerNameList length
      ...NumToBytes(hostnameLength + 3, 2), // ServerName length
      0, // NameType: host_name
      ...NumToBytes(hostnameLength, 2), // HostName length.
      ...(Buffer.from(this.hostname, 'ascii')),
    ];

    const alpnExtension: number[] = [
      0, 16, // ExtensionType: application_layer_protocol_negotiation
      ...NumToBytes('http/1.1'.length + 3, 2), // ProtocolNameList length
      ...NumToBytes('http/1.1'.length + 1, 2), // ProtocolName length
      'http/1.1'.length,
      ...(Buffer.from('http/1.1', 'ascii')),
    ];

    const signatureAlgorithmsExtension: number[] = [
      0, 13, // ExtensionType: signature_algorithms
      ...NumToBytes(8, 2), // SignatureAndHashAlgorithmList length
      ...NumToBytes(6, 2), // SignatureAndHashAlgorithm length
      4, // HashAlgorithm: sha256
      1, // SignatureAlgorithm rsa
      5, // HashAlgorithm: sha384
      1, // SignatureAlgorithm rsa
      4, // HashAlgorithm: sha256
      3, // SignatureAlgorithm ecdsa
    ];

    const date = new Date();
    const payload: number[] = [
      22, // ContentType: handshake
      3, 3, // ProtocolVersion: TLS1.2
      0, 0, // length (temporary)
      1, // HandshakeType: client_hello
      0, 0, 0, // length (temporary)
      3, 3, // ProtocolVersion: TLS1.2
      ...NumToBytes(Math.floor(date.getTime() / 1000), 4),
      ...randomBytes(28),
      0, // SessionID length 0bytes
      ...NumToBytes(2, 2), // CipherSuite length
      0x00, 0x9e, // CipherSuite: TLS_DHE_RSA_WITH_AES_128_GCM_SHA256 (0x009e)
      1, //  CompressionMethod length: 1
      0, // CompressionMethod: null
      ...NumToBytes(
        serverNameExtension.length
          + alpnExtension.length
          + signatureAlgorithmsExtension.length, 2,
      ), // Extension length
      ...serverNameExtension, // Extension
      ...alpnExtension,
      ...signatureAlgorithmsExtension,
    ];
    const payloadLength = NumToBytes(payload.length - 5, 2);
    const handShakeLength = NumToBytes(payload.length - 9, 3);
    const payload2 = [
      ...payload.slice(0, 3),
      ...payloadLength,
      ...payload.slice(5, 6),
      ...handShakeLength,
      ...payload.slice(9),
    ];
    return this.tcp.write(new Uint8Array(payload2));
  }

  public async connect(): Promise<void> {
    await this.tcp.connect();
    console.log('connected!');
    await this.sendClientHello();
    console.log('send!!!');
  }

  /* eslint-disable */
  public end(): Promise<void> {
    return Promise.resolve(undefined);
  }

  public write(
    data: string | Buffer | Uint8Array,
    encoding: BufferEncoding | undefined,
  ): Promise<void> {
    return Promise.resolve();
  }
  /* eslint-enable */
}
