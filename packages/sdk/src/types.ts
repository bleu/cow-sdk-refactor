import { AbstractProviderAdapter } from '@cowprotocol/common'
import { CowEnv, PartialApiContext, SupportedChainId } from '@cowprotocol/config'

/**
 * Required configuration options for the CowSdk
 * @property {AbstractProviderAdapter} adapter The provider adapter to use for blockchain interactions
 * @property {SupportedChainId} chainId The chain ID to connect to
 */
export interface CowSdkRequiredOptions {
  adapter: AbstractProviderAdapter
  chainId: SupportedChainId
}

/**
 * Optional configuration options for the CowSdk
 */
/**
 * Optional configuration options for the CowSdk
 * @property {CowEnv} env The environment to use (prod or staging)
 * @property {PartialApiContext} orderBookOptions Additional options for the OrderBook API
 * @property {string} orderBookBaseUrl Optional custom base URL for the OrderBook API
 */
export interface CowSdkOptionalOptions {
  env?: CowEnv
  orderBookOptions?: PartialApiContext
  orderBookBaseUrl?: string
}

/**
 * Configuration options for the CowSdk
 */
export type CowSdkOptions = CowSdkRequiredOptions & CowSdkOptionalOptions
