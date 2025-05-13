import { AbstractProviderAdapter, AdapterTypes } from '@cowprotocol/common'
import { Order, OrderKind } from './order'
import { TokenRegistry, Trade } from './settlement'
import { Signature, EcdsaSigningScheme } from './sign'
import { ContractsTs } from './ContractsTs'

/**
 * A Balancer swap used for settling a single order against Balancer pools.
 */
export interface Swap<T extends AdapterTypes> {
  /**
   * The ID of the pool for the swap.
   */
  poolId: T['Bytes']
  /**
   * The swap input token address.
   */
  assetIn: string
  /**
   * The swap output token address.
   */
  assetOut: string
  /**
   * The amount to swap. This will ether be a fixed input amount when swapping
   * a sell order, or a fixed output amount when swapping a buy order.
   */
  amount: T['BigIntish']
  /**
   * Optional additional pool user data required for the swap.
   *
   * This additional user data is pool implementation specific, and allows pools
   * to extend the Vault pool interface.
   */
  userData?: T['Bytes']
}

/**
 * An encoded Balancer swap request that can be used as input to the settlement
 * contract.
 */
export interface BatchSwapStep<T extends AdapterTypes> {
  /**
   * The ID of the pool for the swap.
   */
  poolId: T['Bytes']
  /**
   * The index of the input token.
   *
   * Settlement swap calls encode tokens as an array, this number represents an
   * index into that array.
   */
  assetInIndex: number
  /**
   * The index of the output token.
   */
  assetOutIndex: number
  /**
   * The amount to swap.
   */
  amount: T['BigIntish']
  /**
   * Additional pool user data required for the swap.
   */
  userData: T['Bytes']
}

/**
 * Swap execution parameters.
 */
export interface SwapExecution<T extends AdapterTypes> {
  /**
   * The limit amount for the swap.
   *
   * This allows settlement submission to define a tighter slippage than what
   * was specified by the order in order to reduce MEV opportunity.
   */
  limitAmount: T['BigIntish']
}

/**
 * Encoded swap parameters.
 */
export type EncodedSwap<T extends AdapterTypes> = [
  /** Swap requests. */
  BatchSwapStep<T>[],
  /** Tokens. */
  string[],
  /** Encoded trade. */
  Trade<T>,
]

export class ContractsTs_Swap<T extends AdapterTypes = AdapterTypes> {
  constructor(
    private adapter: AbstractProviderAdapter<T>,
    private contracts: ContractsTs<T>,
  ) {}

  /**
   * Encodes a swap as a {@link BatchSwapStep} to be used with the settlement
   * contract.
   */
  public encodeSwapStep(tokens: TokenRegistry<T>, swap: Swap<T>): BatchSwapStep<T> {
    return {
      poolId: swap.poolId,
      assetInIndex: tokens.index(swap.assetIn),
      assetOutIndex: tokens.index(swap.assetOut),
      amount: swap.amount,
      userData: swap.userData || ('0x' as T['Bytes']),
    }
  }

  /**
   * Static utility method for encoding a direct swap between an order and Balancer
   * pools.
   *
   * @param adapter The provider adapter to use.
   * @param contracts The contracts instance to use.
   * @param swaps The swaps to encode.
   * @param order The order to encode.
   * @param signature The signature for the order.
   * @param swapExecution Optional swap execution parameters.
   * @returns The encoded swap.
   */
  public static encodeSwap<T extends AdapterTypes>(
    adapter: AbstractProviderAdapter<T>,
    contracts: ContractsTs<T>,
    swaps: Swap<T>[],
    order: Order<T>,
    signature: Signature<T>,
    swapExecution?: Partial<SwapExecution<T>>,
  ): EncodedSwap<T> {
    const encoder = new SwapEncoder<T>({} as T['TypedDataDomain'], adapter, contracts)
    encoder.encodeSwapStep(...swaps)
    encoder.encodeTrade(order, signature, swapExecution)
    return encoder.encodedSwap()
  }

  /**
   * Static utility method for encoding a direct swap between an order and Balancer
   * pools, signing the order in the process.
   *
   * @param adapter The provider adapter to use.
   * @param contracts The contracts instance to use.
   * @param domain The domain to use for signing.
   * @param swaps The swaps to encode.
   * @param order The order to encode.
   * @param owner The owner that should sign the order.
   * @param scheme The signing scheme to use.
   * @param swapExecution Optional swap execution parameters.
   * @returns A promise that resolves to the encoded swap.
   */
  public static async encodeSwapWithSigning<T extends AdapterTypes>(
    adapter: AbstractProviderAdapter<T>,
    contracts: ContractsTs<T>,
    domain: T['TypedDataDomain'],
    swaps: Swap<T>[],
    order: Order<T>,
    owner: T['Signer'],
    scheme: EcdsaSigningScheme,
    swapExecution?: Partial<SwapExecution<T>>,
  ): Promise<EncodedSwap<T>> {
    const encoder = new SwapEncoder<T>(domain, adapter, contracts)
    encoder.encodeSwapStep(...swaps)
    await encoder.signEncodeTrade(order, owner, scheme, swapExecution)
    return encoder.encodedSwap()
  }
}

/**
 * A class for building calldata for a swap.
 *
 * The encoder ensures that token addresses are kept track of and performs
 * necessary computation in order to map each token addresses to IDs to
 * properly encode swap requests and the trade.
 */
export class SwapEncoder<T extends AdapterTypes> {
  private readonly _tokens: TokenRegistry<T>
  private readonly _swaps: BatchSwapStep<T>[] = []
  private _trade: Trade<T> | undefined = undefined
  private swap: ContractsTs_Swap<T>

  /**
   * Creates a new settlement encoder instance.
   *
   * @param domain Domain used for signing orders. See {@link signOrder} for
   * more details.
   */
  public constructor(
    public readonly domain: T['TypedDataDomain'],
    private adapter: AbstractProviderAdapter<T>,
    private contracts: ContractsTs<T>,
  ) {
    this._tokens = new TokenRegistry<T>(adapter)
    this.swap = new ContractsTs_Swap<T>(adapter, contracts)
  }

  /**
   * Gets the array of token addresses used by the currently encoded swaps.
   */
  public get tokens(): string[] {
    // NOTE: Make sure to slice the original array, so it cannot be modified
    // outside of this class.
    return this._tokens.addresses
  }

  /**
   * Gets the encoded swaps.
   */
  public get swaps(): BatchSwapStep<T>[] {
    return this._swaps.slice()
  }

  /**
   * Gets the encoded trade.
   */
  public get trade(): Trade<T> {
    if (this._trade === undefined) {
      throw new Error('trade not encoded')
    }
    return this._trade
  }

  /**
   * Encodes the swap as a swap request and appends it to the swaps encoded so
   * far.
   *
   * @param swap The Balancer swap to encode.
   */
  public encodeSwapStep(...swaps: Swap<T>[]): void {
    this._swaps.push(...swaps.map((swap) => this.swap.encodeSwapStep(this._tokens, swap)))
  }

  /**
   * Encodes a trade from a signed order.
   *
   * Additionally, if the order references new tokens that the encoder has not
   * yet seen, they are added to the tokens array.
   *
   * @param order The order of the trade to encode.
   * @param signature The signature for the order data.
   */
  public encodeTrade(order: Order<T>, signature: Signature<T>, swapExecution?: Partial<SwapExecution<T>>): void {
    const { limitAmount } = {
      limitAmount: order.kind == OrderKind.SELL ? order.buyAmount : order.sellAmount,
      ...swapExecution,
    }

    const settlement = this.contracts.createSettlementEncoder(this.domain)
    settlement.encodeTrade(order, signature, {
      executedAmount: limitAmount,
    })

    this._trade = settlement.trades[0]
  }

  /**
   * Signs an order and encodes a trade with that order.
   *
   * @param order The order to sign for the trade.
   * @param owner The externally owned account that should sign the order.
   * @param scheme The signing scheme to use. See {@link SigningScheme} for more
   * details.
   */
  public async signEncodeTrade(
    order: Order<T>,
    owner: T['Signer'],
    scheme: EcdsaSigningScheme,
    swapExecution?: Partial<SwapExecution<T>>,
  ): Promise<void> {
    const signature = await this.contracts.signOrder(this.domain, order, owner, scheme)
    this.encodeTrade(order, signature, swapExecution)
  }

  /**
   * Returns the encoded swap parameters for the current state of the encoder.
   *
   * This method with raise an exception if a trade has not been encoded.
   */
  public encodedSwap(): EncodedSwap<T> {
    return [this.swaps, this.tokens, this.trade]
  }
}
