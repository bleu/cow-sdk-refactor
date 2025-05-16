import type { AdapterTypes } from './types'

import { AdapterUtils } from './types'

/**
 * AbstractProviderAdapter defines the common interface that all provider-specific
 * implementations must follow. This ensures consistent interaction with different
 * Ethereum libraries throughout the SDK.
 */
export abstract class AbstractProviderAdapter<T extends AdapterTypes = AdapterTypes> {
  protected _type?: T

  public ZERO_ADDRESS!: T['Address']

  public utils: AdapterUtils

  // Core functionality
  abstract getChainId(): Promise<number>
  abstract getAddress(): Promise<string>

  // Transaction handling
  abstract sendTransaction(txParams: TransactionParams): Promise<TransactionResponse>
  abstract estimateGas(txParams: TransactionParams): Promise<bigint>

  // Signing operations
  abstract signMessage(message: string | Uint8Array): Promise<string>
  abstract signTypedData(
    domain: T['TypedDataDomain'],
    types: T['TypedDataTypes'],
    value: Record<string, unknown>,
  ): Promise<string>
  abstract verifyMessage(message: unknown, signature: unknown): string | Promise<string>
  abstract verifyTypedData(
    domain: T['TypedDataDomain'],
    types: Record<string, Array<{ name: string; type: string }>>,
    value: Record<string, unknown>,
    signature: unknown,
  ): string | Promise<string>

  // Data retrieval
  abstract call(txParams: TransactionParams): Promise<string>
  abstract getCode(address: string): Promise<string>
  abstract getBalance(address: string): Promise<bigint>
  abstract getTransactionCount(address: string): Promise<number>

  // Contract interaction
  abstract getContract(address: string, abi: T['Abi']): unknown
  abstract encodeFunction(
    abi: Array<{ name: string; inputs: Array<{ type: string }> }>,
    functionName: string,
    args: unknown[],
  ): T['Bytes']

  // Utils
  abstract getCreate2Address(from: string, salt: T['Bytes'], initCodeHash: T['Bytes']): string
  abstract hexConcat(items: ReadonlyArray<T['Bytes']>): string
  abstract formatBytes32String(text: string): string
  abstract keccak256(data: T['Bytes']): string
  abstract encodeDeploy(encodeDeployArgs: unknown, abi: T['Abi']): string
  abstract hexZeroPad(value: T['Bytes'], length: number): string
  abstract arrayify(hexString: T['Bytes']): Uint8Array
  abstract hexlify(value: T['Bytes']): string
  abstract solidityPack(types: string[], values: unknown[]): string
  abstract hashTypedData(
    domain: T['TypedDataDomain'],
    types: T['TypedDataTypes'],
    data: Record<string, unknown>,
  ): string
  abstract getChecksumAddress(address: T['Address']): T['Address']
  abstract encodeAbi(types: unknown[], values: unknown[]): T['Bytes']
  abstract decodeAbi(types: unknown[], data: T['Bytes']): unknown
  abstract id(text: string): T['Bytes']
  abstract toBigIntish(value: string | number | T['BigIntish']): T['BigIntish']
  abstract newBigintish(value: number | string): T['BigIntish']
  abstract getStorageAt(address: T['Address'], slot: unknown): Promise<unknown>
  abstract hexDataSlice(data: T['Bytes'], offset: number, endOffset?: number): T['Bytes']
  abstract joinSignature(signature: { r: string; s: string; v: number }): string
  abstract splitSignature(signature: T['Bytes']): { r: string; s: string; v: number }
  abstract solidityKeccak256(types: unknown[], values: unknown[]): unknown
  abstract createInterface(abi: unknown): T['ContractInterface']
}

/**
 * Standard transaction parameters that work across different Ethereum libraries
 */
export interface TransactionParams {
  to: string
  from?: string
  data?: string
  value?: string | bigint
  gasLimit?: string | bigint
  gasPrice?: string | bigint
  maxFeePerGas?: string | bigint
  maxPriorityFeePerGas?: string | bigint
  nonce?: number
}

/**
 * Standardized transaction response
 */
export interface TransactionResponse {
  hash: string
  wait(confirmations?: number): Promise<TransactionReceipt>
}

/**
 * Standardized transaction receipt
 */
export interface TransactionReceipt {
  transactionHash: string
  blockNumber: number
  blockHash: string
  status?: number
  gasUsed: bigint
  logs: Array<unknown>
}
