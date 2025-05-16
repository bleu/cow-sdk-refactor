import { setGlobalAdapter } from '@cowprotocol/common'
import { AppDataApi } from '@cowprotocol/cow-app-data'
import { OrderBookApi } from '@cowprotocol/cow-order-book'
import { ApiBaseUrls, SupportedChainId } from '@cowprotocol/config'
import { ApiContext } from '@cowprotocol/config'
import { CowSdkOptions } from './types'

// Re-export components for convenience
export * from '@cowprotocol/cow-app-data'
export * from '@cowprotocol/cow-order-book'

/**
 * CowSdk is the main entry point for interacting with the CoW Protocol.
 * Provides access to all modules in a single unified interface.
 */
export class CowSdk {
  public readonly orderBook: OrderBookApi
  public readonly appData: AppDataApi
  private readonly chainId: SupportedChainId

  /**
   * Creates a new instance of CowSdk
   *
   * @param options Configuration options for the SDK
   */
  constructor(options: CowSdkOptions) {
    const { adapter, chainId, env = 'prod', orderBookOptions = {}, orderBookBaseUrl } = options

    this.chainId = chainId

    // Define the global adapter for use in all modules
    setGlobalAdapter(adapter)

    // Create API context for the OrderBook
    const apiContext: ApiContext = {
      chainId,
      env,
      ...orderBookOptions,
    }

    // If a custom base URL is provided, add it to the context
    if (orderBookBaseUrl) {
      apiContext.baseUrls = {
        ...(apiContext.baseUrls || {}),
        [chainId]: orderBookBaseUrl,
      } as ApiBaseUrls
    }

    // Initialize the main components
    this.orderBook = new OrderBookApi(apiContext)
    this.appData = new AppDataApi(adapter)
  }
}
