import { Provider, Signer, Contract, VoidSigner, JsonRpcSigner, Wallet, Interface, TypedDataField } from 'ethers'
import {
  AbstractProviderAdapter,
  TransactionParams,
  TransactionResponse,
  TransactionReceipt,
} from '@cowprotocol/common'

type Abi = ConstructorParameters<typeof Interface>[0]
import { TypedDataDomain } from 'ethers'
import { EthersV6Utils } from './EthersV6Utils'

export class EthersV6Adapter implements AbstractProviderAdapter {
  private provider: Provider
  private signer: Signer
  public utils: EthersV6Utils

  constructor(providerOrSigner: Provider | Signer) {
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
}
