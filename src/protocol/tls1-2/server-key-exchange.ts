import { BufferStream } from '../../util';
import type { DigitallySigned, HashAlgorithm, SignatureAlgorithm } from './types';

export type ServerDHParams = {
  dhP: Buffer,
  dhG: Buffer,
  dhYs: Buffer,
};

export type ServerKeyExchange = {
  majorVersion: number,
  minorVersion: number,
  params: ServerDHParams,
  signedParams: DigitallySigned
};

export const parseServerServerKeyExchange = (data: Buffer): ServerKeyExchange => {
  const stream = new BufferStream(data);
  stream.skip(1);

  const majorVersion = stream.readNumber(1);
  const minorVersion = stream.readNumber(1);
  stream.skip(2); // length
  const handShakeType = stream.readNumber(1);
  if (handShakeType !== 12) {
    throw new Error(`invalid handshake type:${handShakeType}`);
  }
  stream.skip(3); // server key exchange list length
  const dhP = stream.readBytes(stream.readNumber(2));
  const dhG = stream.readBytes(stream.readNumber(2));
  const dhYs = stream.readBytes(stream.readNumber(2));
  return {
    majorVersion,
    minorVersion,
    params: { dhP, dhG, dhYs },
    signedParams: {
      algorithm: {
        hash: stream.readNumber(1) as HashAlgorithm,
        signature: stream.readNumber(1) as SignatureAlgorithm,
      },
      signature: stream.readBytes(stream.readNumber(2)),
    },
  };
};
