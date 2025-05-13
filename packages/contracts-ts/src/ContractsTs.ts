import { AbstractProviderAdapter, AdapterTypes } from '@cowprotocol/common'
import { DeploymentArguments, MaybeNamedArtifactArtifactDeployment } from './deploy'
import { Interaction, InteractionLike, normalizeInteraction, normalizeInteractions } from './interaction'
import {
  HashLike,
  normalizeBuyTokenBalance,
  NormalizedOrder,
  Order,
  ORDER_TYPE_FIELDS,
  ORDER_UID_LENGTH,
  OrderBalance,
  OrderUidParams,
  timestamp,
  Timestamp,
} from './order'
import { ContractsTs_Proxy } from './proxy'
import { ContractsTs_Sign } from './sign'

export class ContractsTs<T extends AdapterTypes = AdapterTypes> {
  SALT: string
  DEPLOYER_CONTRACT: string
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

  constructor(private adapter: AbstractProviderAdapter<T>) {
    this.adapter = adapter

    this.SALT = this.adapter.formatBytes32String('Mattresses in Berlin!')
    this.DEPLOYER_CONTRACT = '0x4e59b44847b379578588920ca78fbf26c0b4956c'

    this.proxy = new ContractsTs_Proxy(adapter)
    this.ownerAddress = this.proxy.ownerAddress
    this.slot = this.proxy.slot
    this.proxyInterface = this.proxy.proxyInterface
    this.implementationAddress = this.proxy.implementationAddress

    this.sign = new ContractsTs_Sign(adapter, this)
    this.EIP1271_MAGICVALUE = this.sign.EIP1271_MAGICVALUE
    this.EcdsaSigningScheme = this.sign.EcdsaSigningScheme
    this.decodeEip1271SignatureData = this.sign.decodeEip1271SignatureData
    this.encodeEip1271SignatureData = this.sign.encodeEip1271SignatureData
    this.signOrder = this.sign.signOrder
  }

  /**
   * Computes the deterministic address at which the contract will be deployed.
   * This address does not depend on which network the contract is deployed to.
   *
   * @param contractName Name of the contract for which to find the address.
   * @param deploymentArguments Extra arguments that are necessary to deploy.
   * @returns The address that is expected to store the deployed code.
   */
  public deterministicDeploymentAddress<C>(
    adapter: AbstractProviderAdapter,
    { abi, bytecode }: MaybeNamedArtifactArtifactDeployment<C>,
    deploymentArguments: DeploymentArguments<C>,
  ): string {
    const deployData = adapter.hexConcat([bytecode, this.adapter.encodeDeploy(deploymentArguments, abi as T['Abi'])])

    return adapter.getCreate2Address(this.DEPLOYER_CONTRACT, this.SALT, this.adapter.keccak256(deployData))
  }

  /**
   * Normalizes interaction data so that it is ready to be be ABI encoded.
   *
   * @param interaction The interaction to normalize.
   * @return The normalized interaction.
   */
  public normalizeInteraction(
    interaction: InteractionLike<T['BigIntish'], T['Bytes']>,
  ): Interaction<T['BigIntish'], T['Bytes']> {
    return normalizeInteraction<T['BigIntish'], T['Bytes']>(interaction)
  }

  /**
   * Normalizes data for many interactions so that they can be ABI encoded. This
   * calls [`normalizeInteraction`] for each interaction.
   *
   * @param interactions The interactions to normalize.
   * @return The normalized interactions.
   */
  public normalizeInteractions(interactions: InteractionLike<T['BigIntish'], T['Bytes']>[]): Interaction[] {
    return normalizeInteractions<T['BigIntish'], T['Bytes']>(interactions)
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
   * Normalizes a timestamp value to a Unix timestamp.
   * @param time The timestamp value to normalize.
   * @return Unix timestamp or number of seconds since the Unix Epoch.
   */
  public timestamp(t: Timestamp): number {
    return timestamp(t)
  }

  /**
   * Normalizes an app data value to a 32-byte hash.
   * @param hashLike A hash-like value to normalize.
   * @returns A 32-byte hash encoded as a hex-string.
   */
  public hashify<T extends AdapterTypes>(h: HashLike<T>): string {
    return typeof h === 'number' ? `0x${h.toString(16).padStart(64, '0')}` : this.adapter.hexZeroPad(h, 32)
  }

  /**
   * Normalizes the balance configuration for a buy token. Specifically, this
   * function ensures that {@link OrderBalance.EXTERNAL} gets normalized to
   * {@link OrderBalance.ERC20}.
   *
   * @param balance The balance configuration.
   * @returns The normalized balance configuration.
   */
  public normalizeBuyTokenBalance(balance: OrderBalance | undefined): OrderBalance.ERC20 | OrderBalance.INTERNAL {
    return normalizeBuyTokenBalance(balance)
  }

  /**
   * Normalizes an order for hashing and signing, so that it can be used with
   * Ethers.js for EIP-712 operations.
   * @param hashLike A hash-like value to normalize.
   * @returns A 32-byte hash encoded as a hex-string.
   */
  public normalizeOrder(order: Order<T>): NormalizedOrder<T> {
    if (order.receiver === this.adapter.ZERO_ADDRESS) {
      throw new Error('receiver cannot be address(0)')
    }

    const normalizedOrder = {
      ...order,
      sellTokenBalance: order.sellTokenBalance ?? OrderBalance.ERC20,
      receiver: order.receiver ?? this.adapter.ZERO_ADDRESS,
      validTo: timestamp(order.validTo),
      appData: this.hashify(order.appData),
      buyTokenBalance: normalizeBuyTokenBalance(order.buyTokenBalance),
    }
    return normalizedOrder
  }

  /**
   * Compute the 32-byte signing hash for the specified order.
   *
   * @param domain The EIP-712 domain separator to compute the hash for.
   * @param types The order to compute the digest for.
   * @return Hex-encoded 32-byte order digest.
   */
  public hashTypedData(
    domain: T['TypedDataDomain'],
    types: T['TypedDataTypes'],
    data: Record<string, unknown>,
  ): string {
    return this.adapter.hashTypedData(domain, types, data)
  }

  /**
   * Compute the 32-byte signing hash for the specified order.
   *
   * @param domain The EIP-712 domain separator to compute the hash for.
   * @param order The order to compute the digest for.
   * @return Hex-encoded 32-byte order digest.
   */
  public hashOrder(domain: T['TypedDataDomain'], order: Order<T>): string {
    return this.hashTypedData(domain, { Order: ORDER_TYPE_FIELDS }, this.normalizeOrder(order))
  }

  /**
   * Computes the order UID for an order and the given owner.
   */
  public computeOrderUid(domain: T['TypedDataDomain'], order: Order<T>, owner: string): string {
    return this.packOrderUidParams({
      orderDigest: this.hashOrder(domain, order),
      owner,
      validTo: order.validTo,
    })
  }

  /**
   * Compute the unique identifier describing a user order in the settlement
   * contract.
   *
   * @param OrderUidParams The parameters used for computing the order's unique
   * identifier.
   * @returns A string that unequivocally identifies the order of the user.
   */
  public packOrderUidParams({ orderDigest, owner, validTo }: OrderUidParams): string {
    return this.adapter.solidityPack(['bytes32', 'address', 'uint32'], [orderDigest, owner, timestamp(validTo)])
  }

  /**
   * Extracts the order unique identifier parameters from the specified bytes.
   *
   * @param orderUid The order UID encoded as a hexadecimal string.
   * @returns The extracted order UID parameters.
   */
  public extractOrderUidParams(orderUid: string): OrderUidParams {
    const bytes = this.adapter.arrayify(orderUid)
    if (bytes.length != ORDER_UID_LENGTH) {
      throw new Error('invalid order UID length')
    }

    const view = new DataView(bytes.buffer)
    return {
      orderDigest: this.adapter.hexlify(bytes.subarray(0, 32)),
      owner: this.adapter.getChecksumAddress(this.adapter.hexlify(bytes.subarray(32, 52))),
      validTo: view.getUint32(52),
    }
  }
  // ... other methods from contracts-ts that need adapter
}
