export interface AppDataUtils {
  /**
   * Computes the keccak256 hash of the input data
   */
  keccak256(data: string | Uint8Array): string;
  
  /**
   * Converts a string to UTF-8 bytes
   */
  toUtf8Bytes(text: string): Uint8Array;
  
  /**
   * Converts a hex string or number to a byte array
   */
  arrayify(hexStringOrBigNumberish: string | number | bigint): Uint8Array;
}