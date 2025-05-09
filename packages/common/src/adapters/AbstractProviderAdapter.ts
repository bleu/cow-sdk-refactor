import type { AdapterTypes } from './types'

/**
 * AbstractProviderAdapter defines the common interface that all provider-specific
 * implementations must follow. This ensures consistent interaction with different
 * Ethereum libraries throughout the SDK.
 */
export abstract class AbstractProviderAdapter<T extends AdapterTypes = AdapterTypes> {
  protected _type?: T

  // Core functionality
  abstract getChainId(): Promise<number>
  abstract getAddress(): Promise<string>

  // Transaction handling
  abstract sendTransaction(txParams: TransactionParams): Promise<TransactionResponse>
  abstract estimateGas(txParams: TransactionParams): Promise<bigint>

  // Signing operations
  abstract signMessage(message: string | Uint8Array): Promise<string>
  abstract signTypedData(domain: unknown, types: unknown, value: unknown): Promise<string>

  // Data retrieval
  abstract call(txParams: TransactionParams): Promise<string>
  abstract getCode(address: string): Promise<string>
  abstract getBalance(address: string): Promise<bigint>
  abstract getTransactionCount(address: string): Promise<number>

  // Contract interaction
  abstract getContract(address: string, abi: unknown): unknown

  // Utils
  abstract getCreate2Address(from: string, salt: T['Bytes'], initCodeHash: T['Bytes']): string
  abstract hexConcat(items: ReadonlyArray<T['Bytes']>): string
  abstract formatBytes32String(text: string): string
  abstract keccak256(data: T['Bytes']): string
  abstract encodeDeploy(encodeDeployArgs: unknown, abi: T['Abi']): string
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
