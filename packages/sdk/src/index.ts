import { AbstractProviderAdapter, setGlobalAdapter } from '@cowprotocol/common'
import { AppDataApi } from '@cowprotocol/cow-app-data'
export * from '@cowprotocol/cow-app-data'

export interface CowSdkOptions {
  adapter: AbstractProviderAdapter
  chainId: number
  appDataApiBaseUrl?: string
  orderBookApiBaseUrl?: string
}

/**
 * CowSdk is the main entry point for interacting with the CoW Protocol.
 * Provides access to all modules in a single unified interface.
 */
export class CowSdk {
  // public readonly contracts: ContractsTs
  // public readonly orderBook: OrderBookApi
  // public readonly trading: TradingSdk
  public readonly appData: AppDataApi

  /**
   * Creates a new instance of CowSdk
   *
   * @param options Configuration options for the SDK
   */
  constructor(options: CowSdkOptions) {
    const { adapter, chainId, appDataApiBaseUrl, orderBookApiBaseUrl } = options

    // Define the global adapter for use in all modules
    setGlobalAdapter(adapter)

    // // Initialize the main components
    // this.contracts = new ContractsTs(adapter)
    // this.orderBook = new OrderBookApi({
    //   adapter,
    //   chainId,
    //   baseUrl: orderBookApiBaseUrl
    // })
    // this.trading = new TradingSdk({
    //   adapter,
    //   chainId,
    //   orderBookApi: this.orderBook
    // })
    this.appData = new AppDataApi(adapter)
  }

  // /**
  //  * Returns the current chain configured for the SDK
  //  */
  // async getChainId(): Promise<number> {
  //   return this.orderBook.getChainId()
  // }

  // /**
  //  * Returns the current address of the connected user
  //  */
  // async getAddress(): Promise<string> {
  //   return this.contracts.getAddress()
  // }
}
