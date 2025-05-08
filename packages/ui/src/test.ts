import { JsonRpcProvider } from '@ethersproject/providers'
import { EthersV5Adapter } from '@cowprotocol/sdk-ethers-v5-adapter'
import { ContractsTs } from '@cowprotocol/contracts-ts'

const adapter = new EthersV5Adapter(new JsonRpcProvider())
const contracts = new ContractsTs(adapter)

export const x = contracts
