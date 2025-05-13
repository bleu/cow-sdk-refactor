import { AbstractProviderAdapter, AdapterTypes } from '@cowprotocol/common'
import { ContractsTs_Interaction } from './interaction'
import { ContractsTs_Proxy } from './proxy'
import { ContractsTs_Sign, EcdsaSigningScheme, Signature } from './sign'
import { ContractsTs_Order, Order, ORDER_TYPE_FIELDS, ORDER_UID_LENGTH } from './order'
import { ContractsTs_Deploy } from './deploy'
import { ContractsTs_Settlement, SettlementEncoder } from './settlement'
import { ContractsTs_Swap, SwapEncoder, Swap, SwapExecution } from './swap'

export class ContractsTs<T extends AdapterTypes = AdapterTypes> {
  private proxy: ContractsTs_Proxy<T>
  public ownerAddress: ContractsTs_Proxy<T>['ownerAddress']
  public slot: ContractsTs_Proxy<T>['slot']
  public proxyInterface: ContractsTs_Proxy<T>['proxyInterface']
  public implementationAddress: ContractsTs_Proxy<T>['implementationAddress']

  private sign: ContractsTs_Sign<T>
  public EIP1271_MAGICVALUE: ContractsTs_Sign<T>['EIP1271_MAGICVALUE']
  public EcdsaSigningScheme: ContractsTs_Sign<T>['EcdsaSigningScheme']
  public decodeEip1271SignatureData: ContractsTs_Sign<T>['decodeEip1271SignatureData']
  public encodeEip1271SignatureData: ContractsTs_Sign<T>['encodeEip1271SignatureData']
  public signOrder: ContractsTs_Sign<T>['signOrder']

  private order: ContractsTs_Order<T>
  public timestamp: ContractsTs_Order<T>['timestamp']
  public hashify: ContractsTs_Order<T>['hashify']
  public normalizeBuyTokenBalance: ContractsTs_Order<T>['normalizeBuyTokenBalance']
  public normalizeOrder: ContractsTs_Order<T>['normalizeOrder']
  public hashTypedData: ContractsTs_Order<T>['hashTypedData']
  public hashOrder: ContractsTs_Order<T>['hashOrder']
  public computeOrderUid: ContractsTs_Order<T>['computeOrderUid']
  public packOrderUidParams: ContractsTs_Order<T>['packOrderUidParams']
  public extractOrderUidParams: ContractsTs_Order<T>['extractOrderUidParams']
  // Make ORDER_TYPE_FIELDS and ORDER_UID_LENGTH available
  public ORDER_TYPE_FIELDS = ORDER_TYPE_FIELDS
  public ORDER_UID_LENGTH = ORDER_UID_LENGTH

  private deploy: ContractsTs_Deploy<T>
  public deterministicDeploymentAddress: ContractsTs_Deploy<T>['deterministicDeploymentAddress']

  private interaction: ContractsTs_Interaction<T>
  public normalizeInteraction: ContractsTs_Interaction<T>['normalizeInteraction']
  public normalizeInteractions: ContractsTs_Interaction<T>['normalizeInteractions']

  private settlement: ContractsTs_Settlement<T>
  public encodeSigningScheme: ContractsTs_Settlement<T>['encodeSigningScheme']
  public decodeSigningScheme: ContractsTs_Settlement<T>['decodeSigningScheme']
  public encodeOrderFlags: ContractsTs_Settlement<T>['encodeOrderFlags']
  public decodeOrderFlags: ContractsTs_Settlement<T>['decodeOrderFlags']
  public encodeTradeFlags: ContractsTs_Settlement<T>['encodeTradeFlags']
  public decodeTradeFlags: ContractsTs_Settlement<T>['decodeTradeFlags']
  public encodeSignatureData: ContractsTs_Settlement<T>['encodeSignatureData']
  public decodeSignatureOwner: ContractsTs_Settlement<T>['decodeSignatureOwner']
  public encodeTrade: ContractsTs_Settlement<T>['encodeTrade']
  public decodeOrder: ContractsTs_Settlement<T>['decodeOrder']

  private swap: ContractsTs_Swap<T>
  public encodeSwapStep: ContractsTs_Swap<T>['encodeSwapStep']

  constructor(private adapter: AbstractProviderAdapter<T>) {
    this.adapter = adapter

    this.proxy = new ContractsTs_Proxy(adapter)
    this.ownerAddress = this.proxy.ownerAddress
    this.slot = this.proxy.slot
    this.proxyInterface = this.proxy.proxyInterface
    this.implementationAddress = this.proxy.implementationAddress

    this.order = new ContractsTs_Order(adapter)
    this.timestamp = this.order.timestamp
    this.hashify = this.order.hashify
    this.normalizeBuyTokenBalance = this.order.normalizeBuyTokenBalance
    this.normalizeOrder = this.order.normalizeOrder
    this.hashTypedData = this.order.hashTypedData
    this.hashOrder = this.order.hashOrder
    this.computeOrderUid = this.order.computeOrderUid
    this.packOrderUidParams = this.order.packOrderUidParams
    this.extractOrderUidParams = this.order.extractOrderUidParams

    this.deploy = new ContractsTs_Deploy(adapter)
    this.deterministicDeploymentAddress = this.deploy.deterministicDeploymentAddress

    this.interaction = new ContractsTs_Interaction(adapter)
    this.normalizeInteraction = this.interaction.normalizeInteraction
    this.normalizeInteractions = this.interaction.normalizeInteractions

    this.settlement = new ContractsTs_Settlement(adapter, this)
    this.encodeSigningScheme = this.settlement.encodeSigningScheme.bind(this.settlement)
    this.decodeSigningScheme = this.settlement.decodeSigningScheme.bind(this.settlement)
    this.encodeOrderFlags = this.settlement.encodeOrderFlags.bind(this.settlement)
    this.decodeOrderFlags = this.settlement.decodeOrderFlags.bind(this.settlement)
    this.encodeTradeFlags = this.settlement.encodeTradeFlags.bind(this.settlement)
    this.decodeTradeFlags = this.settlement.decodeTradeFlags.bind(this.settlement)
    this.encodeSignatureData = this.settlement.encodeSignatureData.bind(this.settlement)
    this.decodeSignatureOwner = this.settlement.decodeSignatureOwner.bind(this.settlement)
    this.encodeTrade = this.settlement.encodeTrade.bind(this.settlement)
    this.decodeOrder = this.settlement.decodeOrder.bind(this.settlement)

    this.swap = new ContractsTs_Swap(adapter, this)
    this.encodeSwapStep = this.swap.encodeSwapStep.bind(this.swap)

    this.sign = new ContractsTs_Sign(adapter, this)
    this.EIP1271_MAGICVALUE = this.sign.EIP1271_MAGICVALUE
    this.EcdsaSigningScheme = this.sign.EcdsaSigningScheme
    this.decodeEip1271SignatureData = this.sign.decodeEip1271SignatureData
    this.encodeEip1271SignatureData = this.sign.encodeEip1271SignatureData
    this.signOrder = this.sign.signOrder
  }

  /**
   * Return the Gnosis Protocol v2 domain used for signing.
   * @param chainId The EIP-155 chain ID.
   * @param verifyingContract The address of the contract that will verify the
   * signature.
   * @return An EIP-712 compatible typed domain data.
   */
  public domain(chainId: number, verifyingContract: string): T['TypedDataDomain'] {
    return {
      name: 'Gnosis Protocol',
      version: 'v2',
      chainId,
      verifyingContract,
    }
  }

  /**
   * Creates a new settlement encoder instance.
   *
   * @param domain The EIP-712 domain to use for signing orders.
   * @returns A new settlement encoder instance.
   */
  public createSettlementEncoder(domain: T['TypedDataDomain']) {
    return new SettlementEncoder(domain, this.adapter, this, this.settlement)
  }

  /**
   * Creates a new swap encoder instance.
   *
   * @param domain The EIP-712 domain to use for signing orders.
   * @returns A new swap encoder instance.
   */
  public createSwapEncoder(domain: T['TypedDataDomain']) {
    return new SwapEncoder(domain, this.adapter, this)
  }

  /**
   * Static method to create encoded settlement setup.
   *
   * @param adapter The provider adapter to use.
   * @param interactions The list of interactions to encode.
   * @returns The encoded settlement.
   */
  public static encodedSetup<T extends AdapterTypes>(
    adapter: AbstractProviderAdapter<T>,
    ...interactions: Array<{
      target: string
      value?: T['BigIntish']
      callData?: T['Bytes']
    }>
  ) {
    const contracts = new ContractsTs<T>(adapter)
    return SettlementEncoder.encodedSetup(adapter, contracts, contracts.settlement, ...interactions)
  }

  /**
   * Static method to encode a swap.
   *
   * @param adapter The provider adapter to use.
   * @param swaps The swaps to encode.
   * @param order The order to trade.
   * @param signature The order signature.
   * @param swapExecution Optional swap execution parameters.
   * @returns The encoded swap.
   */
  public static encodeSwap<T extends AdapterTypes>(
    adapter: AbstractProviderAdapter<T>,
    swaps: Swap<T>[],
    order: Order<T>,
    signature: Signature<T>,
    swapExecution?: Partial<SwapExecution<T>>,
  ) {
    const contracts = new ContractsTs<T>(adapter)
    return ContractsTs_Swap.encodeSwap(adapter, contracts, swaps, order, signature, swapExecution)
  }

  /**
   * Static method to encode a swap with signing.
   *
   * @param adapter The provider adapter to use.
   * @param domain The EIP-712 domain to use for signing.
   * @param swaps The swaps to encode.
   * @param order The order to trade.
   * @param owner The owner to sign with.
   * @param scheme The signing scheme to use.
   * @param swapExecution Optional swap execution parameters.
   * @returns A promise that resolves to the encoded swap.
   */
  public static encodeSwapWithSigning<T extends AdapterTypes>(
    adapter: AbstractProviderAdapter<T>,
    domain: T['TypedDataDomain'],
    swaps: Swap<T>[],
    order: Order<T>,
    owner: T['Signer'],
    scheme: EcdsaSigningScheme,
    swapExecution?: Partial<SwapExecution<T>>,
  ) {
    const contracts = new ContractsTs<T>(adapter)
    return ContractsTs_Swap.encodeSwapWithSigning(
      adapter,
      contracts,
      domain,
      swaps,
      order,
      owner,
      scheme,
      swapExecution,
    )
  }
}
