import { ethers } from 'ethers'
import { AppDataUtils } from '@cowprotocol/common'

export class EthersV5AppDataUtils implements AppDataUtils {
  keccak256(data: string | Uint8Array): string {
    return ethers.utils.keccak256(data)
  }

  toUtf8Bytes(text: string): Uint8Array {
    return ethers.utils.toUtf8Bytes(text)
  }

  arrayify(hexStringOrBigNumberish: string | number | bigint): Uint8Array {
    return ethers.utils.arrayify(hexStringOrBigNumberish.toString())
  }
}
