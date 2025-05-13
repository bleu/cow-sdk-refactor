import { AbstractProviderAdapter, AdapterTypes } from '@cowprotocol/common'
import { Order, ORDER_TYPE_FIELDS } from './order'
import { ContractsTs } from './ContractsTs'

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
  data: string
}

/**
 * EIP-1271 signature data.
 */
export interface Eip1271SignatureData<T extends AdapterTypes> {
  /**
   * The verifying contract address.
   */
  verifier: string
  /**
   * The arbitrary signature data used for verification.
   */
  signature: T['Bytes']
}

/**
 * EIP-1271 signature of an order.
 */
export interface Eip1271Signature<T extends AdapterTypes> {
  /**
   * The signing scheme used in the signature.
   */
  scheme: typeof SigningScheme.EIP1271
  /**
   * The signature data.
   */
  data: Eip1271SignatureData<T>
}

/**
 * Type for signature of an order.
 */
export type Signature<T extends AdapterTypes> = EcdsaSignature | Eip1271Signature<T> | PreSignSignature

/**
 * Signature data for a pre-signed order.
 */
interface PreSignSignature {
  /**
   * The signing scheme used in the signature.
   */
  scheme: typeof SigningScheme.PRESIGN
  /**
   * The address of the signer.
   */
  data: string
}

/**
 * Value returned by a call to `isValidSignature` if the signature was verified
 * successfully. The value is defined in the EIP-1271 standard as:
 * bytes4(keccak256("isValidSignature(bytes32,bytes)"))
 */
export class ContractsTs_Sign<T extends AdapterTypes = AdapterTypes> {
  public EIP1271_MAGICVALUE: T['Bytes']

  constructor(
    private adapter: AbstractProviderAdapter<T>,
    private contracts: ContractsTs,
  ) {
    this.adapter = adapter
    this.contracts = contracts
    this.EIP1271_MAGICVALUE = this.adapter.hexlify(
      this.adapter.hexDataSlice(this.adapter.id('isValidSignature(bytes32,bytes)'), 0, 4),
    )
  }

  /**
   * ECDSA signature scheme type
   */
  public get EcdsaSigningScheme() {
    return {
      EIP712: SigningScheme.EIP712,
      ETHSIGN: SigningScheme.ETHSIGN,
    } as const
  }

  private async ecdsaSignTypedData(
    scheme: (typeof this.EcdsaSigningScheme)[keyof typeof this.EcdsaSigningScheme],
    owner: T['Signer'],
    domain: T['TypedDataDomain'],
    types: T['TypedDataTypes'],
    data: Record<string, unknown>,
  ): Promise<string> {
    let signature: string | null = null

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
        throw new Error('owner is missing a signTypedData method')
      case SigningScheme.ETHSIGN:
        //@ts-expect-error signer type is unknown
        signature = await owner.signMessage(this.adapter.arrayify(this.adapter.hashTypedData(domain, types, data)))
        break
      default:
        throw new Error('invalid signing scheme')
    }

    // Passing the signature through split/join to normalize the `v` byte.
    // Some wallets do not pad it with `27`, which causes a signature failure
    // `splitSignature` pads it if needed, and `joinSignature` simply puts it back together
    return this.adapter.joinSignature(this.adapter.splitSignature(signature))
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
  public async signOrder(
    domain: T['TypedDataDomain'],
    order: Order<T>,
    owner: T['Signer'],
    scheme: (typeof this.EcdsaSigningScheme)[keyof typeof this.EcdsaSigningScheme],
  ): Promise<EcdsaSignature> {
    return {
      scheme,
      data: await this.ecdsaSignTypedData(
        scheme,
        owner,
        domain,
        { Order: ORDER_TYPE_FIELDS },
        this.contracts.normalizeOrder(order),
      ),
    }
  }

  /**
   * Encodes the necessary data required for the Gnosis Protocol contracts to
   * verify an EIP-1271 signature.
   *
   * @param signature The EIP-1271 signature data to encode.
   */
  public encodeEip1271SignatureData({ verifier, signature }: Eip1271SignatureData<T>): string {
    return this.adapter.solidityPack(['address', 'bytes'], [verifier, signature])
  }

  /**
   * Decodes a GPv2 EIP-1271-type signature into the actual EIP-1271 signature
   * and the verifier contract.
   *
   * @param signature The EIP-1271 signature data to decode.
   * @returns decodedSignature The decoded signature object, composed of an
   * EIP-1271 signature and a verifier.
   */
  public decodeEip1271SignatureData(signature: string): Eip1271SignatureData<T> {
    const arrayifiedSignature = this.adapter.arrayify(signature)
    const verifier = this.adapter.getChecksumAddress(this.adapter.hexlify(arrayifiedSignature.slice(0, 20)))
    return {
      verifier,
      signature: arrayifiedSignature.slice(20),
    }
  }
}
