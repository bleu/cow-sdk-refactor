import { BigNumberish, BytesLike, ethers, TypedDataDomain, TypedDataField } from 'ethers'
import { AdapterUtils } from '@cowprotocol/common'

type Abi = ConstructorParameters<typeof ethers.utils.Interface>[0]

export class EthersV5Utils implements AdapterUtils {
  toUtf8Bytes(text: string): Uint8Array {
    return ethers.utils.toUtf8Bytes(text)
  }

  createInterface(abi: Abi): ethers.utils.Interface {
    return new ethers.utils.Interface(abi)
  }

  getCreate2Address(from: string, salt: BytesLike, initCodeHash: BytesLike): string {
    return ethers.utils.getCreate2Address(from, salt, initCodeHash)
  }

  hexConcat(items: ReadonlyArray<BytesLike>): string {
    return ethers.utils.hexConcat(items)
  }

  formatBytes32String(text: string): string {
    return ethers.utils.formatBytes32String(text)
  }

  encodeDeploy(encodeDeployArgs: unknown[], abi: Abi) {
    const contractInterface = new ethers.utils.Interface(abi)
    return contractInterface.encodeDeploy(encodeDeployArgs)
  }

  keccak256(data: BytesLike) {
    return ethers.utils.keccak256(data)
  }

  hexZeroPad(value: BytesLike, length: number): string {
    return ethers.utils.hexZeroPad(value, length)
  }

  arrayify(hexString: string): Uint8Array {
    return ethers.utils.arrayify(hexString)
  }

  hexlify(value: BytesLike): string {
    return ethers.utils.hexlify(value)
  }

  // eslint-disable-next-line
  solidityPack(types: string[], values: unknown[]): string {
    return ethers.utils.solidityPack(types, values)
  }

  hashTypedData(
    domain: TypedDataDomain,
    types: Record<string, TypedDataField[]>,
    data: Record<string, unknown>,
  ): string {
    return ethers.utils._TypedDataEncoder.hash(domain, types, data)
  }

  getChecksumAddress(address: string): string {
    return ethers.utils.getAddress(address)
  }

  encodeAbi(types: string[], values: unknown[]): BytesLike {
    return ethers.utils.defaultAbiCoder.encode(types, values)
  }

  decodeAbi(types: string[], data: BytesLike) {
    return ethers.utils.defaultAbiCoder.decode(types, data)
  }

  id(text: string): BytesLike {
    return ethers.utils.id(text)
  }

  toBigIntish(value: BytesLike | string | number): BigNumberish {
    return ethers.BigNumber.from(value)
  }

  newBigintish(value: number | string): BigNumberish {
    return ethers.BigNumber.from(value)
  }

  hexDataSlice(data: BytesLike, offset: number, endOffset?: number): BytesLike {
    return ethers.utils.hexDataSlice(data, offset, endOffset)
  }

  joinSignature(signature: { r: string; s: string; v: number }): string {
    return ethers.utils.joinSignature(signature)
  }

  splitSignature(signature: BytesLike): { r: string; s: string; v: number } {
    const split = ethers.utils.splitSignature(signature)
    return {
      r: split.r,
      s: split.s,
      v: split.v,
    }
  }

  verifyMessage(message: string | Uint8Array, signature: BytesLike): string {
    return ethers.utils.verifyMessage(message, signature)
  }

  verifyTypedData(
    domain: TypedDataDomain,
    types: Record<string, Array<{ name: string; type: string }>>,
    value: Record<string, unknown>,
    signature: BytesLike,
  ): string {
    return ethers.utils.verifyTypedData(domain, types, value, signature)
  }

  encodeFunction(
    abi: Array<{ name: string; inputs: Array<{ type: string }> }>,
    functionName: string,
    args: unknown[],
  ): BytesLike {
    const iface = new ethers.utils.Interface(abi)
    return iface.encodeFunctionData(functionName, args)
  }

  toNumber(value: BigNumberish): number {
    return ethers.BigNumber.from(value).toNumber()
  }

  solidityKeccak256(types: string[], values: unknown[]): unknown {
    return ethers.utils.solidityKeccak256(types, values)
  }
}
