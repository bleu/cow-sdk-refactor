import { AbstractProviderAdapter, AdapterTypes } from '@cowprotocol/common'
import { ContractsTs } from './ContractsTs'

/**
 * The stage an interaction should be executed in.
 */
export enum InteractionStage {
  /**
   * A pre-settlement intraction.
   *
   * The interaction will be executed before any trading occurs. This can be
   * used, for example, to perform as EIP-2612 `permit` call for a user trading
   * in the current settlement.
   */
  PRE = 0,
  /**
   * An intra-settlement interaction.
   *
   * The interaction will be executed after all trade sell amounts are
   * transferred into the settlement contract, but before the buy amounts are
   * transferred out to the traders. This can be used, for example, to interact
   * with on-chain AMMs.
   */
  INTRA = 1,
  /**
   * A post-settlement interaction.
   *
   * The interaction will be executed after all trading has completed.
   */
  POST = 2,
}

/**
 * Gnosis Protocol v2 trade flags.
 */
export interface TradeFlags<T extends AdapterTypes> extends OrderFlags<T> {
  /**
   * The signing scheme used to encode the signature.
   */
  signingScheme: SigningScheme
}

/**
 * Trade parameters used in a settlement.
 */
export type Trade<T extends AdapterTypes> = TradeExecution &
  Omit<
    NormalizedOrder<T>,
    'sellToken' | 'buyToken' | 'kind' | 'partiallyFillable' | 'sellTokenBalance' | 'buyTokenBalance'
  > & {
    /**
     * The index of the sell token in the settlement.
     */
    sellTokenIndex: T['BigIntish']
    /**
     * The index of the buy token in the settlement.
     */
    buyTokenIndex: T['BigIntish']
    /**
     * Encoded order flags.
     */
    flags: T['BigIntish']
    /**
     * Signature data.
     */
    signature: T['Bytes']
  }

/**
 * Details representing how an order was executed.
 */
export interface TradeExecution {
  /**
   * The executed trade amount.
   *
   * How this amount is used by the settlement contract depends on the order
   * flags:
   * - Partially fillable sell orders: the amount of sell tokens to trade.
   * - Partially fillable buy orders: the amount of buy tokens to trade.
   * - Fill-or-kill orders: this value is ignored.
   */
  executedAmount: unknown
}

/**
 * Order refund data.
 *
 * Note: after the London hardfork (specifically the introduction of EIP-3529)
 * order refunds have become meaningless as the refunded amount is less than the
 * gas cost of triggering the refund. The logic surrounding this feature is kept
 * in order to keep full test coverage and in case the value of a refund will be
 * increased again in the future. However, order refunds should not be used in
 * an actual settlement.
 */
export interface OrderRefunds<T extends AdapterTypes> {
  /** Refund storage used for order filled amount */
  filledAmounts: T['Bytes'][]
  /** Refund storage used for order pre-signature */
  preSignatures: T['Bytes'][]
}

/**
 * Table mapping token addresses to their respective clearing prices.
 */
export type Prices<T extends AdapterTypes> = Record<string, T['BigIntish'] | undefined>

/**
 * Encoded settlement parameters.
 */
export type EncodedSettlement<T extends AdapterTypes> = [
  /** Tokens. */
  string[],
  /** Clearing prices. */
  T['BigIntish'][],
  /** Encoded trades. */
  Trade<T>[],
  /** Encoded interactions. */
  [
    Interaction<T['BigIntish'], T['Bytes']>[],
    Interaction<T['BigIntish'], T['Bytes']>[],
    Interaction<T['BigIntish'], T['Bytes']>[],
  ],
]

// Use the types directly from order module to avoid circular dependencies
import { Order, OrderFlags, OrderKind, OrderBalance, NormalizedOrder, ORDER_TYPE_FIELDS } from './order'
import { Interaction, InteractionLike } from './interaction'
import { SigningScheme, Signature, EcdsaSigningScheme } from './sign'

/**
 * An object listing all flag options in order along with their bit offset.
 */
export const FLAG_MASKS = {
  kind: {
    offset: 0,
    options: [OrderKind.SELL, OrderKind.BUY],
  },
  partiallyFillable: {
    offset: 1,
    options: [false, true],
  },
  sellTokenBalance: {
    offset: 2,
    options: [
      OrderBalance.ERC20,
      undefined, // unused
      OrderBalance.EXTERNAL,
      OrderBalance.INTERNAL,
    ],
  },
  buyTokenBalance: {
    offset: 4,
    options: [OrderBalance.ERC20, OrderBalance.INTERNAL],
  },
  signingScheme: {
    offset: 5,
    options: [SigningScheme.EIP712, SigningScheme.ETHSIGN, SigningScheme.EIP1271, SigningScheme.PRESIGN],
  },
} as const

export type FlagKey = keyof typeof FLAG_MASKS
export type FlagOptions<K extends FlagKey> = (typeof FLAG_MASKS)[K]['options']
export type FlagValue<K extends FlagKey> = Exclude<FlagOptions<K>[number], undefined>

// Import ORDER_UID_LENGTH from order module
import { ORDER_UID_LENGTH } from './order'

export class ContractsTs_Settlement<T extends AdapterTypes = AdapterTypes> {
  private readonly FLAG_MASKS = FLAG_MASKS

  constructor(
    private adapter: AbstractProviderAdapter<T>,
    private contracts: ContractsTs<T>,
  ) {
    this.adapter = adapter
    this.contracts = contracts
  }

  /**
   * Encodes a flag value at the specified position.
   */
  private encodeFlag<K extends FlagKey>(key: K, flag: FlagValue<K>): number {
    const index = FLAG_MASKS[key].options.findIndex((search: unknown) => search === flag)
    if (index === -1) {
      throw new Error(`Bad key/value pair to encode: ${key}/${flag}`)
    }
    return index << FLAG_MASKS[key].offset
  }

  /**
   * Counts the smallest mask needed to store the input options in the masked bitfield.
   */
  private mask(options: readonly unknown[]): number {
    const num = options.length
    const bitCount = 32 - Math.clz32(num - 1)
    return (1 << bitCount) - 1
  }

  /**
   * Decodes a flag value from a bitfield.
   */
  private decodeFlag<K extends FlagKey>(key: K, flag: T['BigIntish']): FlagValue<K> {
    const { offset, options } = FLAG_MASKS[key]
    const numberFlags = Number(String(flag))
    const index = (numberFlags >> offset) & this.mask(options)
    // This type casting should not be needed
    const decoded = options[index] as FlagValue<K>
    if (decoded === undefined || index < 0) {
      throw new Error(`Invalid input flag for ${key}: 0b${numberFlags.toString(2)}`)
    }
    return decoded
  }

  /**
   * Encodes signing scheme as a bitfield.
   *
   * @param scheme The signing scheme to encode.
   * @return The bitfield result.
   */
  public encodeSigningScheme(scheme: SigningScheme): number {
    return this.encodeFlag('signingScheme', scheme)
  }

  /**
   * Decodes signing scheme from a bitfield.
   *
   * @param flag The encoded order flag.
   * @return The decoded signing scheme.
   */
  public decodeSigningScheme(flags: T['BigIntish']): SigningScheme {
    return this.decodeFlag('signingScheme', flags)
  }

  /**
   * Encodes order flags as a bitfield.
   *
   * @param flags The order flags to encode.
   * @return The bitfield result.
   */
  public encodeOrderFlags(flags: OrderFlags<T>): number {
    return (
      this.encodeFlag('kind', flags.kind) |
      this.encodeFlag('partiallyFillable', flags.partiallyFillable) |
      this.encodeFlag('sellTokenBalance', flags.sellTokenBalance ?? OrderBalance.ERC20) |
      this.encodeFlag('buyTokenBalance', this.contracts.normalizeBuyTokenBalance(flags.buyTokenBalance))
    )
  }

  /**
   * Decode order flags from a bitfield.
   *
   * @param flags The order flags encoded as a bitfield.
   * @return The decoded order flags.
   */
  public decodeOrderFlags(flags: T['BigIntish']): OrderFlags<T> {
    return {
      kind: this.decodeFlag('kind', flags),
      partiallyFillable: this.decodeFlag('partiallyFillable', flags),
      sellTokenBalance: this.decodeFlag('sellTokenBalance', flags),
      buyTokenBalance: this.decodeFlag('buyTokenBalance', flags),
    }
  }

  /**
   * Encodes trade flags as a bitfield.
   *
   * @param flags The trade flags to encode.
   * @return The bitfield result.
   */
  public encodeTradeFlags(flags: TradeFlags<T>): number {
    return this.encodeOrderFlags(flags) | this.encodeSigningScheme(flags.signingScheme)
  }

  /**
   * Decode trade flags from a bitfield.
   *
   * @param flags The trade flags encoded as a bitfield.
   * @return The bitfield result.
   */
  public decodeTradeFlags(flags: T['BigIntish']): TradeFlags<T> {
    return {
      ...this.decodeOrderFlags(flags),
      signingScheme: this.decodeSigningScheme(flags),
    }
  }

  /**
   * Encodes signature data for a trade.
   */
  public encodeSignatureData(sig: Signature<T>): string {
    switch (sig.scheme) {
      case SigningScheme.EIP712:
      case SigningScheme.ETHSIGN:
        return this.adapter.joinSignature(this.adapter.splitSignature(sig.data))
      case SigningScheme.EIP1271:
        return this.contracts.encodeEip1271SignatureData(sig.data)
      case SigningScheme.PRESIGN:
        return this.adapter.getChecksumAddress(sig.data as string)
      default:
        throw new Error('unsupported signing scheme')
    }
  }

  /**
   * Decodes the owner of a signature.
   */
  public async decodeSignatureOwner(
    domain: T['TypedDataDomain'],
    order: Order<T>,
    scheme: SigningScheme,
    sig: string,
  ): Promise<string> {
    switch (scheme) {
      case SigningScheme.EIP712: {
        const normalizedOrder = this.contracts.normalizeOrder(order)
        return await this.adapter.verifyTypedData(domain, { Order: ORDER_TYPE_FIELDS }, normalizedOrder, sig)
      }
      case SigningScheme.ETHSIGN: {
        // Hash the order first
        const orderHash = this.contracts.hashOrder(domain, order)
        // Convert to Uint8Array
        const messageBytes = this.adapter.arrayify(orderHash as string)
        // Verify the signature
        return this.adapter.verifyMessage(messageBytes, sig)
      }
      case SigningScheme.EIP1271:
        return this.contracts.decodeEip1271SignatureData(sig).verifier
      case SigningScheme.PRESIGN:
        return this.adapter.getChecksumAddress(this.adapter.hexlify(sig))
      default:
        throw new Error('unsupported signing scheme')
    }
  }

  /**
   * Encodes a trade to be used with the settlement contract.
   */
  public encodeTrade(
    tokens: TokenRegistry<T>,
    order: Order<T>,
    signature: Signature<T>,
    { executedAmount }: TradeExecution,
  ): Trade<T> {
    const tradeFlags = {
      ...order,
      signingScheme: signature.scheme,
    }
    const o = this.contracts.normalizeOrder(order)

    return {
      sellTokenIndex: tokens.index(o.sellToken),
      buyTokenIndex: tokens.index(o.buyToken),
      receiver: o.receiver,
      sellAmount: o.sellAmount,
      buyAmount: o.buyAmount,
      validTo: o.validTo,
      appData: o.appData,
      feeAmount: o.feeAmount,
      flags: this.adapter.toBigIntish(this.encodeTradeFlags(tradeFlags)),
      executedAmount,
      signature: this.encodeSignatureData(signature),
    }
  }

  /**
   * Decodes an order from a settlement trade.
   *
   * @param trade The trade to decode into an order.
   * @param tokens The list of token addresses as they appear in the settlement.
   * @returns The decoded order.
   */
  public decodeOrder(trade: Trade<T>, tokens: string[]): Order<T> {
    const sellTokenIndex = Number(trade.sellTokenIndex)
    const buyTokenIndex = Number(trade.buyTokenIndex)
    if (Math.max(sellTokenIndex, buyTokenIndex) >= tokens.length) {
      throw new Error('Invalid trade')
    }
    return {
      sellToken: tokens[sellTokenIndex] as string,
      buyToken: tokens[buyTokenIndex] as string,
      receiver: trade.receiver,
      sellAmount: trade.sellAmount,
      buyAmount: trade.buyAmount,
      validTo: Number(trade.validTo.toString()),
      appData: trade.appData,
      feeAmount: trade.feeAmount,
      ...this.decodeOrderFlags(trade.flags),
    }
  }
}

/**
 * A class used for tracking tokens when encoding settlements.
 *
 * This is used as settlement trades reference tokens by index instead of
 * directly by address for multiple reasons:
 * - Reduce encoding size of orders to save on `calldata` gas.
 * - Direct access to a token's clearing price on settlement instead of
 *   requiring a search.
 */
export class TokenRegistry<T extends AdapterTypes> {
  private readonly _tokens: string[] = []
  private readonly _tokenMap: Record<string, number | undefined> = {}

  constructor(private adapter: AbstractProviderAdapter<T>) {
    this.adapter = adapter
  }

  /**
   * Gets the array of token addresses currently stored in the registry.
   */
  public get addresses(): string[] {
    // NOTE: Make sure to slice the original array, so it cannot be modified
    // outside of this class.
    return this._tokens.slice()
  }

  /**
   * Retrieves the token index for the specified token address. If the token is
   * not in the registry, it will be added.
   *
   * @param token The token address to add to the registry.
   * @return The token index.
   */
  public index(token: string): number {
    // NOTE: Verify and normalize the address into a case-checksummed address.
    // Not only does this ensure validity of the addresses early on, it also
    // makes it so `0xff...f` and `0xFF..F` map to the same ID.
    const tokenAddress = this.adapter.getChecksumAddress(token)

    let tokenIndex = this._tokenMap[tokenAddress]
    if (tokenIndex === undefined) {
      tokenIndex = this._tokens.length
      this._tokens.push(tokenAddress)
      this._tokenMap[tokenAddress] = tokenIndex
    }

    return tokenIndex
  }
}

/**
 * A class for building calldata for a settlement.
 *
 * The encoder ensures that token addresses are kept track of and performs
 * necessary computation in order to map each token addresses to IDs to
 * properly encode order parameters for trades.
 */
export class SettlementEncoder<T extends AdapterTypes> {
  private readonly _tokens: TokenRegistry<T>
  private readonly _trades: Trade<T>[] = []
  private readonly _interactions: Record<InteractionStage, Interaction<T['BigIntish'], T['Bytes']>[]> = {
    [InteractionStage.PRE]: [],
    [InteractionStage.INTRA]: [],
    [InteractionStage.POST]: [],
  }
  private readonly _orderRefunds: OrderRefunds<T> = {
    filledAmounts: [],
    preSignatures: [],
  }

  /**
   * Creates a new settlement encoder instance.
   * @param domain Domain used for signing orders. See {@link signOrder} for
   * more details.
   */
  public constructor(
    public readonly domain: T['TypedDataDomain'],
    private adapter: AbstractProviderAdapter<T>,
    private contracts: ContractsTs<T>,
    private settlement: ContractsTs_Settlement<T>,
  ) {
    this._tokens = new TokenRegistry<T>(adapter)
  }

  /**
   * Gets the array of token addresses used by the currently encoded orders.
   */
  public get tokens(): string[] {
    // NOTE: Make sure to slice the original array, so it cannot be modified
    // outside of this class.
    return this._tokens.addresses
  }

  /**
   * Gets the encoded trades.
   */
  public get trades(): Trade<T>[] {
    return this._trades.slice()
  }

  /**
   * Gets all encoded interactions for all stages.
   *
   * Note that order refund interactions are included as post-interactions.
   */
  public get interactions(): [
    Interaction<T['BigIntish'], T['Bytes']>[],
    Interaction<T['BigIntish'], T['Bytes']>[],
    Interaction<T['BigIntish'], T['Bytes']>[],
  ] {
    return [
      this._interactions[InteractionStage.PRE].slice(),
      this._interactions[InteractionStage.INTRA].slice(),
      [...this._interactions[InteractionStage.POST], ...this.encodedOrderRefunds],
    ]
  }

  /**
   * Gets the order refunds encoded as interactions.
   */
  public get encodedOrderRefunds(): Interaction<T['BigIntish'], T['Bytes']>[] {
    const { filledAmounts, preSignatures } = this._orderRefunds
    if (filledAmounts.length + preSignatures.length === 0) {
      return []
    }

    //@ts-expect-error: domain type is unknown
    const settlement = this.domain.verifyingContract
    if (settlement === undefined) {
      throw new Error('domain missing settlement contract address')
    }

    // Create the contract interface for encoding function calls
    const interactions = []

    // Add filledAmounts interaction if needed
    if (filledAmounts.length > 0) {
      interactions.push(
        this.contracts.normalizeInteraction({
          target: settlement,
          callData: this.adapter.encodeFunction(
            [{ name: 'freeFilledAmountStorage', inputs: [{ type: 'bytes[]' }] }],
            'freeFilledAmountStorage',
            [filledAmounts],
          ),
        }),
      )
    }

    // Add preSignatures interaction if needed
    if (preSignatures.length > 0) {
      interactions.push(
        this.contracts.normalizeInteraction({
          target: settlement,
          callData: this.adapter.encodeFunction(
            [{ name: 'freePreSignatureStorage', inputs: [{ type: 'bytes[]' }] }],
            'freePreSignatureStorage',
            [preSignatures],
          ),
        }),
      )
    }

    return interactions
  }

  /**
   * Returns a clearing price vector for the current settlement tokens from the
   * provided price map.
   *
   * @param prices The price map from token address to price.
   * @return The price vector.
   */
  public clearingPrices(prices: Prices<T>): T['BigIntish'][] {
    return this.tokens.map((token) => {
      const price = prices[token]
      if (price === undefined) {
        throw new Error(`missing price for token ${token}`)
      }
      return price
    })
  }

  /**
   * Encodes a trade from a signed order and executed amount, appending it to
   * the `calldata` bytes that are being built.
   *
   * Additionally, if the order references new tokens that the encoder has not
   * yet seen, they are added to the tokens array.
   *
   * @param order The order of the trade to encode.
   * @param signature The signature for the order data.
   * @param tradeExecution The execution details for the trade.
   */
  public encodeTrade(order: Order<T>, signature: Signature<T>, { executedAmount }: Partial<TradeExecution> = {}): void {
    if (order.partiallyFillable && executedAmount === undefined) {
      throw new Error('missing executed amount for partially fillable trade')
    }

    this._trades.push(
      this.settlement.encodeTrade(this._tokens, order, signature, {
        executedAmount: executedAmount ?? 0,
      }),
    )
  }

  /**
   * Signs an order and encodes a trade with that order.
   *
   * @param order The order to sign for the trade.
   * @param owner The externally owned account that should sign the order.
   * @param scheme The signing scheme to use. See {@link SigningScheme} for more
   * details.
   * @param tradeExecution The execution details for the trade.
   */
  public async signEncodeTrade(
    order: Order<T>,
    owner: T['Signer'],
    scheme: EcdsaSigningScheme,
    tradeExecution?: Partial<TradeExecution>,
  ): Promise<void> {
    const signature = await this.contracts.signOrder(this.domain, order, owner, scheme)
    this.encodeTrade(order, signature, tradeExecution)
  }

  /**
   * Encodes the input interaction in the packed format accepted by the smart
   * contract and adds it to the interactions encoded so far.
   *
   * @param stage The stage the interaction should be executed.
   * @param interaction The interaction to encode.
   */
  public encodeInteraction(
    interaction: InteractionLike<T['BigIntish'], T['Bytes']>,
    stage: InteractionStage = InteractionStage.INTRA,
  ): void {
    this._interactions[stage].push(this.contracts.normalizeInteraction(interaction))
  }

  /**
   * Encodes order UIDs for gas refunds.
   *
   * @param settlement The address of the settlement contract.
   * @param orderRefunds The order refunds to encode.
   */
  public encodeOrderRefunds(orderRefunds: Partial<OrderRefunds<T>>): void {
    //@ts-expect-error: domain type is unknown
    if (this.domain.verifyingContract === undefined) {
      throw new Error('domain missing settlement contract address')
    }

    const filledAmounts = orderRefunds.filledAmounts ?? []
    const preSignatures = orderRefunds.preSignatures ?? []

    // Verify all order UIDs are the correct length
    for (const orderUid of [...filledAmounts, ...preSignatures]) {
      const bytes = this.adapter.arrayify(orderUid as string)
      if (bytes.length !== ORDER_UID_LENGTH) {
        throw new Error('one or more invalid order UIDs')
      }
    }

    this._orderRefunds.filledAmounts.push(...filledAmounts)
    this._orderRefunds.preSignatures.push(...preSignatures)
  }

  /**
   * Returns the encoded settlement parameters.
   */
  public encodedSettlement(prices: Prices<T>): EncodedSettlement<T> {
    return [this.tokens, this.clearingPrices(prices), this.trades, this.interactions]
  }

  /**
   * Returns an encoded settlement that exclusively performs setup interactions.
   * This method can be used, for example, to set the settlement contract's
   * allowances to other protocols it may interact with.
   *
   * @param interactions The list of setup interactions to encode.
   */
  public static encodedSetup<T extends AdapterTypes>(
    adapter: AbstractProviderAdapter<T>,
    contracts: ContractsTs<T>,
    settlement: ContractsTs_Settlement<T>,
    ...interactions: InteractionLike<T['BigIntish'], T['Bytes']>[]
  ): EncodedSettlement<T> {
    const encoder = new SettlementEncoder<T>({ name: 'unused' } as T['TypedDataDomain'], adapter, contracts, settlement)
    for (const interaction of interactions) {
      encoder.encodeInteraction(interaction)
    }
    return encoder.encodedSettlement({})
  }
}
