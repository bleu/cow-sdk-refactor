import { AbstractProviderAdapter } from '@cowprotocol/common'
import { DeploymentArguments, MaybeNamedArtifactArtifactDeployment } from './deploy'

export class ContractsTs {
  SALT: string
  DEPLOYER_CONTRACT: string

  constructor(private adapter: AbstractProviderAdapter) {
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
    const deployData = adapter.hexConcat([bytecode, this.adapter.encodeDeploy(deploymentArguments, abi)])

    return adapter.getCreate2Address(this.DEPLOYER_CONTRACT, this.SALT, this.adapter.keccak256(deployData))
  }

  // ... other methods from contracts-ts that need adapter
}
