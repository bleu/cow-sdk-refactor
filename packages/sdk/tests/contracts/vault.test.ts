import { createAdapters } from '../setup'
import { setGlobalAdapter } from '@cowprotocol/common'
import { ContractsTs, getVaultInterface, grantRequiredRoles } from '@cowprotocol/sdk-contracts-ts'
import { ethers } from 'ethers-v5'

describe('Vault Functions for ethersV5', () => {
  let adapters: ReturnType<typeof createAdapters>
  let contracts: {
    ethersV5Contracts: ContractsTs
  }

  beforeAll(() => {
    adapters = createAdapters()
    setGlobalAdapter(adapters.ethersV5Adapter)
    contracts = {
      ethersV5Contracts: new ContractsTs(adapters.ethersV5Adapter),
    }
  })

  describe('getVaultInterface', () => {
    test('should return a proper interface with expected functions', () => {
      // Get interface with ethers v5 adapter
      const ethersV5Interface = getVaultInterface() as ethers.utils.Interface

      // Check for the expected functions
      const hasManageUserBalance =
        !!ethersV5Interface.functions['manageUserBalance((uint8,address,uint256,address,address)[])']
      const hasBatchSwap =
        !!ethersV5Interface.functions[
          'batchSwap(uint8,(bytes32,uint256,uint256,uint256,bytes)[],address[],(address,bool,address,bool),int256[],uint256)'
        ]

      expect(hasManageUserBalance).toBeTruthy()
      expect(hasBatchSwap).toBeTruthy()
    })
  })

  describe('grantRequiredRoles', () => {
    test('should call authorizer.grantRole for each Vault function', async () => {
      // Mock authorizer contract
      const mockGrant = jest.fn().mockResolvedValue({})
      const mockAuthorizer = {
        grantRole: mockGrant,
      }

      // Test parameters
      const vaultAddress = '0x9008D19f58AAbD9eD0D60971565AA8510560ab41'
      const vaultRelayerAddress = '0x1234567890123456789012345678901234567890'

      // Call grantRequiredRoles with ethers v5 adapter
      await grantRequiredRoles(mockAuthorizer as any, vaultAddress, vaultRelayerAddress)

      // Check that grantRole was called at least once
      expect(mockGrant).toHaveBeenCalled()

      // Get all the role hashes that were granted
      const roleHashes = new Set(mockGrant.mock.calls.map((call) => call[0]))

      // There should be at least 2 different role hashes (for manageUserBalance and batchSwap)
      expect(roleHashes.size).toBeGreaterThanOrEqual(2)

      // Each call should have the vault relayer address as the second argument
      for (const call of mockGrant.mock.calls) {
        expect(call[1]).toEqual(vaultRelayerAddress)
      }
    })
  })
})
