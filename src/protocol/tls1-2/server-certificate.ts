import { BufferStream } from '../../util';

export type Cert = {
  value: Buffer,
};

export type ServerCertificate = {
  majorVersion: number,
  minorVersion: number,
  certificates: Cert[],
};

const parseCertificates = (stream: BufferStream): Cert[] => {
  const certs = [];
  for (; stream.restLength > 0;) {
    const length = stream.readNumber(3);
    const value = stream.readBytes(length);
    certs.push({ value });
  }
  return certs;
};

export const parseServerCertificate = (data: Buffer): ServerCertificate => {
  const stream = new BufferStream(data);
  stream.skip(1);

  const majorVersion = stream.readNumber(1);
  const minorVersion = stream.readNumber(1);
  stream.skip(2); // length
  const handShakeType = stream.readNumber(1);
  if (handShakeType !== 11) {
    throw new Error(`invalid handshake type:${handShakeType}`);
  }
  stream.skip(3); // certificate list length
  const certificates = parseCertificates(stream);

  return {
    majorVersion,
    minorVersion,
    certificates,
  };
};
