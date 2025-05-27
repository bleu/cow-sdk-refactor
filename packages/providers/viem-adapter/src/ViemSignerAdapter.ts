import { Account, WalletClient, PublicClient, Address, TypedDataDomain, TypedDataParameter } from 'viem'
import { AbstractSigner, TransactionParams, TransactionResponse } from '@cowprotocol/sdk-common'

export class ViemSignerAdapter extends AbstractSigner {
  private _client: WalletClient
  private _account: Account
  private _publicClient?: PublicClient

  constructor(client: WalletClient) {
    super()
    this._client = client
    if (!client?.account) throw new Error('Signer is missing account')
    this._account = client.account
  }

  async getAddress(): Promise<string> {
    return this._account.address
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    if (typeof message === 'string') {
      return await this._client.signMessage({
        account: this._account,
        message,
      })
    } else {
      return await this._client.signMessage({
        account: this._account,
        message: { raw: message },
      })
    }
  }

  async signTransaction(txParams: TransactionParams): Promise<string> {
    const formattedTx = this._formatTxParams(txParams)

    return await this._client.signTransaction({
      account: this._account,
      ...formattedTx,
    })
  }

  async signTypedData(
    domain: TypedDataDomain,
    types: Record<string, TypedDataParameter>,
    value: Record<string, unknown>,
  ): Promise<string> {
    const primaryType = Object.keys(types)[0]

    if (!primaryType) throw new Error('Missing primary type')

    return await this._client.signTypedData({
      account: this._account,
      domain,
      types,
      primaryType, // Primary type is usually the first key in types
      message: value,
    })
  }

  async sendTransaction(txParams: TransactionParams): Promise<TransactionResponse> {
    const formattedTx = this._formatTxParams(txParams)

    const hash = await this._client.sendTransaction({
      account: this._account,
      ...formattedTx,
    })

    return {
      hash,
      wait: async (confirmations?: number) => {
        if (!this._publicClient) {
          throw new Error('Cannot wait for transaction without a public client')
        }

        const receipt = await this._publicClient.waitForTransactionReceipt({
          hash,
          confirmations,
        })

        return {
          transactionHash: receipt.transactionHash,
          blockNumber: Number(receipt.blockNumber),
          blockHash: receipt.blockHash,
          status: Number(receipt.status === 'success'),
          gasUsed: receipt.gasUsed,
          logs: receipt.logs,
        }
      },
    }
  }

  private _formatTxParams(txParams: TransactionParams) {
    // Convert to viem-specific format
    //eslint-disable-next-line
    const formatted: any = { ...txParams }

    // Convert string addresses to Address type
    if (formatted.to) {
      formatted.to = formatted.to as Address
    }

    if (formatted.from) {
      formatted.from = formatted.from as Address
    }

    // Ensure gas fields use the correct naming
    if (formatted.gasLimit !== undefined) {
      formatted.gas = formatted.gasLimit
      delete formatted.gasLimit
    }

    return formatted
  }
}
