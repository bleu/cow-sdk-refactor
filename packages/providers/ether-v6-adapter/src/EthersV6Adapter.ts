import {
  Provider,
  Signer,
  Contract,
  VoidSigner,
  JsonRpcSigner,
  Wallet,
  Interface,
  TypedDataField,
  AbiCoder,
  getCreate2Address,
  concat,
  BytesLike,
  encodeBytes32String,
  toUtf8Bytes,
  keccak256,
  BigNumberish,
  ZeroAddress,
  zeroPadValue,
  getBytes,
  hexlify as ethersHexlify,
  solidityPacked,
  TypedDataEncoder,
  id,
  toBigInt,
  dataSlice,
  Signature,
  SignatureLike,
  verifyTypedData,
  verifyMessage,
  InterfaceAbi,
} from 'ethers'
import {
  AbstractProviderAdapter,
  TransactionParams,
  TransactionResponse,
  TransactionReceipt,
  AdapterTypes,
} from '@cowprotocol/common'
import { TypedDataDomain } from 'ethers'
import { DeploymentArguments } from '@cowprotocol/contracts-ts'
import { getAddress, solidityKeccak256 } from 'ethers/lib/utils'

type Abi = ConstructorParameters<typeof Interface>[0]

interface EthersV6Types extends AdapterTypes {
  Abi: Abi
  Address: string
  Bytes: BytesLike
  BigIntish: BigNumberish
  ContractInterface: Interface
  Provider: Provider
  Signer: Signer
  TypedDataDomain: TypedDataDomain
  TypedDataTypes: Record<string, TypedDataField[]>
}
import { EthersV6Utils } from './EthersV6Utils'

export class EthersV6Adapter extends AbstractProviderAdapter<EthersV6Types> {
  declare protected _type?: EthersV6Types

  private provider: Provider
  private signer: Signer
  public utils: EthersV6Utils

  constructor(providerOrSigner: Provider | Signer) {
    super()
    this.ZERO_ADDRESS = ZeroAddress
    if (
      providerOrSigner instanceof JsonRpcSigner ||
      providerOrSigner instanceof VoidSigner ||
      providerOrSigner instanceof Wallet
    ) {
      this.signer = providerOrSigner
      this.provider = this.signer.provider as Provider //Possible null - check later
      if (!this.provider) {
        throw new Error('Signer must be connected to a provider')
      }
    } else {
      this.provider = providerOrSigner as Provider
      this.signer = new VoidSigner('0x0000000000000000000000000000000000000000', this.provider)
    }

    this.utils = new EthersV6Utils()
  }

  async getChainId(): Promise<number> {
    const network = await this.provider.getNetwork()
    return Number(network.chainId)
  }

  async getAddress(): Promise<string> {
    return this.signer.getAddress()
  }

  async sendTransaction(txParams: TransactionParams): Promise<TransactionResponse> {
    const tx = await this.signer.sendTransaction({
      to: txParams.to,
      from: txParams.from,
      data: txParams.data,
      value: txParams.value ? txParams.value.toString() : undefined,
      gasLimit: txParams.gasLimit ? txParams.gasLimit.toString() : undefined,
      gasPrice: txParams.gasPrice ? txParams.gasPrice.toString() : undefined,
      maxFeePerGas: txParams.maxFeePerGas ? txParams.maxFeePerGas.toString() : undefined,
      maxPriorityFeePerGas: txParams.maxPriorityFeePerGas ? txParams.maxPriorityFeePerGas.toString() : undefined,
      nonce: txParams.nonce,
    })

    return {
      hash: tx.hash,
      wait: async (confirmations = 1): Promise<TransactionReceipt> => {
        const receipt = await tx.wait(confirmations)
        if (!receipt) {
          throw new Error('Transaction receipt not available')
        }
        return {
          transactionHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          blockHash: receipt.blockHash,
          status: receipt.status ?? undefined,
          gasUsed: receipt.gasUsed,
          logs: [...receipt.logs],
        }
      },
    }
  }

  async estimateGas(txParams: TransactionParams): Promise<bigint> {
    return this.provider.estimateGas({
      to: txParams.to,
      from: txParams.from,
      data: txParams.data,
      value: txParams.value ? txParams.value.toString() : undefined,
    })
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    return this.signer.signMessage(message)
  }

  async signTypedData(
    domain: TypedDataDomain,
    types: Record<string, TypedDataField[]>,
    value: Record<string, unknown>,
  ): Promise<string> {
    return this.signer.signTypedData(domain, types, value)
  }

  async call(txParams: TransactionParams): Promise<string> {
    return this.provider.call({
      to: txParams.to,
      from: txParams.from,
      data: txParams.data,
      value: txParams.value ? txParams.value.toString() : undefined,
    })
  }

  async getCode(address: string): Promise<string> {
    return this.provider.getCode(address)
  }

  async getBalance(address: string): Promise<bigint> {
    return this.provider.getBalance(address)
  }

  async getTransactionCount(address: string): Promise<number> {
    return this.provider.getTransactionCount(address)
  }

  getContract(address: string, abi: Abi): Contract {
    return new Contract(address, abi, this.signer)
  }

  encodeDeploy<C>(encodeDeployArgs: DeploymentArguments<C>, abi: Abi): string {
    const abiCoder = new AbiCoder()
    const contractInterface = new Interface(abi)

    // Get the constructor fragment
    const constructorFragment = contractInterface.getFunction('constructor')

    if (!constructorFragment) {
      // No constructor parameters, return empty string
      return '0x'
    }

    // Encode the constructor parameters
    return abiCoder.encode(constructorFragment.inputs, encodeDeployArgs as readonly unknown[])
  }

  getCreate2Address(from: string, salt: BytesLike, initCodeHash: BytesLike): string {
    // Convert BytesLike to ethers BytesLike if necessary
    const ethersSalt = this.toEthersBytesLike(salt)
    const ethersInitCodeHash = this.toEthersBytesLike(initCodeHash)

    // Use ethers getCreate2Address
    return getCreate2Address(from, ethersSalt, ethersInitCodeHash)
  }

  hexConcat(items: ReadonlyArray<BytesLike>): string {
    // Convert each BytesLike to ethers BytesLike
    const ethersItems = items.map((item) => this.toEthersBytesLike(item))

    // Use ethers concat
    return concat(ethersItems)
  }

  formatBytes32String(text: string): string {
    return encodeBytes32String(text)
  }

  keccak256(data: BytesLike): string {
    return keccak256(this.toEthersBytesLike(data))
  }

  // Helper method to convert our BytesLike to ethers BytesLike
  private toEthersBytesLike(data: BytesLike): BytesLike {
    if (typeof data === 'string') {
      if (data.startsWith('0x')) {
        return data
      }
      // Convert string to bytes
      return toUtf8Bytes(data)
    } else if (data instanceof Uint8Array) {
      return data
    } else {
      throw new Error('Unsupported data type for conversion to BytesLike')
    }
  }

  hexZeroPad(value: BytesLike, length: number): string {
    return zeroPadValue(value, length)
  }

  arrayify(hexString: string): Uint8Array {
    return getBytes(hexString)
  }

  hexlify(value: Uint8Array): string {
    return ethersHexlify(value)
  }

  //eslint-disable-next-line
  solidityPack(types: string[], values: any[]): string {
    return solidityPacked(types, values)
  }

  hashTypedData(
    domain: TypedDataDomain,
    types: Record<string, TypedDataField[]>,
    data: Record<string, unknown>,
  ): string {
    return TypedDataEncoder.hash(domain, types, data)
  }

  getChecksumAddress(address: string): string {
    return getAddress(address)
  }

  encodeAbi(types: string[], values: unknown[]): BytesLike {
    return AbiCoder.defaultAbiCoder().encode(types, values)
  }

  decodeAbi(types: string[], data: BytesLike): unknown[] {
    return AbiCoder.defaultAbiCoder().decode(types, data)
  }

  id(text: string): BytesLike {
    return id(text)
  }

  toBigIntish(value: string | number | BigNumberish): BigNumberish {
    return toBigInt(value)
  }

  newBigintish(value: number | string): BigNumberish {
    return toBigInt(value)
  }

  async getStorageAt(address: string, slot: BigNumberish): Promise<BytesLike> {
    return this.provider.getStorage(address, slot)
  }

  hexDataSlice(data: BytesLike, offset: number, endOffset?: number): BytesLike {
    return dataSlice(data, offset, endOffset)
  }

  joinSignature(signature: { r: string; s: string; v: number }): string {
    return Signature.from({
      r: signature.r,
      s: signature.s,
      v: signature.v,
    }).serialized
  }

  splitSignature(signature: BytesLike): { r: string; s: string; v: number } {
    const sig = Signature.from(signature as SignatureLike)
    return {
      r: sig.r,
      s: sig.s,
      v: sig.v,
    }
  }

  verifyMessage(message: string | Uint8Array, signature: SignatureLike): string {
    return verifyMessage(message, signature)
  }

  verifyTypedData(
    domain: TypedDataDomain,
    types: Record<string, Array<{ name: string; type: string }>>,
    value: Record<string, unknown>,
    signature: SignatureLike,
  ): string {
    return verifyTypedData(domain, types, value, signature)
  }

  encodeFunction(
    abi: Array<{ name: string; inputs: Array<{ type: string }> }>,
    functionName: string,
    args: unknown[],
  ): BytesLike {
    const iface = new Interface(abi)
    return iface.encodeFunctionData(functionName, args)
  }

  toNumber(value: BigNumberish): number {
    return Number(value.toString())
  }
  solidityKeccak256(types: string[], values: unknown[]): unknown {
    return solidityKeccak256(types, values)
  }

  createInterface(abi: InterfaceAbi): Interface {
    return new Interface(abi)
  }
}
