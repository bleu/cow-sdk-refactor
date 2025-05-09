import { BigNumberish, BytesLike, ethers } from 'ethers'
import type { TypedDataDomain, TypedDataField, TypedDataSigner } from '@ethersproject/abstract-signer'
import { AbstractProviderAdapter, AdapterTypes, TransactionParams, TransactionResponse } from '@cowprotocol/common'
import { DeploymentArguments } from '@cowprotocol/contracts-ts'

type Abi = ConstructorParameters<typeof ethers.utils.Interface>[0]
type Interface = ethers.utils.Interface

interface EthersV5Types extends AdapterTypes {
  Abi: Abi
  Address: string
  Bytes: BytesLike
  BigIntish: BigNumberish
  ContractInterface: Interface
  TypedDataDomain: TypedDataDomain
  TypedDataTypes: Record<string, TypedDataField[]>
}

export class EthersV5Adapter extends AbstractProviderAdapter<EthersV5Types> {
  declare protected _type?: EthersV5Types

  private provider: ethers.providers.Provider
  private signer: ethers.Signer & TypedDataSigner

  constructor(providerOrSigner: ethers.providers.Provider | ethers.Signer) {
    super()
    this.ZERO_ADDRESS = ethers.constants.AddressZero
    if (ethers.Signer.isSigner(providerOrSigner)) {
      this.signer = providerOrSigner as ethers.Signer & TypedDataSigner
      this.provider = providerOrSigner.provider as ethers.providers.Provider
      if (!this.provider) {
        throw new Error('Signer must be connected to a provider')
      }
    } else {
      this.provider = providerOrSigner
      this.signer = new ethers.VoidSigner(
        '0x0000000000000000000000000000000000000000',
        this.provider,
      ) as ethers.Signer & TypedDataSigner
    }
  }

  async getChainId(): Promise<number> {
    return (await this.provider.getNetwork()).chainId
  }

  async getAddress(): Promise<string> {
    return this.signer.getAddress()
  }

  async sendTransaction(txParams: TransactionParams): Promise<TransactionResponse> {
    const tx = await this.signer.sendTransaction({
      to: txParams.to,
      from: txParams.from,
      data: txParams.data,
      value: txParams.value ? ethers.BigNumber.from(txParams.value.toString()) : undefined,
      gasLimit: txParams.gasLimit ? ethers.BigNumber.from(txParams.gasLimit.toString()) : undefined,
      gasPrice: txParams.gasPrice ? ethers.BigNumber.from(txParams.gasPrice.toString()) : undefined,
      maxFeePerGas: txParams.maxFeePerGas ? ethers.BigNumber.from(txParams.maxFeePerGas.toString()) : undefined,
      maxPriorityFeePerGas: txParams.maxPriorityFeePerGas
        ? ethers.BigNumber.from(txParams.maxPriorityFeePerGas.toString())
        : undefined,
      nonce: txParams.nonce,
    })

    return {
      hash: tx.hash,
      wait: async (confirmations = 1) => {
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

  async estimateGas(txParams: TransactionParams): Promise<bigint> {
    const estimate = await this.provider.estimateGas({
      to: txParams.to,
      from: txParams.from,
      data: txParams.data,
      value: txParams.value ? ethers.BigNumber.from(txParams.value.toString()) : undefined,
    })

    return BigInt(estimate.toString())
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    return this.signer.signMessage(message)
  }

  async signTypedData(
    domain: TypedDataDomain,
    types: Record<string, TypedDataField[]>,
    value: Record<string, unknown>,
  ): Promise<string> {
    return this.signer._signTypedData(domain, types, value)
  }

  async call(txParams: TransactionParams): Promise<string> {
    return this.provider.call({
      to: txParams.to,
      from: txParams.from,
      data: txParams.data,
      value: txParams.value ? ethers.BigNumber.from(txParams.value.toString()) : undefined,
    })
  }

  async getCode(address: string): Promise<string> {
    return this.provider.getCode(address)
  }

  async getBalance(address: string): Promise<bigint> {
    const balance = await this.provider.getBalance(address)
    return BigInt(balance.toString())
  }

  async getTransactionCount(address: string): Promise<number> {
    return this.provider.getTransactionCount(address)
  }

  getContract(address: string, abi: Abi): unknown {
    return new ethers.Contract(address, abi, this.signer)
  }

  createInterface(abi: Abi): ethers.utils.Interface {
    return new ethers.utils.Interface(abi)
  }

  getCreate2Address(from: string, salt: BytesLike, initCodeHash: BytesLike): string {
    return ethers.utils.getCreate2Address(from, salt, initCodeHash)
  }

  hexConcat(items: ReadonlyArray<BytesLike>): string {
    return ethers.utils.hexConcat(items)
  }

  formatBytes32String(text: string): string {
    return ethers.utils.formatBytes32String(text)
  }

  encodeDeploy<C>(encodeDeployArgs: DeploymentArguments<C>, abi: Abi) {
    const contractInterface = new ethers.utils.Interface(abi)
    return contractInterface.encodeDeploy(encodeDeployArgs)
  }

  keccak256(data: BytesLike) {
    return ethers.utils.keccak256(data)
  }

  hexZeroPad(value: BytesLike, length: number): string {
    return ethers.utils.hexZeroPad(value, length)
  }

  arrayify(hexString: string): Uint8Array {
    return ethers.utils.arrayify(hexString)
  }

  hexlify(value: BytesLike): string {
    return ethers.utils.hexlify(value)
  }

  // eslint-disable-next-line
  solidityPack(types: string[], values: any[]): string {
    return ethers.utils.solidityPack(types, values)
  }

  hashTypedData(
    domain: TypedDataDomain,
    types: Record<string, TypedDataField[]>,
    data: Record<string, unknown>,
  ): string {
    return ethers.utils._TypedDataEncoder.hash(domain, types, data)
  }

  getChecksumAddress(address: string): string {
    return ethers.utils.getAddress(address)
  }
}
