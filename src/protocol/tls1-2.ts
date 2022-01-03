import { randomBytes } from 'crypto';
import type { Transport } from './transport';
import { Tcp } from './tcp';
import { BytesToNum, NumToBytes } from '../util';
import { parseServerHello } from './tls1-2/server-hello';
import type { Cert } from './tls1-2/server-certificate';
import { parseServerCertificate } from './tls1-2/server-certificate';

// eslint-disable-next-line @typescript-eslint/naming-convention
export type Tls1_2Option = Partial<{
  encoding: BufferEncoding,
  onClose: (hadError: boolean) => void,
  onError: (error: Error) => void,
  onData: (data: Buffer | string) => void,
}>;

export type ConnectionState = {
  connectionEnd: 'client',
  prfAlgorithm: 'tls_prf_sha256',
  bulkEncryptionAlgorithm: null | 'rc4' | '3des' | 'aes',
  macAlgorithm: null | 'hmac_md5' | 'hmac_sha1' | 'hmac_sha256' | 'hmac_sha384' | 'hmac_sha512',
  compressionAlgorithm: null,
  masterSecret: null | Buffer,
  clientRandom: null | Buffer,
  serverRandom: null | Buffer,
};

const initialState: ConnectionState = {
  connectionEnd: 'client',
  prfAlgorithm: 'tls_prf_sha256',
  bulkEncryptionAlgorithm: null,
  macAlgorithm: null,
  compressionAlgorithm: null,
  masterSecret: null,
  clientRandom: null,
  serverRandom: null,
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export class Tls1_2 implements Transport {
  private tcp: Tcp;

  private readonly connectionState: ConnectionState = initialState;

  private cipherSuite: null | number = null;

  private certs: null | Cert[] = null;

  constructor(private hostname: string, port: number, option: Tls1_2Option) {
    this.tcp = new Tcp(hostname, port, {
      onData: (data) => {
        // TODO: consider fragmentation
        console.log(data);
        if (typeof data === 'string') {
          throw new Error('onData: string is unexpected');
        }
        this.parsePacket(data);
      },
      onClose: (hadError) => option.onClose?.(hadError),
      onError: (error) => option.onError?.(error),
      ...(option.encoding ? { encoding: option.encoding } : undefined),
    });
  }

  // eslint-disable-next-line class-methods-use-this
  private parsePacket(data: Buffer): void {
    const length = BytesToNum(data.slice(3, 5)) + 5;
    const record = data.slice(0, length);
    switch (record[0]) { // ContentType
      case 22: { // handshake
        switch (record[5]) { // handShakeType
          case 2: { // Server Hello
            const serverHello = parseServerHello(record);
            this.connectionState.serverRandom = serverHello.random;
            this.cipherSuite = serverHello.cipherSuite;
            break;
          }
          case 11: { // Server Certificate
            const serverCertificate = parseServerCertificate(record);
            // verify certificate
            this.certs = serverCertificate.certificates;
            break;
          }
          default:
            console.error('unsupported handshake type', record[5]);
        }
        break;
      }
      default:
        console.error('unsupported content type', record[0]);
    }

    const rest = data.slice(length);
    if (rest.length > 0) {
      this.parsePacket(rest);
    }
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
    const clientRandom: number[] = [
      ...NumToBytes(Math.floor(date.getTime() / 1000), 4),
      ...randomBytes(28),
    ];
    this.connectionState.clientRandom = Buffer.from(clientRandom);
    const payload: number[] = [
      22, // ContentType: handshake
      3, 3, // ProtocolVersion: TLS1.2
      0, 0, // length (temporary)
      1, // HandshakeType: client_hello
      0, 0, 0, // length (temporary)
      3, 3, // ProtocolVersion: TLS1.2
      ...clientRandom,
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
