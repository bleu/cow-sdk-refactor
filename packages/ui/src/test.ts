import { ContractsTs } from '@cowprotocol/contracts-ts'

import { JsonRpcProvider } from '@ethersproject/providers'
import { EthersV5Adapter } from '@cowprotocol/sdk-ethers-v5-adapter'

import { http } from 'viem'
import { mainnet } from 'viem/chains'
import { ViemAdapter } from '@cowprotocol/sdk-viem-adapter'

const adapter = new EthersV5Adapter(new JsonRpcProvider())
const contracts = new ContractsTs(adapter)

const adapterViem = new ViemAdapter(mainnet, http())
const contractsViem = new ContractsTs(adapterViem)

// export const x = contracts.hashTypedData()

// export const y = contractsViem.hashTypedData()
