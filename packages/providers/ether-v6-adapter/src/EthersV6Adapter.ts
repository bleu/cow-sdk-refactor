import {
  Provider,
  Signer,
  Contract,
  VoidSigner,
  JsonRpcSigner,
  Wallet,
  Interface,
  TypedDataField,
  BytesLike,
  BigNumberish,
  ZeroAddress,
} from 'ethers'
import {
  AbstractProviderAdapter,
  TransactionParams,
  TransactionResponse,
  TransactionReceipt,
  AdapterTypes,
} from '@cowprotocol/sdk-common'

import { TypedDataDomain } from 'ethers'

type Abi = ConstructorParameters<typeof Interface>[0]

interface EthersV6Types extends AdapterTypes {
  Abi: Abi
  Address: string
  Bytes: BytesLike
  BigIntish: BigNumberish
  ContractInterface: Interface
  Provider: Provider
  Signer: Signer
  TypedDataDomain: TypedDataDomain
  TypedDataTypes: Record<string, TypedDataField[]>
}
import { EthersV6Utils } from './EthersV6Utils'
import { EthersV6SignerAdapter } from './EthersV6SignerAdapter'

export class EthersV6Adapter extends AbstractProviderAdapter<EthersV6Types> {
  declare protected _type?: EthersV6Types

  private provider: Provider
  private signer: Signer
  public Signer = EthersV6SignerAdapter
  public utils: EthersV6Utils

  constructor(providerOrSigner: Provider | Signer) {
    super()
    this.ZERO_ADDRESS = ZeroAddress
    if (
      providerOrSigner instanceof JsonRpcSigner ||
      providerOrSigner instanceof VoidSigner ||
      providerOrSigner instanceof Wallet
    ) {
      this.signer = providerOrSigner
      this.provider = this.signer.provider as Provider //Possible null - check later
      if (!this.provider) {
        throw new Error('Signer must be connected to a provider')
      }
    } else {
      this.provider = providerOrSigner as Provider
      this.signer = new VoidSigner('0x0000000000000000000000000000000000000000', this.provider)
    }

    this.utils = new EthersV6Utils()
  }

  async getChainId(): Promise<number> {
    const network = await this.provider.getNetwork()
    return Number(network.chainId)
  }

  async getAddress(): Promise<string> {
    return this.signer.getAddress()
  }

  async sendTransaction(txParams: TransactionParams): Promise<TransactionResponse> {
    const tx = await this.signer.sendTransaction({
      to: txParams.to,
      from: txParams.from,
      data: txParams.data,
      value: txParams.value ? txParams.value.toString() : undefined,
      gasLimit: txParams.gasLimit ? txParams.gasLimit.toString() : undefined,
      gasPrice: txParams.gasPrice ? txParams.gasPrice.toString() : undefined,
      maxFeePerGas: txParams.maxFeePerGas ? txParams.maxFeePerGas.toString() : undefined,
      maxPriorityFeePerGas: txParams.maxPriorityFeePerGas ? txParams.maxPriorityFeePerGas.toString() : undefined,
      nonce: txParams.nonce,
    })

    return {
      hash: tx.hash,
      wait: async (confirmations = 1): Promise<TransactionReceipt> => {
        const receipt = await tx.wait(confirmations)
        if (!receipt) {
          throw new Error('Transaction receipt not available')
        }
        return {
          transactionHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          blockHash: receipt.blockHash,
          status: receipt.status ?? undefined,
          gasUsed: receipt.gasUsed,
          logs: [...receipt.logs],
        }
      },
    }
  }

  async estimateGas(txParams: TransactionParams): Promise<bigint> {
    return this.provider.estimateGas({
      to: txParams.to,
      from: txParams.from,
      data: txParams.data,
      value: txParams.value ? txParams.value.toString() : undefined,
    })
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    return this.signer.signMessage(message)
  }

  async signTypedData(
    domain: TypedDataDomain,
    types: Record<string, TypedDataField[]>,
    value: Record<string, unknown>,
  ): Promise<string> {
    return this.signer.signTypedData(domain, types, value)
  }

  async call(txParams: TransactionParams): Promise<string> {
    return this.provider.call({
      to: txParams.to,
      from: txParams.from,
      data: txParams.data,
      value: txParams.value ? txParams.value.toString() : undefined,
    })
  }

  async getCode(address: string): Promise<string> {
    return this.provider.getCode(address)
  }

  async getBalance(address: string): Promise<bigint> {
    return this.provider.getBalance(address)
  }

  async getTransactionCount(address: string): Promise<number> {
    return this.provider.getTransactionCount(address)
  }

  getContract(address: string, abi: Abi): Contract {
    return new Contract(address, abi, this.signer)
  }

  async getStorageAt(address: string, slot: BigNumberish): Promise<BytesLike> {
    return this.provider.getStorage(address, slot)
  }
}
