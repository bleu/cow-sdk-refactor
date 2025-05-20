import { createAdapters, TEST_ADDRESS } from '../setup'
import { TypedDataDomain, setGlobalAdapter, getGlobalAdapter } from '@cowprotocol/common'
import {
  ContractsTs,
  Order,
  Signature,
  Swap,
  SwapEncoder,
  OrderKind,
  SigningScheme,
} from '@cowprotocol/sdk-contracts-ts'
import { EthersV5Types } from '@cowprotocol/sdk-ethers-v5-adapter'

describe('SwapEncoder', () => {
  let adapters: any
  let contracts: {
    ethersV5Contracts: ContractsTs
  }

  beforeAll(async () => {
    // Create adapters
    adapters = await createAdapters()

    // Explicitly set the global adapter
    setGlobalAdapter(adapters.ethersV5Adapter)
    console.log('here4')

    // Create contracts - this should also set the global adapter in its constructor
    contracts = {
      ethersV5Contracts: new ContractsTs<EthersV5Types>(adapters.ethersV5Adapter),
    }

    // Verify that the global adapter is set correctly
    try {
      const currentAdapter = getGlobalAdapter()
      console.log('Global adapter is properly configured')
    } catch (e) {
      console.error('Failed to verify global adapter:', e)
      // Re-set the adapter as a fallback
      setGlobalAdapter(adapters.ethersV5Adapter)
    }
  })

  // Close connections specifically for ethersV5 adapter
  afterAll(async () => {
    // For ethers v5
    try {
      const ethersV5Wallet = (adapters.ethersV5Adapter as any)._wallet || (adapters.ethersV5Adapter as any).wallet
      const ethersV5Provider = ethersV5Wallet?.provider

      if (ethersV5Provider) {
        // Try different ways to close the connection
        if (typeof ethersV5Provider.disconnect === 'function') {
          ethersV5Provider.disconnect()
        }
        if (typeof ethersV5Provider.destroy === 'function') {
          ethersV5Provider.destroy()
        }
        // Force the provider to remove all listeners
        if (typeof ethersV5Provider.removeAllListeners === 'function') {
          ethersV5Provider.removeAllListeners()
        }
      }
    } catch (e) {
      console.error('Error closing ethersV5 provider:', e)
    }

    // Give some time for connections to fully close
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }, 10000)

  describe('encodeSwap', () => {
    // Test data for swaps and orders
    const testDomain: TypedDataDomain = {
      name: 'Cow Protocol',
      version: '1',
      chainId: 1,
      verifyingContract: '0x9008D19f58AAbD9eD0D60971565AA8510560ab41', // Example address
    }

    const testSwap: Swap = {
      poolId: '0x0000000000000000000000000000000000000000000000000000000000000001',
      assetIn: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
      assetOut: '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
      amount: '1000000000000000000', // 1 WETH
      userData: '0x',
    }

    const testOrder: Order = {
      sellToken: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
      buyToken: '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
      sellAmount: '1000000000000000000', // 1 WETH
      buyAmount: '2000000000000000000000', // 2000 DAI
      validTo: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      appData: '0x0000000000000000000000000000000000000000000000000000000000000000',
      feeAmount: '5000000000000000', // 0.005 WETH
      kind: OrderKind.SELL,
      partiallyFillable: false,
    }

    const mockSignature: Signature = {
      scheme: SigningScheme.EIP712,
      data: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef00',
    }

    test('should encode swaps correctly with ethersV5 adapter', () => {
      // Make sure global adapter is set before encoding
      setGlobalAdapter(adapters.ethersV5Adapter)

      // Create SwapEncoder instance with ethersV5 adapter
      const encoder = new contracts.ethersV5Contracts.SwapEncoder(testDomain, adapters.ethersV5Adapter)

      // Encode the swap
      const encodedSwap = SwapEncoder.encodeSwap([testSwap], testOrder, mockSignature)

      // Validate the encoded swap structure
      expect(encodedSwap[0].length).toEqual(1) // Should have one swap

      // Check specific swap properties
      const encodedSwapDetails = encodedSwap[0][0]!
      expect(encodedSwapDetails.poolId).toEqual(testSwap.poolId)
      expect(encodedSwapDetails.assetInIndex).toBeDefined()
      expect(encodedSwapDetails.assetOutIndex).toBeDefined()
      expect(String(encodedSwapDetails.amount)).toEqual(testSwap.amount)
      expect(encodedSwapDetails.userData).toEqual(testSwap.userData)

      // Check tokens array
      expect(encodedSwap[1].length).toBeGreaterThan(0) // Should have tokens
    })

    test('should handle overloaded encodeSwap with execution parameters', () => {
      // Test with execution parameters
      const swapExecution = { limitAmount: '2000000000000000000000' } // 2000 DAI

      // Encode with execution parameters
      const encodedSwapWithExecution = SwapEncoder.encodeSwap([testSwap], testOrder, mockSignature, swapExecution)

      // Validate execution parameters
      expect(String(encodedSwapWithExecution[2].executedAmount)).toEqual(String(swapExecution.limitAmount))
    })

    test('should encode async version of encodeSwap with owner and scheme', async () => {
      // Mock a signer for this test
      const mockOwner = {
        getAddress: async () => TEST_ADDRESS,
        signTypedData: async () => mockSignature.data,
        _signTypedData: async () => mockSignature.data,
      }

      // Test the async version of encodeSwap
      const asyncResult = await SwapEncoder.encodeSwap(
        testDomain,
        [testSwap],
        testOrder,
        mockOwner as any,
        SigningScheme.EIP712,
      )

      // Validate the async result
      expect(asyncResult[0].length).toEqual(1) // Should have one swap
      expect(asyncResult[1].length).toBeGreaterThan(0) // Should have tokens
    })

    test('should handle multiple swaps in a single encoding', () => {
      // Create a second test swap
      const testSwap2: Swap = {
        poolId: '0x0000000000000000000000000000000000000000000000000000000000000002',
        assetIn: '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
        assetOut: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
        amount: '1000000000000000000000', // 1000 DAI
        userData: '0x01',
      }

      // Encode with multiple swaps
      const multiSwapResult = SwapEncoder.encodeSwap([testSwap, testSwap2], testOrder, mockSignature)

      // Check that all swap steps are encoded
      expect(multiSwapResult[0].length).toBe(2)

      // Validate that the tokens array contains all required tokens
      // We expect 3 tokens: WETH, DAI, and USDC
      expect(multiSwapResult[1].length).toBe(3)

      // Check second swap properties
      const secondSwap = multiSwapResult[0][1]!
      expect(String(secondSwap.poolId)).toEqual(testSwap2.poolId)
      expect(secondSwap.userData).toEqual(testSwap2.userData)
    })
  })
})
