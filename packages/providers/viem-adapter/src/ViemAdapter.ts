import {
  createPublicClient,
  createWalletClient,
  http,
  PublicClient,
  WalletClient,
  Account,
  Transport,
  Chain,
  getContract as getViemContract,
  encodeDeployData,
  Abi,
  getCreate2Address,
  Hex,
  Address,
  concat,
  stringToBytes,
  keccak256,
  TypedDataDomain,
  GetContractReturnType,
  zeroAddress,
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

import {
  AbstractProviderAdapter,
  TransactionParams,
  TransactionResponse,
  TransactionReceipt,
  AdapterTypes,
} from '@cowprotocol/common'

interface ViemTypes extends AdapterTypes {
  Abi: Abi
  Address: Address
  Bytes: `0x${string}`
  BigIntish: bigint
  ContractInterface: unknown
  Provider: PublicClient
  Signer: WalletClient
  TypedDataDomain: TypedDataDomain
  TypedDataTypes: Record<string, unknown>
}

export class ViemAdapter extends AbstractProviderAdapter<ViemTypes> {
  declare protected _type?: ViemTypes
  private publicClient: PublicClient
  private walletClient: WalletClient
  private account?: Account

  constructor(chain: Chain, transport: Transport = http(), account?: Account | `0x${string}`) {
    super()
    this.ZERO_ADDRESS = zeroAddress
    this.publicClient = createPublicClient({
      chain,
      transport,
    })

    this.walletClient = createWalletClient({
      chain,
      transport,
    })

    if (account) {
      this.account = typeof account === 'string' ? ({ address: account } as Account) : account
    }
  }

  async getChainId(): Promise<number> {
    return this.publicClient.chain?.id ?? 0 //TODO - verify if this is correct
  }

  async getAddress(): Promise<string> {
    if (!this.account) {
      throw new Error('No account provided')
    }
    return this.account.address
  }

  async sendTransaction(txParams: TransactionParams): Promise<TransactionResponse> {
    if (!this.account) {
      throw new Error('No account provided')
    }

    const hash = await this.walletClient.sendTransaction({
      account: this.account,
      chain: this.publicClient.chain,
      to: txParams.to as `0x${string}`,
      data: txParams.data as `0x${string}` | undefined,
      value: txParams.value ? BigInt(txParams.value.toString()) : undefined,
      gas: txParams.gasLimit ? BigInt(txParams.gasLimit.toString()) : undefined,
      maxFeePerGas: txParams.maxFeePerGas ? BigInt(txParams.maxFeePerGas.toString()) : undefined,
      maxPriorityFeePerGas: txParams.maxPriorityFeePerGas
        ? BigInt(txParams.maxPriorityFeePerGas.toString())
        : undefined,
      nonce: txParams.nonce,
    })

    return {
      hash,
      wait: async (confirmations?: number | undefined): Promise<TransactionReceipt> => {
        const receipt = await this.publicClient.waitForTransactionReceipt({
          hash,
          confirmations: confirmations ?? 1,
        })

        return {
          transactionHash: receipt.transactionHash,
          blockNumber: Number(receipt.blockNumber),
          blockHash: receipt.blockHash,
          status: receipt.status === 'success' ? 1 : 0,
          gasUsed: Number(receipt.gasUsed),
          logs: receipt.logs,
          contractAddress: receipt.contractAddress,
          cumulativeGasUsed: Number(receipt.cumulativeGasUsed),
          effectiveGasPrice: Number(receipt.effectiveGasPrice),
          from: receipt.from,
          to: receipt.to,
          type: receipt.type,
          transactionIndex: receipt.transactionIndex,
          logsBloom: receipt.logsBloom,
        } as unknown as TransactionReceipt //TODO - review this
      },
    }
  }

  async estimateGas(txParams: TransactionParams): Promise<bigint> {
    return this.publicClient.estimateGas({
      account: this.account,
      to: txParams.to as `0x${string}`,
      data: txParams.data as `0x${string}` | undefined,
      value: txParams.value ? BigInt(txParams.value.toString()) : undefined,
    })
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    if (!this.account) {
      throw new Error('No account provided')
    }

    const messageToSign = typeof message === 'string' ? message : new TextDecoder().decode(message)

    return this.walletClient.signMessage({
      account: this.account,
      message: messageToSign,
    })
  }

  async signTypedData(
    domain: TypedDataDomain,
    types: Record<string, unknown>,
    value: Record<string, unknown>,
  ): Promise<string> {
    if (!this.account) {
      throw new Error('No account provided')
    }

    const primaryType = Object.keys(types)[0]
    if (!primaryType) {
      throw new Error('No primary type found in types')
    }

    return this.walletClient.signTypedData({
      account: this.account,
      domain,
      types,
      primaryType,
      message: value,
    })
  }

  async call(txParams: TransactionParams): Promise<string> {
    const result = await this.publicClient.call({
      account: this.account?.address,
      to: txParams.to as `0x${string}`,
      data: txParams.data as `0x${string}` | undefined,
      value: txParams.value ? BigInt(txParams.value.toString()) : undefined,
    })
    return result.toString()
  }

  async getCode(address: string): Promise<string> {
    const code = await this.publicClient.getCode({
      address: address as `0x${string}`,
    })
    return code ?? '0x' //TODO - review this
  }

  async getBalance(address: string): Promise<bigint> {
    return this.publicClient.getBalance({
      address: address as `0x${string}`,
    })
  }

  async getTransactionCount(address: string): Promise<number> {
    const count = await this.publicClient.getTransactionCount({
      address: address as `0x${string}`,
    })
    return Number(count)
  }

  getContract(address: string, abi: Abi): GetContractReturnType {
    return getViemContract({
      address: address as `0x${string}`,
      abi,
      client: this.publicClient,
    })
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

  async getStorageAt(address: Address, slot: `0x${string}`) {
    return this.publicClient.getStorageAt({
      address,
      slot,
    })
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
}
