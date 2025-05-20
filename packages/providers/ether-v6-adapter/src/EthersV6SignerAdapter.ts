import { Log, Signer, TypedDataDomain, TypedDataField } from 'ethers'
import { AbstractSigner, TransactionParams, TransactionResponse } from '@cowprotocol/common'

export class EthersV6SignerAdapter extends AbstractSigner {
  private _signer: Signer

  constructor(signer: Signer) {
    super()
    this._signer = signer
  }

  async getAddress(): Promise<string> {
    return await this._signer.getAddress()
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    return await this._signer.signMessage(message)
  }

  async signTransaction(txParams: TransactionParams): Promise<string> {
    return await this._signer.signTransaction(this._formatTxParams(txParams))
  }

  async signTypedData(
    domain: TypedDataDomain,
    types: Record<string, TypedDataField[]>,
    value: Record<string, unknown>,
  ): Promise<string> {
    return await this._signer.signTypedData(domain, types, value)
  }

  async sendTransaction(txParams: TransactionParams): Promise<TransactionResponse> {
    const tx = await this._signer.sendTransaction(this._formatTxParams(txParams))
    return {
      hash: tx.hash,
      wait: async (confirmations?: number) => {
        if (confirmations === null) throw new Error('unexpected')
        const receipt = await tx.wait(confirmations)
        if (!receipt) {
          throw new Error('Transaction failed')
        }
        return {
          transactionHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          blockHash: receipt.blockHash || '',
          status: receipt.status || 0,
          gasUsed: receipt.gasUsed,
          logs: receipt.logs as Log[],
        }
      },
    }
  }

  private _formatTxParams(txParams: TransactionParams) {
    // No need to convert bigint in ethers v6, as it's natively supported
    return { ...txParams }
  }
}
