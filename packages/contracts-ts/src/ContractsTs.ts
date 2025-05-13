import { AbstractProviderAdapter, AdapterTypes } from '@cowprotocol/common'
import { DeploymentArguments, MaybeNamedArtifactArtifactDeployment } from './deploy'
import { Interaction, InteractionLike, normalizeInteraction, normalizeInteractions } from './interaction'
import { ContractsTs_Proxy } from './proxy'
import { ContractsTs_Sign } from './sign'
import { ContractsTs_Order } from './order'

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
  // ... other methods from contracts-ts that need adapter
}
