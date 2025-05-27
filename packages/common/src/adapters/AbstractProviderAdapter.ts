import { AbstractSigner } from './AbstractSigner'
import type { AdapterTypes, AdapterUtils } from './types'

/**
 * AbstractProviderAdapter defines the common interface that all provider-specific
 * implementations must follow. This ensures consistent interaction with different
 * Ethereum libraries throughout the SDK.
 */
export abstract class AbstractProviderAdapter<T extends AdapterTypes = AdapterTypes> {
  protected _type?: T

  public ZERO_ADDRESS!: T['Address']

  // eslint-disable-next-line
  public abstract Signer: new (signer: any) => AbstractSigner
  public abstract TypedDataVersionedSigner: new (signer: any, version: any) => AbstractSigner
  public abstract TypedDataV3Signer: new (signer: any) => AbstractSigner
  public abstract IntChainIdTypedDataV4Signer: new (signer: any) => AbstractSigner
  public abstract utils: AdapterUtils

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

  // Data retrieval
  abstract call(txParams: TransactionParams): Promise<string>
  abstract getCode(address: string): Promise<string>
  abstract getBalance(address: string): Promise<bigint>
  abstract getTransactionCount(address: string): Promise<number>

  // Contract interaction
  abstract getContract(address: string, abi: T['Abi']): unknown

  abstract getStorageAt(address: T['Address'], slot: unknown): Promise<unknown>
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
