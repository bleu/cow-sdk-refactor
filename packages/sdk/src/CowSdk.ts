import { setGlobalAdapter } from '@cowprotocol/sdk-common'
import { AppDataApi } from '@cowprotocol/sdk-app-data'
import { OrderBookApi } from '@cowprotocol/sdk-order-book'
import { ApiBaseUrls, SupportedChainId } from '@cowprotocol/sdk-config'
import { ApiContext } from '@cowprotocol/sdk-config'
import { CowSdkOptions } from './types'
import { SubgraphApi } from '@cowprotocol/sdk-subgraph'

// Re-export components for convenience
export * from '@cowprotocol/sdk-app-data'
export * from '@cowprotocol/sdk-order-book'
export * from '@cowprotocol/sdk-subgraph'

/**
 * CowSdk is the main entry point for interacting with the CoW Protocol.
 * Provides access to all modules in a single unified interface.
 */
export class CowSdk {
  public readonly orderBook: OrderBookApi
  public readonly appData: AppDataApi
  public readonly subgraph: SubgraphApi

  private readonly chainId: SupportedChainId

  /**
   * Creates a new instance of CowSdk
   *
   * @param options Configuration options for the SDK
   */
  constructor(options: CowSdkOptions) {
    const { adapter, chainId, env = 'prod', orderBookOptions = {}, orderBookBaseUrl, subgraphBaseUrl } = options

    this.chainId = chainId

    // Define the global adapter for use in all modules
    setGlobalAdapter(adapter)

    // Create API context for the OrderBook
    const orderBookContext: ApiContext = {
      chainId,
      env,
      ...orderBookOptions,
    }

    // If a custom base URL is provided for OrderBook, add it to the context
    if (orderBookBaseUrl) {
      orderBookContext.baseUrls = {
        ...(orderBookContext.baseUrls || {}),
        [chainId]: orderBookBaseUrl,
      } as ApiBaseUrls
    }

    // Create API context for the Subgraph
    const subgraphContext = {
      chainId,
      env,
      ...(subgraphBaseUrl && {
        baseUrls: Object.values(SupportedChainId).reduce(
          (acc, chainId) => ({
            ...acc,
            [chainId]: chainId === this.chainId ? subgraphBaseUrl : null,
          }),
          {},
        ) as Record<SupportedChainId, string | null>,
      }),
    }

    // Initialize the main components
    this.orderBook = new OrderBookApi(orderBookContext)
    this.appData = new AppDataApi(adapter)
    this.subgraph = new SubgraphApi(subgraphContext)
  }
}
