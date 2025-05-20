import { ContractInterface, getGlobalAdapter } from '@cowprotocol/common'

/**
 * Balancer Vault partial ABI interface.
 *
 * This definition only contains the Vault methods that are used by GPv2 Vault
 * relayer. It is copied here to avoid relying on build artifacts.
 */
export function getVaultInterface(): ContractInterface {
  return getGlobalAdapter().utils.createInterface([
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
export async function grantRequiredRoles(
  authorizer: ContractInterface,
  vaultAddress: string,
  vaultRelayerAddress: string,
): Promise<void> {
  const vaultInferface = getVaultInterface()
  //@ts-expect-error: ContractInferface type is unknown
  for (const name in vaultInferface.functions) {
    //@ts-expect-error: ContractInferface type is unknown
    await authorizer.grantRole(
      getGlobalAdapter().utils.solidityKeccak256(
        ['uint256', 'bytes4'],
        //@ts-expect-error: ContractInferface type is unknown
        [vaultAddress, vaultInferface.getSighash(name)],
      ),
      vaultRelayerAddress,
    )
  }
}
