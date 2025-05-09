import { AdapterTypes } from '@cowprotocol/common'

/**
 * Gnosis Protocol v2 order data.
 */
export interface Order<T extends AdapterTypes> {
  /**
   * Sell token address.
   */
  sellToken: string
  /**
   * Buy token address.
   */
  buyToken: string
  /**
   * An optional address to receive the proceeds of the trade instead of the
   * owner (i.e. the order signer).
   */
  receiver?: string
  /**
   * The order sell amount.
   *
   * For fill or kill sell orders, this amount represents the exact sell amount
   * that will be executed in the trade. For fill or kill buy orders, this
   * amount represents the maximum sell amount that can be executed. For partial
   * fill orders, this represents a component of the limit price fraction.
   */
  sellAmount: T['BigIntish']
  /**
   * The order buy amount.
   *
   * For fill or kill sell orders, this amount represents the minimum buy amount
   * that can be executed in the trade. For fill or kill buy orders, this amount
   * represents the exact buy amount that will be executed. For partial fill
   * orders, this represents a component of the limit price fraction.
   */
  buyAmount: T['BigIntish']
  /**
   * The timestamp this order is valid until
   */
  validTo: Timestamp
  /**
   * Arbitrary application specific data that can be added to an order. This can
   * also be used to ensure uniqueness between two orders with otherwise the
   * exact same parameters.
   */
  appData: HashLike<T>
  /**
   * Fee to give to the protocol.
   */
  feeAmount: T['BigIntish']
  /**
   * The order kind.
   */
  kind: OrderKind
  /**
   * Specifies whether or not the order is partially fillable.
   */
  partiallyFillable: boolean
  /**
   * Specifies how the sell token balance will be withdrawn. It can either be
   * taken using ERC20 token allowances made directly to the Vault relayer
   * (default) or using Balancer Vault internal or external balances.
   */
  sellTokenBalance?: OrderBalance
  /**
   * Specifies how the buy token balance will be paid. It can either be paid
   * directly in ERC20 tokens (default) in Balancer Vault internal balances.
   */
  buyTokenBalance?: OrderBalance
}

/**
 * Gnosis Protocol v2 order cancellation data.
 */
export interface OrderCancellations<T extends AdapterTypes> {
  /**
   * The unique identifier of the order to be cancelled.
   */
  orderUids: T['Bytes'][]
}

/**
 * Marker address to indicate that an order is buying Ether.
 *
 * Note that this address is only has special meaning in the `buyToken` and will
 * be treated as a ERC20 token address in the `sellToken` position, causing the
 * settlement to revert.
 */
export const BUY_ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

/**
 * Gnosis Protocol v2 order flags.
 */
export type OrderFlags<T extends AdapterTypes> = Pick<
  Order<T>,
  'kind' | 'partiallyFillable' | 'sellTokenBalance' | 'buyTokenBalance'
>

/**
 * A timestamp value.
 */
export type Timestamp = number | Date

/**
 * A hash-like app data value.
 */
export type HashLike<T extends AdapterTypes> = T['Bytes'] | number

/**
 * Order kind.
 */
export enum OrderKind {
  /**
   * A sell order.
   */
  SELL = 'sell',
  /**
   * A buy order.
   */
  BUY = 'buy',
}

/**
 * Order balance configuration.
 */
export enum OrderBalance {
  /**
   * Use ERC20 token balances.
   */
  ERC20 = 'erc20',
  /**
   * Use Balancer Vault external balances.
   *
   * This can only be specified specified for the sell balance and allows orders
   * to re-use Vault ERC20 allowances. When specified for the buy balance, it
   * will be treated as {@link OrderBalance.ERC20}.
   */
  EXTERNAL = 'external',
  /**
   * Use Balancer Vault internal balances.
   */
  INTERNAL = 'internal',
}

/**
 * The EIP-712 type fields definition for a Gnosis Protocol v2 order.
 */
export const ORDER_TYPE_FIELDS = [
  { name: 'sellToken', type: 'address' },
  { name: 'buyToken', type: 'address' },
  { name: 'receiver', type: 'address' },
  { name: 'sellAmount', type: 'uint256' },
  { name: 'buyAmount', type: 'uint256' },
  { name: 'validTo', type: 'uint32' },
  { name: 'appData', type: 'bytes32' },
  { name: 'feeAmount', type: 'uint256' },
  { name: 'kind', type: 'string' },
  { name: 'partiallyFillable', type: 'bool' },
  { name: 'sellTokenBalance', type: 'string' },
  { name: 'buyTokenBalance', type: 'string' },
]

/**
 * Normalizes a timestamp value to a Unix timestamp.
 * @param time The timestamp value to normalize.
 * @return Unix timestamp or number of seconds since the Unix Epoch.
 */
export function timestamp(t: Timestamp): number {
  return typeof t === 'number' ? t : ~~(t.getTime() / 1000)
}

/**
 * Normalizes the balance configuration for a buy token. Specifically, this
 * function ensures that {@link OrderBalance.EXTERNAL} gets normalized to
 * {@link OrderBalance.ERC20}.
 *
 * @param balance The balance configuration.
 * @returns The normalized balance configuration.
 */
export function normalizeBuyTokenBalance(
  balance: OrderBalance | undefined,
): OrderBalance.ERC20 | OrderBalance.INTERNAL {
  switch (balance) {
    case undefined:
    case OrderBalance.ERC20:
    case OrderBalance.EXTERNAL:
      return OrderBalance.ERC20
    case OrderBalance.INTERNAL:
      return OrderBalance.INTERNAL
    default:
      throw new Error(`invalid order balance ${balance}`)
  }
}

/**
 * Normalized representation of an {@link Order} for EIP-712 operations.
 */
export type NormalizedOrder<T extends AdapterTypes> = Omit<
  Order<T>,
  'validTo' | 'appData' | 'kind' | 'sellTokenBalance' | 'buyTokenBalance'
> & {
  receiver: string
  validTo: number
  appData: string
  kind: 'sell' | 'buy'
  sellTokenBalance: 'erc20' | 'external' | 'internal'
  buyTokenBalance: 'erc20' | 'internal'
}

/**
 * The byte length of an order UID.
 */
export const ORDER_UID_LENGTH = 56

/**
 * Order unique identifier parameters.
 */
export interface OrderUidParams {
  /**
   * The EIP-712 order struct hash.
   */
  orderDigest: string
  /**
   * The owner of the order.
   */
  owner: string
  /**
   * The timestamp this order is valid until.
   */
  validTo: number | Date
}
