import { Abi, BytesLike } from './types'

/**
 * AbstractProviderAdapter defines the common interface that all provider-specific
 * implementations must follow. This ensures consistent interaction with different
 * Ethereum libraries throughout the SDK.
 */
export interface AbstractProviderAdapter {
  // Core functionality
  getChainId(): Promise<number>
  getAddress(): Promise<string>

  // Transaction handling
  sendTransaction(txParams: TransactionParams): Promise<TransactionResponse>
  estimateGas(txParams: TransactionParams): Promise<bigint>

  // Signing operations
  signMessage(message: string | Uint8Array): Promise<string>
  signTypedData(domain: unknown, types: unknown, value: unknown): Promise<string>

  // Data retrieval
  call(txParams: TransactionParams): Promise<string>
  getCode(address: string): Promise<string>
  getBalance(address: string): Promise<bigint>
  getTransactionCount(address: string): Promise<number>

  // Contract interaction
  getContract(address: string, abi: unknown): unknown

  // Utils
  getCreate2Address(from: string, salt: BytesLike, initCodeHash: BytesLike): string
  hexConcat(items: ReadonlyArray<BytesLike>): string
  formatBytes32String(text: string): string
  keccak256(data: BytesLike): string
  encodeDeploy(encodeDeployArgs: unknown, abi: Abi): string
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
