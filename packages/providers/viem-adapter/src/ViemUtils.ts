import { AdapterUtils } from '@cowprotocol/sdk-common'
import {
  encodeDeployData,
  Abi,
  getCreate2Address,
  Hex,
  Address,
  concat,
  stringToBytes,
  keccak256,
  TypedDataDomain,
  padHex,
  hexToBytes,
  encodePacked,
  hashTypedData,
  getAddress,
  encodeAbiParameters,
  decodeAbiParameters,
  stringToHex,
  hexToBigInt,
  slice,
  parseAbi,
  encodeFunctionData,
  recoverMessageAddress,
  recoverTypedDataAddress,
} from 'viem'

export class ViemUtils implements AdapterUtils {
  toUtf8Bytes(text: string): Uint8Array {
    return stringToBytes(text)
  }

  encodeDeploy(bytecode: `0x${string}`, abi: Abi): string {
    return encodeDeployData({
      abi,
      bytecode,
    })
  }

  getCreate2Address(from: Address, salt: Hex, bytecode: Hex): `0x${string}` {
    return getCreate2Address({
      from,
      salt,
      bytecode,
    })
  }

  hexConcat(items: ReadonlyArray<Hex>): string {
    return concat(items)
  }

  formatBytes32String(text: string): string {
    const bytes = stringToBytes(text)
    const paddedBytes = this.padBytes(bytes, 32)
    return paddedBytes
  }

  keccak256(data: Hex): string {
    return keccak256(data)
  }

  private bytesToHex(bytes: Uint8Array): Hex {
    return `0x${Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')}` as Hex
  }

  private padBytes(bytes: Uint8Array, length: number): Hex {
    const result = new Uint8Array(length)
    result.set(bytes.slice(0, length))
    return this.bytesToHex(result)
  }

  hexZeroPad(value: Hex, length: number): string {
    return padHex(value, { size: length })
  }

  arrayify(hexString: string): Uint8Array {
    return hexToBytes(hexString as Hex)
  }

  hexlify(value: `0x${string}`): string {
    return value
  }

  solidityPack(types: string[], values: unknown[]): string {
    return encodePacked(types, values)
  }

  hashTypedData(domain: TypedDataDomain, types: Record<string, unknown>, data: Record<string, unknown>): string {
    const primaryType = Object.keys(types)[0]
    if (!primaryType) {
      throw new Error('No primary type found in types')
    }

    return hashTypedData({
      domain,
      types: types as Record<string, unknown>,
      primaryType,
      message: data,
    })
  }

  getChecksumAddress(address: Address): Address {
    return getAddress(address)
  }

  encodeAbi(types: { type: string; name: string }[], values: unknown[]): `0x${string}` {
    return encodeAbiParameters(types, values)
  }

  decodeAbi(types: string[], data: `0x${string}`): unknown[] {
    return decodeAbiParameters(
      types.map((type, i) => ({ type, name: `arg${i}` })),
      data,
    )
  }

  id(text: string): `0x${string}` {
    return keccak256(stringToHex(text))
  }

  toBigIntish(value: `0x${string}` | string | number): bigint {
    if (typeof value === 'number') return BigInt(value)
    if (typeof value === 'string') {
      if (value.startsWith('0x')) return hexToBigInt(value as `0x${string}`)
      return BigInt(value)
    }
    return hexToBigInt(value)
  }

  newBigintish(value: number | string): bigint {
    return BigInt(value)
  }

  hexDataSlice(data: `0x${string}`, offset: number, endOffset?: number): `0x${string}` {
    return slice(data, offset, endOffset) as `0x${string}`
  }

  joinSignature(signature: { r: string; s: string; v: number }): string {
    // Convert r, s, v to Viem's signature format
    const r = signature.r as `0x${string}`
    const s = signature.s as `0x${string}`
    const v = signature.v

    // Join the signature components
    return concat([r, s, v === 27 ? '0x1b' : '0x1c']) as string
  }

  splitSignature(signature: `0x${string}`): { r: string; s: string; v: number } {
    // Ensure the signature is at least 65 bytes (r + s + v)
    if (signature.length < 132) {
      throw new Error('Invalid signature length')
    }

    // Split the signature into r, s, v components
    const r = slice(signature, 0, 32) as `0x${string}`
    const s = slice(signature, 32, 64) as `0x${string}`

    // The v value is the last byte
    const vByte = slice(signature, 64, 65) as `0x${string}`
    const vInt = Number(hexToBigInt(vByte))

    // Normalize v to 27 or 28
    const v = vInt < 27 ? vInt + 27 : vInt

    return { r, s, v }
  }
  async verifyMessage(message: string | Uint8Array, signature: `0x${string}`): Promise<string> {
    const messageString = typeof message === 'string' ? message : new TextDecoder().decode(message)

    return recoverMessageAddress({
      message: messageString,
      signature,
    })
  }

  async verifyTypedData(
    domain: TypedDataDomain,
    types: Record<string, Array<{ name: string; type: string }>>,
    value: Record<string, unknown>,
    signature: `0x${string}`,
  ) {
    const primaryType = Object.keys(types)[0]
    if (!primaryType) {
      throw new Error('No primary type found in types')
    }

    return recoverTypedDataAddress({
      domain,
      types,
      primaryType,
      message: value,
      signature,
    })
  }

  encodeFunction(
    abi: Array<{ name: string; inputs: Array<{ type: string }> }>,
    functionName: string,
    args: unknown[],
  ): `0x${string}` {
    // Convert simple ABI to viem parseAbi format
    const abiString = abi.map((fn) => {
      const inputsStr = fn.inputs.map((input) => input.type).join(',')
      return `function ${fn.name}(${inputsStr})`
    })

    const parsedAbi = parseAbi(abiString)
    return encodeFunctionData({
      abi: parsedAbi,
      functionName,
      args,
    })
  }

  toNumber(value: bigint): number {
    return Number(value)
  }

  solidityKeccak256(types: unknown[], values: unknown[]) {
    const encoded = encodePacked(types, values)

    // Hash the encoded data
    return keccak256(encoded)
  }

  createInterface(abi: string[]) {
    return parseAbi(abi)
  }
}
