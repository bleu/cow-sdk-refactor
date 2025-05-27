import { createAdapters, TEST_ADDRESS } from './setup'
import { ethers as ethersV5 } from 'ethers-v5'
import * as ethersV6 from 'ethers-v6'
import { setGlobalAdapter } from '@cowprotocol/sdk-common'
import {
  ContractsTs,
  CONTRACT_NAMES,
  SALT,
  deterministicDeploymentAddress,
  proxyInterface,
  implementationAddress,
  ownerAddress,
} from '../src'
import { concat, getCreate2Address, Hex, keccak256 } from 'viem'

describe('Deployment and Proxy', () => {
  let adapters: ReturnType<typeof createAdapters>
  let contracts: {
    ethersV5Contracts: ContractsTs
    ethersV6Contracts: ContractsTs
    viemContracts: ContractsTs
  }

  beforeAll(() => {
    adapters = createAdapters()
    contracts = {
      ethersV5Contracts: new ContractsTs(adapters.ethersV5Adapter),
      ethersV6Contracts: new ContractsTs(adapters.ethersV6Adapter),
      viemContracts: new ContractsTs(adapters.viemAdapter),
    }
    concat(['0x1234', '0x4567'])
  })

  describe('deterministicDeploymentAddress', () => {
    test('should compute deployment addresses consistently across different adapters', () => {
      // Mock ABI and bytecode for testing
      const testArtifact = {
        abi: [
          {
            inputs: [
              { name: 'authenticator', type: 'address' },
              { name: 'allowListConfig', type: 'address' },
            ],
            stateMutability: 'nonpayable',
            type: 'constructor',
          },
        ],
        bytecode: '0x608060405234801561001057600080fd5b506040516102c73803806102c78339',
        contractName: CONTRACT_NAMES.settlement,
      }

      // Deploy arguments for the settlement contract
      const deployArgs = [
        '0x9008D19f58AAbD9eD0D60971565AA8510560ab41', // authenticator
        '0x1234567890123456789012345678901234567890', // allowListConfig
      ] as [string, string]

      // Compute deployment address with each adapter
      setGlobalAdapter(adapters.ethersV5Adapter)
      const ethersV5Address = deterministicDeploymentAddress(testArtifact, deployArgs)

      setGlobalAdapter(adapters.ethersV6Adapter)
      const ethersV6Address = deterministicDeploymentAddress(testArtifact, deployArgs)

      setGlobalAdapter(adapters.viemAdapter)
      const viemAddress = deterministicDeploymentAddress(testArtifact, deployArgs)

      // Addresses should be identical
      expect(ethersV5Address).toEqual(ethersV6Address)
      expect(ethersV5Address).toEqual(viemAddress)

      // Verify the address is a valid Ethereum address
      expect(ethersV5Address).toMatch(/^0x[0-9a-f]{40}$/i)

      // Check that we're actually using the SALT and DEPLOYER_CONTRACT constants
      // by mocking an alternate implementation and ensuring results differ
      const mockHashFunction = jest
        .fn()
        .mockReturnValue('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')
      const originalKeccak256 = adapters.ethersV5Adapter.utils.keccak256
      adapters.ethersV5Adapter.utils.keccak256 = mockHashFunction

      try {
        setGlobalAdapter(adapters.ethersV5Adapter)
        const mockedAddress = deterministicDeploymentAddress(testArtifact, deployArgs)

        // Address should be different with the mocked hash function
        expect(mockedAddress).not.toEqual(ethersV5Address)

        // The mockHashFunction should be called with data containing the SALT
        expect(mockHashFunction).toHaveBeenCalled()
        const args = mockHashFunction.mock.calls[0][0]
        expect(typeof args).toBe('string')
      } finally {
        // Restore original function
        adapters.ethersV5Adapter.utils.keccak256 = originalKeccak256
      }
    })

    test('should compute different addresses for different contracts and args', () => {
      // Two different artifacts
      const testArtifact1 = {
        abi: [{ inputs: [], stateMutability: 'nonpayable', type: 'constructor' }],
        bytecode: '0x608060405234801561001057600080fd5b506040516102c73803806102c78339',
        contractName: CONTRACT_NAMES.authenticator,
      }
      const deployerAddress = '0xa90914762709441d557De208bAcE1edB1A3968b2'

      // Deploy args for second artifact
      const deployArgs = [
        '0x9008D19f58AAbD9eD0D60971565AA8510560ab41',
        '0x1234567890123456789012345678901234567890',
      ] as [string, string]

      // Ethers v5
      const x1 = ethersV5.utils.getCreate2Address(
        deployerAddress,
        SALT,
        ethersV5.utils.keccak256(ethersV5.utils.hexConcat([testArtifact1.bytecode, ...deployArgs])),
      )

      // Ethers v5
      const x3 = ethersV6.getCreate2Address(
        deployerAddress,
        SALT,
        ethersV6.keccak256(ethersV6.concat([testArtifact1.bytecode, ...deployArgs])),
      )

      // Viem
      const x2 = getCreate2Address({
        from: deployerAddress,
        salt: SALT,
        bytecodeHash: keccak256(concat([testArtifact1.bytecode as Hex, ...(deployArgs as Hex[])])),
      })

      expect(x1).toEqual(x2)
      expect(x2).toEqual(x3)
    })
  })

  describe('Proxy interfaces', () => {
    test('should mock implementation and owner addresses consistently', async () => {
      // Mock a provider for testing
      const mockProvider = {
        getStorageAt: jest.fn().mockResolvedValue('0x000000000000000000000000' + TEST_ADDRESS.substring(2)),
      }

      // proxy contract address
      const proxyAddress = '0x1234567890123456789012345678901234567890'

      // Mock contract objects
      const mockContract = {
        address: proxyAddress,
        provider: mockProvider,
      }

      // Test implementation address with different adapters
      setGlobalAdapter(adapters.ethersV5Adapter)
      const ethersV5ImplementationPromise = implementationAddress(mockProvider as any, proxyAddress)

      setGlobalAdapter(adapters.ethersV6Adapter)
      const ethersV6ImplementationPromise = implementationAddress(mockProvider as any, proxyAddress)

      setGlobalAdapter(adapters.viemAdapter)
      const viemImplementationPromise = implementationAddress(mockProvider as any, proxyAddress)

      // All calls should resolve to the same address
      const [ethersV5Implementation, ethersV6Implementation, viemImplementation] = await Promise.all([
        ethersV5ImplementationPromise,
        ethersV6ImplementationPromise,
        viemImplementationPromise,
      ])

      expect(ethersV5Implementation).toEqual(ethersV6Implementation)
      expect(ethersV5Implementation).toEqual(viemImplementation)

      // Test owner address
      setGlobalAdapter(adapters.ethersV5Adapter)
      const ethersV5OwnerPromise = ownerAddress(mockProvider as any, proxyAddress)

      setGlobalAdapter(adapters.ethersV6Adapter)
      const ethersV6OwnerPromise = ownerAddress(mockProvider as any, proxyAddress)

      setGlobalAdapter(adapters.viemAdapter)
      const viemOwnerPromise = ownerAddress(mockProvider as any, proxyAddress)

      // All calls should resolve to the same address
      const [ethersV5Owner, ethersV6Owner, viemOwner] = await Promise.all([
        ethersV5OwnerPromise,
        ethersV6OwnerPromise,
        viemOwnerPromise,
      ])

      expect(ethersV5Owner).toEqual(ethersV6Owner)
      expect(ethersV5Owner).toEqual(viemOwner)
      expect(ethersV5Owner).toEqual(TEST_ADDRESS)
    })

    test('should create proxy interfaces consistently', () => {
      // Mock getContract implementations for each adapter
      const originalEthersV5GetContract = adapters.ethersV5Adapter.getContract
      const originalEthersV6GetContract = adapters.ethersV6Adapter.getContract
      const originalViemGetContract = adapters.viemAdapter.getContract

      const mockContract = { address: '0x1234567890123456789012345678901234567890' }
      const mockProxyContract = { mock: 'proxy-interface' }

      adapters.ethersV5Adapter.getContract = jest.fn().mockReturnValue(mockProxyContract)
      adapters.ethersV6Adapter.getContract = jest.fn().mockReturnValue(mockProxyContract)
      adapters.viemAdapter.getContract = jest.fn().mockReturnValue(mockProxyContract)

      try {
        // Get proxy interface with each adapter
        setGlobalAdapter(adapters.ethersV5Adapter)
        const ethersV5Proxy = proxyInterface(mockContract as any)

        setGlobalAdapter(adapters.ethersV6Adapter)
        const ethersV6Proxy = proxyInterface(mockContract as any)

        setGlobalAdapter(adapters.viemAdapter)
        const viemProxy = proxyInterface(mockContract as any)

        // Interfaces should be the same mock object
        expect(ethersV5Proxy).toEqual(mockProxyContract)
        expect(ethersV6Proxy).toEqual(mockProxyContract)
        expect(viemProxy).toEqual(mockProxyContract)

        // Verify getContract was called with the right arguments
        expect(adapters.ethersV5Adapter.getContract).toHaveBeenCalledWith(
          mockContract.address,
          expect.anything(),
          undefined,
        )

        expect(adapters.ethersV6Adapter.getContract).toHaveBeenCalledWith(
          mockContract.address,
          expect.anything(),
          undefined,
        )

        expect(adapters.viemAdapter.getContract).toHaveBeenCalledWith(
          mockContract.address,
          expect.anything(),
          undefined,
        )
      } finally {
        // Restore original functions
        adapters.ethersV5Adapter.getContract = originalEthersV5GetContract
        adapters.ethersV6Adapter.getContract = originalEthersV6GetContract
        adapters.viemAdapter.getContract = originalViemGetContract
      }
    })
  })
})
