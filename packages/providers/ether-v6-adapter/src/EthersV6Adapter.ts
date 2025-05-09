import {
  Provider,
  Signer,
  Contract,
  VoidSigner,
  JsonRpcSigner,
  Wallet,
  Interface,
  TypedDataField,
  AbiCoder,
  getCreate2Address,
  concat,
  BytesLike,
  encodeBytes32String,
  toUtf8Bytes,
  keccak256,
  BigNumberish,
} from 'ethers'
import {
  AbstractProviderAdapter,
  TransactionParams,
  TransactionResponse,
  TransactionReceipt,
  AdapterTypes,
} from '@cowprotocol/common'
import { TypedDataDomain } from 'ethers'
import { DeploymentArguments } from '@cowprotocol/contracts-ts'

type Abi = ConstructorParameters<typeof Interface>[0]

interface EthersV6Types extends AdapterTypes {
  Abi: Abi
  Bytes: BytesLike
  BigIntish: BigNumberish
  ContractInterface: Interface
  TypedDataDomain: TypedDataDomain
}

export class EthersV6Adapter extends AbstractProviderAdapter<EthersV6Types> {
  declare protected _type?: EthersV6Types

  private provider: Provider
  private signer: Signer

  constructor(providerOrSigner: Provider | Signer) {
    super()
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

  encodeDeploy<C>(encodeDeployArgs: DeploymentArguments<C>, abi: Abi): string {
    const abiCoder = new AbiCoder()
    const contractInterface = new Interface(abi)

    // Get the constructor fragment
    const constructorFragment = contractInterface.getFunction('constructor')

    if (!constructorFragment) {
      // No constructor parameters, return empty string
      return '0x'
    }

    // Encode the constructor parameters
    return abiCoder.encode(constructorFragment.inputs, encodeDeployArgs as readonly unknown[])
  }

  getCreate2Address(from: string, salt: BytesLike, initCodeHash: BytesLike): string {
    // Convert BytesLike to ethers BytesLike if necessary
    const ethersSalt = this.toEthersBytesLike(salt)
    const ethersInitCodeHash = this.toEthersBytesLike(initCodeHash)

    // Use ethers getCreate2Address
    return getCreate2Address(from, ethersSalt, ethersInitCodeHash)
  }

  hexConcat(items: ReadonlyArray<BytesLike>): string {
    // Convert each BytesLike to ethers BytesLike
    const ethersItems = items.map((item) => this.toEthersBytesLike(item))

    // Use ethers concat
    return concat(ethersItems)
  }

  formatBytes32String(text: string): string {
    return encodeBytes32String(text)
  }

  keccak256(data: BytesLike): string {
    return keccak256(this.toEthersBytesLike(data))
  }

  // Helper method to convert our BytesLike to ethers BytesLike
  private toEthersBytesLike(data: BytesLike): BytesLike {
    if (typeof data === 'string') {
      if (data.startsWith('0x')) {
        return data
      }
      // Convert string to bytes
      return toUtf8Bytes(data)
    } else if (data instanceof Uint8Array) {
      return data
    } else {
      throw new Error('Unsupported data type for conversion to BytesLike')
    }
  }
}
