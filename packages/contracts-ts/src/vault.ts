import { AbstractProviderAdapter, AdapterTypes } from '@cowprotocol/common'

export class ContractsTs_Vault<T extends AdapterTypes = AdapterTypes> {
  public VAULT_INTERFACE: T['ContractInterface']
  constructor(private adapter: AbstractProviderAdapter<T>) {
    this.adapter = adapter
    /**
     * Balancer Vault partial ABI interface.
     *
     * This definition only contains the Vault methods that are used by GPv2 Vault
     * relayer. It is copied here to avoid relying on build artifacts.
     */
    this.VAULT_INTERFACE = this.adapter.createInterface([
      'function manageUserBalance((uint8, address, uint256, address, address)[])',
      'function batchSwap(uint8, (bytes32, uint256, uint256, uint256, bytes)[], address[], (address, bool, address, bool), int256[], uint256)',
    ])
  }

  /**
   * Grants the required roles to the specified Vault relayer.
   *
   * This method is intended to be called by the Balancer Vault admin, and **not**
   * traders. It is included in the exported TypeScript library for completeness
   * and "documentation".
   *
   * @param authorizer The Vault authorizer contract that manages access.
   * @param vaultAddress The address to the Vault.
   * @param vaultRelayerAddress The address to the GPv2 Vault relayer contract.
   */
  public async grantRequiredRoles(
    authorizer: T['ContractInterface'],
    vaultAddress: string,
    vaultRelayerAddress: string,
  ): Promise<void> {
    //@ts-expect-error: ContractInferface type is unknown
    for (const name in this.VAULT_INTERFACE.functions) {
      //@ts-expect-error: ContractInferface type is unknown
      await authorizer.grantRole(
        //@ts-expect-error: ContractInferface type is unknown
        this.adapter.solidityKeccak256(['uint256', 'bytes4'], [vaultAddress, this.VAULT_INTERFACE.getSighash(name)]),
        vaultRelayerAddress,
      )
    }
  }
}
