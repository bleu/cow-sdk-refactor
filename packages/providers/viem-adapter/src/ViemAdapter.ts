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
  TypedDataDomain,
  Abi,
} from 'viem'

import {
  AbstractProviderAdapter,
  TransactionParams,
  TransactionResponse,
  TransactionReceipt,
} from '@cowprotocol/common'
import { SignTypedDataParameters } from 'viem/accounts'

export class ViemAdapter implements AbstractProviderAdapter {
  private publicClient: PublicClient
  private walletClient: WalletClient
  private account?: Account

  constructor(chain: Chain, transport: Transport = http(), account?: Account | `0x${string}`) {
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
  }

  async getChainId(): Promise<number> {
    return this.publicClient.chain?.id ?? 0 //TODO - verify if this is correct
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
        } as unknown as TransactionReceipt //TODO - review this
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
    value: SignTypedDataParameters<Record<string, unknown>>,
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
    return code ?? '0x' //TODO - review this
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

  getContract(address: string, abi: Abi): unknown {
    return getViemContract({
      address: address as `0x${string}`,
      abi,
      client: this.publicClient,
    })
  }
}
