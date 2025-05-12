import { AbstractProviderAdapter, AdapterTypes } from '@cowprotocol/common'

export class ContractsTs_Proxy<T extends AdapterTypes = AdapterTypes> {
  private IMPLEMENTATION_STORAGE_SLOT: T['Bytes']
  private OWNER_STORAGE_SLOT: T['Bytes']
  private EIP173_PROXY_ABI: string[]
  constructor(private adapter: AbstractProviderAdapter<T>) {
    this.adapter = adapter

    this.IMPLEMENTATION_STORAGE_SLOT = this.slot('eip1967.proxy.implementation')
    this.OWNER_STORAGE_SLOT = this.slot('eip1967.proxy.admin')
    /**
     * EIP-173 proxy ABI in "human-readable ABI" format. The proxy used by the
     * deployment plugin implements this interface, and copying it here avoids
     * pulling in `hardhat` as a dependency for just this ABI.
     *
     * <https://eips.ethereum.org/EIPS/eip-173#specification>
     */
    this.EIP173_PROXY_ABI = [
      'event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)',
      'function owner() view external returns(address)',
      'function transferOwnership(address newOwner) external',
      'function supportsInterface(bytes4 interfaceID) external view returns (bool)',
    ]
  }

  /**
   * Compute an EIP-1967 slot for the specified name. The proxy contract used by
   * `hardhat-deploy` implements EIP-1967 (Standard Proxy Storage Slot).
   *
   * <https://eips.ethereum.org/EIPS/eip-1967>.
   */
  public slot(name: string): T['Bytes'] {
    return this.adapter.encodeAbi(
      ['bytes32'],
      //@ts-expect-error: bigintish type is unknown
      [this.adapter.toBigIntish(this.adapter.id(name)) - this.adapter.newBigintish(1)],
    )
  }

  /**
   * Returns the address of the implementation of an EIP-1967-compatible proxy
   * from its address.
   *
   * @param proxy Address of the proxy contract.
   * @returns The address of the contract storing the proxy implementation.
   */
  public async implementationAddress(provider: T['Provider'], proxy: T['Address']): Promise<T['Address']> {
    const [implementation] = this.adapter.decodeAbi(
      ['address'],
      await this.adapter.getStorageAt(proxy, this.IMPLEMENTATION_STORAGE_SLOT),
    ) as unknown[]
    return implementation as T['Address']
  }

  /**
   * Returns the address of the implementation of an EIP-1967-compatible proxy
   * from its address.
   *
   * @param proxy Address of the proxy contract.
   * @returns The address of the administrator of the proxy.
   */
  public async ownerAddress(provider: T['Provider'], proxy: T['Address']): Promise<T['Address']> {
    //@ts-expect-error: abstract provider type is unknown
    const [owner] = this.adapter.decodeAbi(['address'], await provider.getStorageAt(proxy, this.OWNER_STORAGE_SLOT))
    return owner as T['Address']
  }

  /**
   * Returns the proxy interface for the specified address.
   *
   * @param contract The proxy contract to return a proxy interface for.
   * @returns A Ethers.js contract instance for interacting with the proxy.
   */
  public proxyInterface(contract: T['ContractInterface']): T['ContractInterface'] {
    //@ts-expect-error: abstract type is unknown
    return this.adapter.getContract(contract.address, this.EIP173_PROXY_ABI, contract.signer ?? contract.provider)
  }
}

/**
 * Returns the address of the implementation of an EIP-1967-compatible proxy
 * from its address.
 *
 * @param proxy Address of the proxy contract.
 * @returns The address of the contract storing the proxy implementation.
 */
export async function _implementationAddress<T extends AdapterTypes>(
  provider: T['Provider'],
  proxy: T['Address'],
  adapter: AbstractProviderAdapter<T>,
): Promise<T['Address']> {
  const [implementation] = adapter.decodeAbi(['address'], await adapter.getStorageAt(proxy, 'constante')) as unknown[]
  return implementation as T['Address']
}
