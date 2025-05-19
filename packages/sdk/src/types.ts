import { AbstractProviderAdapter } from '@cowprotocol/common'
import { CowEnv, PartialApiContext, SupportedChainId } from '@cowprotocol/config'

/**
 * Optional configuration options for the CowSdk
 */
/**
 * Optional configuration options for the CowSdk
 *  * @property {AbstractProviderAdapter} adapter The provider adapter to use for blockchain interactions
 * @property {SupportedChainId} chainId The chain ID to connect to
 * @property {CowEnv} env The environment to use (prod or staging)
 * @property {PartialApiContext} orderBookOptions Additional options for the OrderBook API
 * @property {string} orderBookBaseUrl Optional custom base URL for the OrderBook API
 * @property {string} subgraphBaseUrl Optional custom base URL for the Subgraph API
 */
export interface CowSdkOptions {
  /**
   * The chain ID to use for the SDK
   */
  chainId: SupportedChainId
  /**
   * The adapter to use for signing transactions
   */
  adapter: AbstractProviderAdapter
  /**
   * The environment to use (prod or staging)
   * @default 'prod'
   */
  env?: CowEnv
  /**
   * Additional options for the OrderBook API
   */
  orderBookOptions?: PartialApiContext
  /**
   * Custom base URL for the OrderBook API
   */
  orderBookBaseUrl?: string
  /**
   * Custom base URL for the Subgraph API
   */
  subgraphBaseUrl?: string
}
