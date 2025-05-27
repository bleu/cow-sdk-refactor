import { Signer, BigNumber, TypedDataDomain, TypedDataField } from 'ethers'
import { AbstractSigner, TransactionParams, TransactionResponse } from '@cowprotocol/sdk-common'
import { TypedDataSigner } from '@ethersproject/abstract-signer'

export class EthersV5SignerAdapter extends AbstractSigner {
  private _signer: Signer & TypedDataSigner

  constructor(signer: Signer & TypedDataSigner) {
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
    // Ethers v5 doesn't expose a direct signTransaction method on the Signer class
    // This is a workaround using a private method, but might not work for all signers
    if ('_signTransaction' in this._signer) {
      return await this._signer.signTransaction(this._formatTxParams(txParams))
    }
    throw new Error('signTransaction not supported by this ethers v5 signer')
  }

  async signTypedData(
    domain: TypedDataDomain,
    types: Record<string, TypedDataField[]>,
    value: Record<string, unknown>,
  ): Promise<string> {
    return await this._signer._signTypedData(domain, types, value)
  }

  async sendTransaction(txParams: TransactionParams): Promise<TransactionResponse> {
    const tx = await this._signer.sendTransaction(this._formatTxParams(txParams))
    return {
      hash: tx.hash,
      wait: async (confirmations?: number) => {
        const receipt = await tx.wait(confirmations)
        return {
          transactionHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber,
          blockHash: receipt.blockHash,
          status: receipt.status,
          gasUsed: BigInt(receipt.gasUsed.toString()),
          logs: receipt.logs,
        }
      },
    }
  }

  private _formatTxParams(txParams: TransactionParams) {
    // Convert bigint values to BigNumber for ethers v5
    // eslint-disable-next-line
    const formatted: any = { ...txParams }

    if (typeof formatted.value === 'bigint') {
      formatted.value = BigNumber.from(formatted.value.toString())
    }

    if (typeof formatted.gasLimit === 'bigint') {
      formatted.gasLimit = BigNumber.from(formatted.gasLimit.toString())
    }

    if (typeof formatted.gasPrice === 'bigint') {
      formatted.gasPrice = BigNumber.from(formatted.gasPrice.toString())
    }

    if (typeof formatted.maxFeePerGas === 'bigint') {
      formatted.maxFeePerGas = BigNumber.from(formatted.maxFeePerGas.toString())
    }

    if (typeof formatted.maxPriorityFeePerGas === 'bigint') {
      formatted.maxPriorityFeePerGas = BigNumber.from(formatted.maxPriorityFeePerGas.toString())
    }

    return formatted
  }
}
