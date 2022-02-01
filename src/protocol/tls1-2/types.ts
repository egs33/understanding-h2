/**
 * none(0), md5(1), sha1(2), sha224(3), sha256(4), sha384(5), sha512(6)
 */
export type HashAlgorithm = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * anonymous(0), rsa(1), dsa(2), ecdsa(3)
 */
export type SignatureAlgorithm = 0 | 1 | 2 | 3;

export type SignatureAndHashAlgorithm = {
  hash: HashAlgorithm,
  signature: SignatureAlgorithm
};

export type DigitallySigned = {
  algorithm: SignatureAndHashAlgorithm
  signature: Buffer
};
