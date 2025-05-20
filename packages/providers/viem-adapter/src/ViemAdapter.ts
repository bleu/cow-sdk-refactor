import {
  createPublicClient,
  createWalletClient,
  http,
  PublicClient,
  WalletClient,
  Account,
  Transport,
  Chain,
  getContract as getViemContract,
  Abi,
  Address,
  TypedDataDomain,
  GetContractReturnType,
  zeroAddress,
} from 'viem'

import {
  AdapterTypes,
  AbstractProviderAdapter,
  TransactionParams,
  TransactionResponse,
  TransactionReceipt,
} from '@cowprotocol/sdk-common'

interface ViemTypes extends AdapterTypes {
  Abi: Abi
  Address: Address
  Bytes: `0x${string}`
  BigIntish: bigint
  ContractInterface: unknown
  Provider: PublicClient
  Signer: WalletClient
  TypedDataDomain: TypedDataDomain
  TypedDataTypes: Record<string, unknown>
}
import { ViemUtils } from './ViemUtils'
import { ViemSignerAdapter } from './ViemSignerAdapter'

export class ViemAdapter extends AbstractProviderAdapter<ViemTypes> {
  declare protected _type?: ViemTypes
  private publicClient: PublicClient
  private walletClient: WalletClient
  private account?: Account
  public Signer = ViemSignerAdapter
  public utils: ViemUtils

  constructor(chain: Chain, transport: Transport = http(), account?: Account | `0x${string}`) {
    super()
    this.ZERO_ADDRESS = zeroAddress
    this.publicClient = createPublicClient({
      chain,
      transport,
    })

    this.walletClient = createWalletClient({
      chain,
      transport,
    })

    if (account) {
      this.account = typeof account === 'string' ? ({ address: account } as Account) : account
    }

    this.utils = new ViemUtils()
  }

  async getChainId(): Promise<number> {
    return this.publicClient.chain?.id ?? 0
  }

  async getAddress(): Promise<string> {
    if (!this.account) {
      throw new Error('No account provided')
    }
    return this.account.address
  }

  async sendTransaction(txParams: TransactionParams): Promise<TransactionResponse> {
    if (!this.account) {
      throw new Error('No account provided')
    }

    const hash = await this.walletClient.sendTransaction({
      account: this.account,
      chain: this.publicClient.chain,
      to: txParams.to as `0x${string}`,
      data: txParams.data as `0x${string}` | undefined,
      value: txParams.value ? BigInt(txParams.value.toString()) : undefined,
      gas: txParams.gasLimit ? BigInt(txParams.gasLimit.toString()) : undefined,
      maxFeePerGas: txParams.maxFeePerGas ? BigInt(txParams.maxFeePerGas.toString()) : undefined,
      maxPriorityFeePerGas: txParams.maxPriorityFeePerGas
        ? BigInt(txParams.maxPriorityFeePerGas.toString())
        : undefined,
      nonce: txParams.nonce,
    })

    return {
      hash,
      wait: async (confirmations?: number | undefined): Promise<TransactionReceipt> => {
        const receipt = await this.publicClient.waitForTransactionReceipt({
          hash,
          confirmations: confirmations ?? 1,
        })

        return {
          transactionHash: receipt.transactionHash,
          blockNumber: Number(receipt.blockNumber),
          blockHash: receipt.blockHash,
          status: receipt.status === 'success' ? 1 : 0,
          gasUsed: Number(receipt.gasUsed),
          logs: receipt.logs,
          contractAddress: receipt.contractAddress,
          cumulativeGasUsed: Number(receipt.cumulativeGasUsed),
          effectiveGasPrice: Number(receipt.effectiveGasPrice),
          from: receipt.from,
          to: receipt.to,
          type: receipt.type,
          transactionIndex: receipt.transactionIndex,
          logsBloom: receipt.logsBloom,
        } as unknown as TransactionReceipt
      },
    }
  }

  async estimateGas(txParams: TransactionParams): Promise<bigint> {
    return this.publicClient.estimateGas({
      account: this.account,
      to: txParams.to as `0x${string}`,
      data: txParams.data as `0x${string}` | undefined,
      value: txParams.value ? BigInt(txParams.value.toString()) : undefined,
    })
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    if (!this.account) {
      throw new Error('No account provided')
    }

    const messageToSign = typeof message === 'string' ? message : new TextDecoder().decode(message)

    return this.walletClient.signMessage({
      account: this.account,
      message: messageToSign,
    })
  }

  async signTypedData(
    domain: TypedDataDomain,
    types: Record<string, unknown>,
    value: Record<string, unknown>,
  ): Promise<string> {
    if (!this.account) {
      throw new Error('No account provided')
    }

    const primaryType = Object.keys(types)[0]
    if (!primaryType) {
      throw new Error('No primary type found in types')
    }

    return this.walletClient.signTypedData({
      account: this.account,
      domain,
      types,
      primaryType,
      message: value,
    })
  }

  async call(txParams: TransactionParams): Promise<string> {
    const result = await this.publicClient.call({
      account: this.account?.address,
      to: txParams.to as `0x${string}`,
      data: txParams.data as `0x${string}` | undefined,
      value: txParams.value ? BigInt(txParams.value.toString()) : undefined,
    })
    return result.toString()
  }

  async getCode(address: string): Promise<string> {
    const code = await this.publicClient.getCode({
      address: address as `0x${string}`,
    })
    return code ?? '0x'
  }

  async getBalance(address: string): Promise<bigint> {
    return this.publicClient.getBalance({
      address: address as `0x${string}`,
    })
  }

  async getTransactionCount(address: string): Promise<number> {
    const count = await this.publicClient.getTransactionCount({
      address: address as `0x${string}`,
    })
    return Number(count)
  }

  getContract(address: string, abi: Abi): GetContractReturnType {
    return getViemContract({
      address: address as `0x${string}`,
      abi,
      client: this.publicClient,
    })
  }

  async getStorageAt(address: Address, slot: `0x${string}`) {
    return this.publicClient.getStorageAt({
      address,
      slot,
    })
  }
}
