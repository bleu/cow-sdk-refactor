import { AbstractProviderAdapter, AdapterTypes } from '@cowprotocol/common'
import { DeploymentArguments, MaybeNamedArtifactArtifactDeployment } from './deploy'
import { Interaction, InteractionLike, normalizeInteraction, normalizeInteractions } from './interaction'

export class ContractsTs<T extends AdapterTypes = AdapterTypes> {
  SALT: string
  DEPLOYER_CONTRACT: string

  constructor(private adapter: AbstractProviderAdapter<T>) {
    this.adapter = adapter
    this.SALT = this.adapter.formatBytes32String('Mattresses in Berlin!')
    this.DEPLOYER_CONTRACT = '0x4e59b44847b379578588920ca78fbf26c0b4956c'
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

  // ... other methods from contracts-ts that need adapter
}
