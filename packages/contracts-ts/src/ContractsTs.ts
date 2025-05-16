import { AbstractProviderAdapter, AdapterTypes, setGlobalAdapter } from '@cowprotocol/common'
import {
  hashify,
  normalizeBuyTokenBalance,
  ORDER_TYPE_FIELDS,
  ORDER_UID_LENGTH,
  timestamp,
  normalizeOrder,
  hashTypedData,
  hashOrder,
  computeOrderUid,
  packOrderUidParams,
  extractOrderUidParams,
} from './order'
import { deterministicDeploymentAddress } from './deploy'
import { normalizeInteraction, normalizeInteractions } from './interaction'

export class ContractsTs<T extends AdapterTypes = AdapterTypes> {
  // Make ORDER_TYPE_FIELDS and ORDER_UID_LENGTH available
  public ORDER_TYPE_FIELDS = ORDER_TYPE_FIELDS
  public ORDER_UID_LENGTH = ORDER_UID_LENGTH

  /**
   * Creates a new AppDataApi instance
   *
   * @param adapter Provider adapter implementation
   */
  constructor(adapter: AbstractProviderAdapter) {
    setGlobalAdapter(adapter)
  }

  deterministicDeploymentAddress = deterministicDeploymentAddress

  normalizeInteraction = normalizeInteraction
  normalizeInteractions = normalizeInteractions

  timestamp = timestamp
  hashify = hashify
  normalizeBuyTokenBalance = normalizeBuyTokenBalance
  normalizeOrder = normalizeOrder
  hashTypedData = hashTypedData
  hashOrder = hashOrder
  computeOrderUid = computeOrderUid
  packOrderUidParams = packOrderUidParams
  extractOrderUidParams = extractOrderUidParams

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
}
