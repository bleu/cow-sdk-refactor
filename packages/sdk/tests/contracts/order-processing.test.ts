import { createAdapters, TEST_ADDRESS } from '../setup'
import { setGlobalAdapter, TypedDataDomain } from '@cowprotocol/sdk-common'
import {
  ContractsTs,
  Order,
  OrderKind,
  OrderBalance,
  normalizeOrder,
  timestamp,
  hashify,
  normalizeBuyTokenBalance,
  packOrderUidParams,
  extractOrderUidParams,
  decodeOrder,
  TokenRegistry,
  Trade,
} from '@cowprotocol/sdk-contracts-ts'
import { getAddress } from 'viem'

describe('Order Processing Functions', () => {
  let adapters: ReturnType<typeof createAdapters>
  let contracts: {
    ethersV5Contracts: ContractsTs
    ethersV6Contracts: ContractsTs
    viemContracts: ContractsTs
  }

  // Test data
  const testDomain: TypedDataDomain = {
    name: 'Cow Protocol',
    version: '1',
    chainId: 1,
    verifyingContract: '0x9008D19f58AAbD9eD0D60971565AA8510560ab41',
  }

  const testOrder: Order = {
    sellToken: getAddress('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'), // WETH
    buyToken: getAddress('0x6b175474e89094c44da98b954eedeac495271d0f'), // DAI
    sellAmount: '1000000000000000000', // 1 WETH
    buyAmount: '2000000000000000000000', // 2000 DAI
    validTo: (Math.floor(Date.now() / 1000) + 3600) as number, // 1 hour from now
    appData: '0x0000000000000000000000000000000000000000000000000000000000000000',
    feeAmount: '5000000000000000', // 0.005 WETH
    kind: OrderKind.SELL,
    partiallyFillable: false,
  }

  beforeAll(() => {
    adapters = createAdapters()
    contracts = {
      ethersV5Contracts: new ContractsTs(adapters.ethersV5Adapter),
      ethersV6Contracts: new ContractsTs(adapters.ethersV6Adapter),
      viemContracts: new ContractsTs(adapters.viemAdapter),
    }
  })

  describe('normalizeOrder', () => {
    test('should normalize orders consistently across different adapters', () => {
      // Normalize with each adapter
      setGlobalAdapter(adapters.ethersV5Adapter)
      const ethersV5Normalized = normalizeOrder(testOrder)

      setGlobalAdapter(adapters.ethersV6Adapter)
      const ethersV6Normalized = normalizeOrder(testOrder)

      setGlobalAdapter(adapters.viemAdapter)
      const viemNormalized = normalizeOrder(testOrder)

      // Normalized orders should be identical
      expect(ethersV5Normalized).toEqual(ethersV6Normalized)
      expect(ethersV5Normalized).toEqual(viemNormalized)

      // Check specific properties
      expect(ethersV5Normalized.receiver).toEqual('0x0000000000000000000000000000000000000000')
      expect(ethersV5Normalized.sellTokenBalance).toEqual(OrderBalance.ERC20)
      expect(ethersV5Normalized.buyTokenBalance).toEqual(OrderBalance.ERC20)
      expect(ethersV5Normalized.validTo).toEqual(testOrder.validTo)

      // When we provide a receiver, it should be preserved
      const orderWithReceiver = { ...testOrder, receiver: TEST_ADDRESS }

      setGlobalAdapter(adapters.ethersV5Adapter)
      const normalizedWithReceiver = normalizeOrder(orderWithReceiver)
      expect(normalizedWithReceiver.receiver).toEqual(TEST_ADDRESS)

      // Test error case - receiver cannot be zero address
      setGlobalAdapter(adapters.ethersV5Adapter)
      const orderWithZeroReceiver = { ...testOrder, receiver: '0x0000000000000000000000000000000000000000' }
      expect(() => normalizeOrder(orderWithZeroReceiver)).toThrow(/receiver cannot be address\(0\)/)
    })

    test('should handle different balance types correctly', () => {
      const orderVariations = [
        { ...testOrder }, // Default
        { ...testOrder, sellTokenBalance: OrderBalance.ERC20 },
        { ...testOrder, sellTokenBalance: OrderBalance.EXTERNAL },
        { ...testOrder, sellTokenBalance: OrderBalance.INTERNAL },
        { ...testOrder, buyTokenBalance: OrderBalance.ERC20 },
        { ...testOrder, buyTokenBalance: OrderBalance.INTERNAL },
        { ...testOrder, buyTokenBalance: OrderBalance.EXTERNAL }, // Should be normalized to ERC20
      ]

      for (const order of orderVariations) {
        setGlobalAdapter(adapters.ethersV5Adapter)
        const normalized = normalizeOrder(order)

        // Sell token balance should match what was provided or default to ERC20
        expect(normalized.sellTokenBalance).toEqual(order.sellTokenBalance || OrderBalance.ERC20)

        // Buy token balance handling is special - EXTERNAL gets converted to ERC20
        if (order.buyTokenBalance === OrderBalance.EXTERNAL) {
          expect(normalized.buyTokenBalance).toEqual(OrderBalance.ERC20)
        } else {
          expect(normalized.buyTokenBalance).toEqual(order.buyTokenBalance || OrderBalance.ERC20)
        }
      }
    })
  })

  describe('timestamp', () => {
    test('should convert various timestamp formats consistently', () => {
      const testCases = [
        { input: 1609459200, expected: 1609459200 }, // Unix timestamp (seconds)
        { input: new Date('2021-01-01T00:00:00Z'), expected: 1609459200 }, // Date object
      ]

      for (const { input, expected } of testCases) {
        setGlobalAdapter(adapters.ethersV5Adapter)
        const ethersV5Result = timestamp(input)

        setGlobalAdapter(adapters.ethersV6Adapter)
        const ethersV6Result = timestamp(input)

        setGlobalAdapter(adapters.viemAdapter)
        const viemResult = timestamp(input)

        // Results should be identical
        expect(ethersV5Result).toEqual(expected)
        expect(ethersV6Result).toEqual(expected)
        expect(viemResult).toEqual(expected)
      }
    })
  })

  describe('hashify', () => {
    test('should convert app data to 32-byte hash consistently', () => {
      const testCases = [
        { input: 123, expected: '0x000000000000000000000000000000000000000000000000000000000000007b' }, // Number
        { input: '0xabcd', expected: '0x000000000000000000000000000000000000000000000000000000000000abcd' }, // Short hex
        {
          input: '0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
          expected: '0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
        }, // Full 32-byte hash
      ]

      for (const { input, expected } of testCases) {
        setGlobalAdapter(adapters.ethersV5Adapter)
        const ethersV5Result = hashify(input)

        setGlobalAdapter(adapters.ethersV6Adapter)
        const ethersV6Result = hashify(input)

        setGlobalAdapter(adapters.viemAdapter)
        const viemResult = hashify(input)

        // Results should be identical and match expected
        expect(ethersV5Result).toEqual(expected)
        expect(ethersV6Result).toEqual(expected)
        expect(viemResult).toEqual(expected)
      }
    })
  })

  describe('normalizeBuyTokenBalance', () => {
    test('should normalize buy token balance types correctly', () => {
      const testCases = [
        { input: undefined, expected: OrderBalance.ERC20 },
        { input: OrderBalance.ERC20, expected: OrderBalance.ERC20 },
        { input: OrderBalance.EXTERNAL, expected: OrderBalance.ERC20 }, // EXTERNAL normalized to ERC20 for buy
        { input: OrderBalance.INTERNAL, expected: OrderBalance.INTERNAL },
      ]

      for (const { input, expected } of testCases) {
        setGlobalAdapter(adapters.ethersV5Adapter)
        const ethersV5Result = normalizeBuyTokenBalance(input)

        setGlobalAdapter(adapters.ethersV6Adapter)
        const ethersV6Result = normalizeBuyTokenBalance(input)

        setGlobalAdapter(adapters.viemAdapter)
        const viemResult = normalizeBuyTokenBalance(input)

        // Results should be identical and match expected
        expect(ethersV5Result).toEqual(expected)
        expect(ethersV6Result).toEqual(expected)
        expect(viemResult).toEqual(expected)
      }
    })

    test('should throw on invalid balance type', () => {
      setGlobalAdapter(adapters.ethersV5Adapter)
      expect(() => normalizeBuyTokenBalance('invalid' as any)).toThrow(/invalid order balance/)
    })
  })

  describe('OrderUid packing and extraction', () => {
    test('should pack and extract order UIDs consistently', () => {
      const params = {
        orderDigest: '0x1234567890123456789012345678901234567890123456789012345678901234',
        owner: '0x9008D19f58AAbD9eD0D60971565AA8510560ab41',
        validTo: 1609459200, // Unix timestamp
      }

      // Pack with each adapter
      setGlobalAdapter(adapters.ethersV5Adapter)
      const ethersV5Packed = packOrderUidParams(params)

      setGlobalAdapter(adapters.ethersV6Adapter)
      const ethersV6Packed = packOrderUidParams(params)

      setGlobalAdapter(adapters.viemAdapter)
      const viemPacked = packOrderUidParams(params)

      // Packed UIDs should be identical
      expect(ethersV5Packed).toEqual(ethersV6Packed)
      expect(ethersV5Packed).toEqual(viemPacked)

      // Extract with each adapter
      setGlobalAdapter(adapters.ethersV5Adapter)
      const ethersV5Extracted = extractOrderUidParams(ethersV5Packed)

      setGlobalAdapter(adapters.ethersV6Adapter)
      const ethersV6Extracted = extractOrderUidParams(ethersV6Packed)

      setGlobalAdapter(adapters.viemAdapter)
      const viemExtracted = extractOrderUidParams(viemPacked)

      // Extracted params should be identical and match input
      expect(ethersV5Extracted).toEqual(params)
      expect(ethersV6Extracted).toEqual(params)
      expect(viemExtracted).toEqual(params)

      // Test error case - invalid UID length
      setGlobalAdapter(adapters.ethersV5Adapter)
      expect(() => extractOrderUidParams('0x1234')).toThrow(/invalid order UID length/)
    })
  })

  describe('decodeOrder', () => {
    test('should decode trade data back into an order consistently', () => {
      // First create a token registry and encode a trade
      setGlobalAdapter(adapters.ethersV5Adapter)
      const tokenRegistry = new TokenRegistry()

      // Add tokens to the registry
      const sellTokenIndex = tokenRegistry.index(testOrder.sellToken)
      const buyTokenIndex = tokenRegistry.index(testOrder.buyToken)

      // Create mock trade data
      const trade = {
        sellTokenIndex,
        buyTokenIndex,
        receiver: testOrder.receiver || '0x0000000000000000000000000000000000000000',
        sellAmount: testOrder.sellAmount,
        buyAmount: testOrder.buyAmount,
        validTo: testOrder.validTo.valueOf(),
        appData: testOrder.appData,
        feeAmount: testOrder.feeAmount,
        flags: 0, // Encode as a sell order, not partially fillable, ERC20 balances
        executedAmount: '0',
        signature: '0x',
      } as Trade

      // Decode with each adapter
      setGlobalAdapter(adapters.ethersV5Adapter)
      const ethersV5Decoded = decodeOrder(trade, tokenRegistry.addresses)

      setGlobalAdapter(adapters.ethersV6Adapter)
      const ethersV6Decoded = decodeOrder(trade, tokenRegistry.addresses)

      setGlobalAdapter(adapters.viemAdapter)
      const viemDecoded = decodeOrder(trade, tokenRegistry.addresses)

      // Decoded orders should be identical
      expect(ethersV5Decoded).toEqual(ethersV6Decoded)
      expect(ethersV5Decoded).toEqual(viemDecoded)

      // Decoded order should match original order
      // (ignoring receiver which is added by the contract if not provided)
      expect(ethersV5Decoded.sellToken).toEqual(testOrder.sellToken)
      expect(ethersV5Decoded.buyToken).toEqual(testOrder.buyToken)
      expect(ethersV5Decoded.sellAmount).toEqual(testOrder.sellAmount)
      expect(ethersV5Decoded.buyAmount).toEqual(testOrder.buyAmount)
      expect(ethersV5Decoded.validTo).toEqual(testOrder.validTo)
      expect(ethersV5Decoded.appData).toEqual(testOrder.appData)
      expect(ethersV5Decoded.feeAmount).toEqual(testOrder.feeAmount)
      expect(ethersV5Decoded.kind).toEqual(testOrder.kind)
      expect(ethersV5Decoded.partiallyFillable).toEqual(testOrder.partiallyFillable)

      // Test error case - invalid token indices
      const invalidTrade = {
        ...trade,
        sellTokenIndex: 99, // Index that doesn't exist
      }

      setGlobalAdapter(adapters.ethersV5Adapter)
      expect(() => decodeOrder(invalidTrade, tokenRegistry.addresses)).toThrow(/Invalid trade/)
    })
  })

  describe('TokenRegistry', () => {
    test('should track tokens consistently across different adapters', () => {
      // Create registries with each adapter
      setGlobalAdapter(adapters.ethersV5Adapter)
      const ethersV5Registry = new TokenRegistry()

      setGlobalAdapter(adapters.ethersV6Adapter)
      const ethersV6Registry = new TokenRegistry()

      setGlobalAdapter(adapters.viemAdapter)
      const viemRegistry = new TokenRegistry()

      // Add some tokens
      const tokens = [
        getAddress('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'), // WETH
        getAddress('0x6b175474e89094c44da98b954eedeac495271d0f'), // DAI
        getAddress('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'), // USDC
      ]

      // Add tokens and get indices
      const ethersV5Indices = tokens.map((token) => ethersV5Registry.index(token))
      const ethersV6Indices = tokens.map((token) => ethersV6Registry.index(token))
      const viemIndices = tokens.map((token) => viemRegistry.index(token))

      // Indices should be sequential starting from 0
      expect(ethersV5Indices).toEqual([0, 1, 2])
      expect(ethersV6Indices).toEqual([0, 1, 2])
      expect(viemIndices).toEqual([0, 1, 2])

      // Adding same token again should return the same index
      expect(ethersV5Registry.index(tokens[0]!)).toEqual(0)
      expect(ethersV6Registry.index(tokens[0]!)).toEqual(0)
      expect(viemRegistry.index(tokens[0]!)).toEqual(0)

      // Token addresses should be stored in the registry
      expect(ethersV5Registry.addresses).toEqual(tokens)
      expect(ethersV6Registry.addresses).toEqual(tokens)
      expect(viemRegistry.addresses).toEqual(tokens)

      // Test that case normalization works
      const mixedCaseToken = '0xC02aaA39b223FE8D0A0e5C4F27ead9083C756Cc2' // WETH with mixed case
      expect(ethersV5Registry.index(mixedCaseToken)).toEqual(0) // Should map to same index as lowercase
    })
  })
})
