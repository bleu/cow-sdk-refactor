import { Bytes, ContractInterface, getGlobalAdapter, Provider } from '@cowprotocol/common'

/**
 * Compute an EIP-1967 slot for the specified name. The proxy contract used by
 * `hardhat-deploy` implements EIP-1967 (Standard Proxy Storage Slot).
 *
 * <https://eips.ethereum.org/EIPS/eip-1967>.
 */
function slot(name: string): Bytes {
  return getGlobalAdapter().utils.encodeAbi(
    ['bytes32'],
    //@ts-expect-error: bigintish type is unknown
    [this.adapter.toBigIntish(this.adapter.id(name)) - this.adapter.newBigintish(1)],
  )
}

const IMPLEMENTATION_STORAGE_SLOT = slot('eip1967.proxy.implementation')
const OWNER_STORAGE_SLOT = slot('eip1967.proxy.admin')

/**
 * Returns the address of the implementation of an EIP-1967-compatible proxy
 * from its address.
 *
 * @param proxy Address of the proxy contract.
 * @returns The address of the contract storing the proxy implementation.
 */
export async function implementationAddress(provider: Provider, proxy: string): Promise<string> {
  const adapter = getGlobalAdapter()
  const [implementation] = adapter.utils.decodeAbi(
    ['address'],
    await adapter.getStorageAt(proxy, IMPLEMENTATION_STORAGE_SLOT),
  )
  return implementation as string
}

/**
 * Returns the address of the implementation of an EIP-1967-compatible proxy
 * from its address.
 *
 * @param proxy Address of the proxy contract.
 * @returns The address of the administrator of the proxy.
 */
export async function ownerAddress(provider: Provider, proxy: string): Promise<string> {
  const data = provider?.getStorageAt
    ? await provider.getStorageAt(proxy, OWNER_STORAGE_SLOT)
    : provider?.getStorage
      ? provider.getStorage(proxy, OWNER_STORAGE_SLOT)
      : null
  if (data === null) throw new Error('getStorage is not implemented')
  const [owner] = getGlobalAdapter().utils.decodeAbi(['address'], data)
  return owner as string
}

/**
 * EIP-173 proxy ABI in "human-readable ABI" format. The proxy used by the
 * deployment plugin implements this interface, and copying it here avoids
 * pulling in `hardhat` as a dependency for just this ABI.
 *
 * <https://eips.ethereum.org/EIPS/eip-173#specification>
 */
export const EIP173_PROXY_ABI = [
  'event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)',
  'function owner() view external returns(address)',
  'function transferOwnership(address newOwner) external',
  'function supportsInterface(bytes4 interfaceID) external view returns (bool)',
]

/**
 * Returns the proxy interface for the specified address.
 *
 * @param contract The proxy contract to return a proxy interface for.
 * @returns A Ethers.js contract instance for interacting with the proxy.
 */
export function proxyInterface(contract: ContractInterface): ContractInterface {
  const adapter = getGlobalAdapter()
  //@ts-expect-error: abstract type is unknown
  return adapter.getContract(contract.address, this.EIP173_PROXY_ABI, contract.signer ?? contract.provider)
}
