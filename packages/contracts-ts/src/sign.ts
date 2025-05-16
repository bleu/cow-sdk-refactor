import { Bytes, getGlobalAdapter, SignatureLike, Signer, TypedDataDomain, TypedDataTypes } from '@cowprotocol/common'
import { ORDER_TYPE_FIELDS, Order, normalizeOrder, hashTypedData } from './order'

/**
 * Value returned by a call to `isValidSignature` if the signature was verified
 * successfully. The value is defined in the EIP-1271 standard as:
 * bytes4(keccak256("isValidSignature(bytes32,bytes)"))
 */
export const EIP1271_MAGICVALUE = getGlobalAdapter().utils.hexDataSlice(
  getGlobalAdapter().utils.id('isValidSignature(bytes32,bytes)'),
  0,
  4,
)

/**
 * The signing scheme used to sign the order.
 */
export enum SigningScheme {
  /**
   * The EIP-712 typed data signing scheme. This is the preferred scheme as it
   * provides more infomation to wallets performing the signature on the data
   * being signed.
   *
   * <https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md#definition-of-domainseparator>
   */
  EIP712 = 0b00,
  /**
   * Message signed using eth_sign RPC call.
   */
  ETHSIGN = 0b01,
  /**
   * Smart contract signatures as defined in EIP-1271.
   *
   * <https://eips.ethereum.org/EIPS/eip-1271>
   */
  EIP1271 = 0b10,
  /**
   * Pre-signed order.
   */
  PRESIGN = 0b11,
}

export type EcdsaSigningScheme = SigningScheme.EIP712 | SigningScheme.ETHSIGN

/**
 * The signature of an order.
 */
export type Signature = EcdsaSignature | Eip1271Signature | PreSignSignature

/**
 * ECDSA signature of an order.
 */
export interface EcdsaSignature {
  /**
   * The signing scheme used in the signature.
   */
  scheme: EcdsaSigningScheme
  /**
   * The ECDSA signature.
   */
  data: SignatureLike
}

/**
 * EIP-1271 signature data.
 */
export interface Eip1271SignatureData {
  /**
   * The verifying contract address.
   */
  verifier: string
  /**
   * The arbitrary signature data used for verification.
   */
  signature: Bytes
}

/**
 * EIP-1271 signature of an order.
 */
export interface Eip1271Signature {
  /**
   * The signing scheme used in the signature.
   */
  scheme: SigningScheme.EIP1271
  /**
   * The signature data.
   */
  data: Eip1271SignatureData
}

/**
 * Signature data for a pre-signed order.
 */
export interface PreSignSignature {
  /**
   * The signing scheme used in the signature.
   */
  scheme: SigningScheme.PRESIGN
  /**
   * The address of the signer.
   */
  data: string
}

async function ecdsaSignTypedData(
  scheme: EcdsaSigningScheme,
  owner: Signer,
  domain: TypedDataDomain,
  types: TypedDataTypes,
  data: Record<string, unknown>,
): Promise<string> {
  let signature: string | null = null
  const adapter = getGlobalAdapter()

  switch (scheme) {
    case SigningScheme.EIP712:
      //@ts-expect-error signer type is unknown
      if (owner?.signTypedData) {
        //@ts-expect-error signer type is unknown
        signature = await owner.signTypedData(domain, types, data)
        break
      }
      //@ts-expect-error signer type is unknown
      if (owner?._signTypedData) {
        //@ts-expect-error signer type is unknown
        signature = await owner._signTypedData(domain, types, data)
        break
      }
      break
    case SigningScheme.ETHSIGN:
      //@ts-expect-error signer type is unknown
      signature = await owner.signMessage(adapter.utils.arrayify(adapter.utils.hashTypedData(domain, types, data)))
      break
    default:
      throw new Error('invalid signing scheme')
  }

  // Passing the signature through split/join to normalize the `v` byte.
  // Some wallets do not pad it with `27`, which causes a signature failure
  // `splitSignature` pads it if needed, and `joinSignature` simply puts it back together
  return adapter.utils.joinSignature(adapter.utils.splitSignature(signature))
}

/**
 * Returns the signature for the specified order with the signing scheme encoded
 * into the signature.
 *
 * @param domain The domain to sign the order for. This is used by the smart
 * contract to ensure orders can't be replayed across different applications,
 * but also different deployments (as the contract chain ID and address are
 * mixed into to the domain value).
 * @param order The order to sign.
 * @param owner The owner for the order used to sign.
 * @param scheme The signing scheme to use. See {@link SigningScheme} for more
 * details.
 * @return Encoded signature including signing scheme for the order.
 */
export async function signOrder(
  domain: TypedDataDomain,
  order: Order,
  owner: Signer,
  scheme: EcdsaSigningScheme,
): Promise<EcdsaSignature> {
  return {
    scheme,
    data: await ecdsaSignTypedData(scheme, owner, domain, { Order: ORDER_TYPE_FIELDS }, normalizeOrder(order)),
  }
}

/**
 * Encodes the necessary data required for the Gnosis Protocol contracts to
 * verify an EIP-1271 signature.
 *
 * @param signature The EIP-1271 signature data to encode.
 */
export function encodeEip1271SignatureData({ verifier, signature }: Eip1271SignatureData): string {
  return getGlobalAdapter().utils.solidityPack(['address', 'bytes'], [verifier, signature])
}

/**
 * Decodes a GPv2 EIP-1271-type signature into the actual EIP-1271 signature
 * and the verifier contract.
 *
 * @param signature The EIP-1271 signature data to decode.
 * @returns decodedSignature The decoded signature object, composed of an
 * EIP-1271 signature and a verifier.
 */
export function decodeEip1271SignatureData(signature: Bytes): Eip1271SignatureData {
  const adapter = getGlobalAdapter()
  //@ts-expect-error: bytes type is unknown
  const arrayifiedSignature = adapter.utils.arrayify(signature)
  const verifier = adapter.utils.getChecksumAddress(adapter.utils.hexlify(arrayifiedSignature.slice(0, 20)))
  return {
    verifier,
    signature: arrayifiedSignature.slice(20),
  }
}
