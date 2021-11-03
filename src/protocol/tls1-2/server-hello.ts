import { BufferStream, BytesToNum } from '../../util';

export type HelloExtension = {
  type: number,
  value: Buffer,
};

export type ServerHello = {
  majorVersion: number,
  minorVersion: number,
  random: Buffer,
  sessionIdLength: number,
  sessionId: Buffer,
  cipherSuite: number,
  compressionMethod: number,
  extensions: HelloExtension[],
};

const parseExtension = (buf: Buffer): HelloExtension[] => {
  const extensions = [];
  for (let rest = buf; rest.length > 0;) {
    const type = BytesToNum(rest.slice(0, 2));
    const length = BytesToNum(rest.slice(2, 4));
    const value = rest.slice(4, 4 + length);
    extensions.push({ type, value });
    rest = rest.slice(4 + length);
  }
  return extensions;
};

export const parseServerHello = (data: Buffer): ServerHello => {
  const stream = new BufferStream(data);
  stream.skip(1);

  const majorVersion = stream.readNumber(1);
  const minorVersion = stream.readNumber(1);
  stream.skip(2); // length
  const handShakeType = stream.readNumber(1);
  if (handShakeType !== 2) {
    throw new Error(`invalid handshake type:${handShakeType}`);
  }
  stream.skip(5); // length, majorVersion, minorVersion
  const random = stream.readBytes(32);
  const sessionIdLength = stream.readNumber(1);
  const sessionId = stream.readBytes(sessionIdLength);
  const cipherSuite = stream.readNumber(2);
  const compressionMethod = stream.readNumber(1);

  const extensionLength = stream.readNumber(2);

  const extensionsBuffer = stream.readBytes(extensionLength);
  const extensions = parseExtension(extensionsBuffer);

  return {
    majorVersion,
    minorVersion,
    random,
    sessionIdLength,
    sessionId,
    cipherSuite,
    compressionMethod,
    extensions,
  };
};
