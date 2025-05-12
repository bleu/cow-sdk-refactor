import { getBytes, keccak256 as _keccak256, toUtf8Bytes } from 'ethers'
import { AppDataUtils } from '@cowprotocol/common'

export class EthersV6AppDataUtils implements AppDataUtils {
  keccak256(data: string | Uint8Array): string {
    return _keccak256(data)
  }

  toUtf8Bytes(text: string): Uint8Array {
    return toUtf8Bytes(text)
  }

  arrayify(hexStringOrBigNumberish: string | number | bigint): Uint8Array {
    return getBytes(hexStringOrBigNumberish.toString())
  }
}
