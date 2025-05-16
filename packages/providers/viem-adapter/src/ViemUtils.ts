import { toBytes, stringToBytes, keccak256 as _keccak256 } from 'viem'
import { AdapterUtils } from '@cowprotocol/sdk-common'

export class ViemUtils implements AdapterUtils {
  keccak256(data: string | Uint8Array): string {
    const bytes = typeof data === 'string' ? stringToBytes(data) : data
    return _keccak256(bytes)
  }

  toUtf8Bytes(text: string): Uint8Array {
    return stringToBytes(text)
  }

  arrayify(hexStringOrBigNumberish: string | number | bigint): Uint8Array {
    return toBytes(hexStringOrBigNumberish.toString())
  }
}
