import { sepolia } from 'viem/chains'
import { createAdapters, TEST_ADDRESS, TEST_PRIVATE_KEY, TEST_RPC_URL } from '../setup'
import { ethers as ethersV5 } from 'ethers-v5'
import * as ethersV6 from 'ethers-v6'
import { setGlobalAdapter, TypedDataDomain } from '@cowprotocol/sdk-common'
import {
  ContractsTs,
  ContractsOrder as Order,
  ContractsOrderKind as OrderKind,
  ContractsSigningScheme as SigningScheme,
  hashOrder,
  computeOrderUid,
  extractOrderUidParams,
  signOrder,
  ContractsSignature as Signature,
  decodeSigningScheme,
  encodeSigningScheme,
  decodeTradeFlags,
  encodeTradeFlags,
} from '@cowprotocol/sdk-contracts-ts'
import { privateKeyToAccount } from 'viem/accounts'
import { createWalletClient, http } from 'viem'

describe('Order Hashing and Signing', () => {
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

  beforeAll(() => {
    adapters = createAdapters()
    contracts = {
      ethersV5Contracts: new ContractsTs(adapters.ethersV5Adapter),
      ethersV6Contracts: new ContractsTs(adapters.ethersV6Adapter),
      viemContracts: new ContractsTs(adapters.viemAdapter),
    }
  })

  describe('hashOrder', () => {
    test('should hash orders consistently across different adapters', () => {
      // Hash order with each adapter
      setGlobalAdapter(adapters.ethersV5Adapter)
      const ethersV5Hash = hashOrder(testDomain, testOrder)

      setGlobalAdapter(adapters.ethersV6Adapter)
      const ethersV6Hash = hashOrder(testDomain, testOrder)

      setGlobalAdapter(adapters.viemAdapter)
      const viemHash = hashOrder(testDomain, testOrder)

      // All hashes should be identical
      expect(ethersV5Hash).toEqual(ethersV6Hash)
      expect(ethersV5Hash).toEqual(viemHash)

      // Verify hash format (should be 0x-prefixed 32 byte hash)
      expect(ethersV5Hash).toMatch(/^0x[0-9a-f]{64}$/i)
    })
  })

  describe('computeOrderUid and extractOrderUidParams', () => {
    test('should compute and extract order UIDs consistently across different adapters', () => {
      // Compute order UID with each adapter
      setGlobalAdapter(adapters.ethersV5Adapter)
      const ethersV5Uid = computeOrderUid(testDomain, testOrder, TEST_ADDRESS)

      setGlobalAdapter(adapters.ethersV6Adapter)
      const ethersV6Uid = computeOrderUid(testDomain, testOrder, TEST_ADDRESS)

      setGlobalAdapter(adapters.viemAdapter)
      const viemUid = computeOrderUid(testDomain, testOrder, TEST_ADDRESS)

      // All UIDs should be identical
      expect(ethersV5Uid).toEqual(ethersV6Uid)
      expect(ethersV5Uid).toEqual(viemUid)

      // Verify UID format (56 bytes)
      expect(ethersV5Uid).toMatch(/^0x[0-9a-f]{112}$/i)

      // Extract parameters from the UID
      setGlobalAdapter(adapters.ethersV5Adapter)
      const ethersV5Params = extractOrderUidParams(ethersV5Uid)

      setGlobalAdapter(adapters.ethersV6Adapter)
      const ethersV6Params = extractOrderUidParams(ethersV6Uid)

      setGlobalAdapter(adapters.viemAdapter)
      const viemParams = extractOrderUidParams(viemUid)

      // All extracted parameters should be identical
      expect(ethersV5Params).toEqual(ethersV6Params)
      expect(ethersV5Params).toEqual(viemParams)

      // Verify the extracted parameters match the input
      expect(ethersV5Params.owner).toEqual(TEST_ADDRESS)
      expect(ethersV5Params.validTo).toEqual(testOrder.validTo)

      // The order digest should match the hash
      setGlobalAdapter(adapters.ethersV5Adapter)
      const orderHash = hashOrder(testDomain, testOrder)
      expect(ethersV5Params.orderDigest).toEqual(orderHash)
    })
  })

  describe('signOrder', () => {
    test('should sign orders consistently across different adapters', async () => {
      // Setup signers for each adapter
      setGlobalAdapter(adapters.ethersV5Adapter)
      const ethersV5Provider = new ethersV5.providers.JsonRpcProvider(TEST_RPC_URL)
      const ethersV5Wallet = new ethersV5.Wallet(TEST_PRIVATE_KEY, ethersV5Provider)

      setGlobalAdapter(adapters.ethersV6Adapter)
      const ethersV6Provider = new ethersV6.JsonRpcProvider(TEST_RPC_URL)
      const ethersV6Wallet = new ethersV6.Wallet(TEST_PRIVATE_KEY, ethersV6Provider)

      setGlobalAdapter(adapters.viemAdapter)
      const viemAccount = privateKeyToAccount(TEST_PRIVATE_KEY as `0x${string}`)
      const walletClient = createWalletClient({
        chain: sepolia,
        transport: http(),
        account: viemAccount,
      })

      // Sign the order with each adapter
      setGlobalAdapter(adapters.ethersV5Adapter)
      const ethersV5Sig = await signOrder(testDomain, testOrder, ethersV5Wallet, SigningScheme.EIP712)

      setGlobalAdapter(adapters.ethersV6Adapter)
      const ethersV6Sig = await signOrder(testDomain, testOrder, ethersV6Wallet, SigningScheme.EIP712)

      setGlobalAdapter(adapters.viemAdapter)
      const viemSig = await signOrder(testDomain, testOrder, walletClient, SigningScheme.EIP712)

      // Signatures should have the same scheme
      expect(ethersV5Sig.scheme).toEqual(SigningScheme.EIP712)
      expect(ethersV6Sig.scheme).toEqual(SigningScheme.EIP712)
      expect(viemSig.scheme).toEqual(SigningScheme.EIP712)

      // The signatures may differ slightly in format, but all should be valid ECDSA signatures
      const isValidSignature = (sig: Signature) => {
        expect(sig.data).toBeDefined()

        // For EIP712 and ETHSIGN, data should be a string or Bytes
        if (sig.scheme === SigningScheme.EIP712 || sig.scheme === SigningScheme.ETHSIGN) {
          expect(typeof sig.data === 'string' || sig.data instanceof Uint8Array).toBeTruthy()
        }
      }

      isValidSignature(ethersV5Sig)
      isValidSignature(ethersV6Sig)
      isValidSignature(viemSig)
    })
  })

  describe('SigningScheme encoding/decoding', () => {
    test('should encode and decode signing schemes consistently', () => {
      const schemes = [SigningScheme.EIP712, SigningScheme.ETHSIGN, SigningScheme.EIP1271, SigningScheme.PRESIGN]

      for (const scheme of schemes) {
        // For each adapter, encode the scheme
        setGlobalAdapter(adapters.ethersV5Adapter)
        const ethersV5Encoded = encodeSigningScheme(scheme)

        setGlobalAdapter(adapters.ethersV6Adapter)
        const ethersV6Encoded = encodeSigningScheme(scheme)

        setGlobalAdapter(adapters.viemAdapter)
        const viemEncoded = encodeSigningScheme(scheme)

        // Encoded values should be the same
        expect(ethersV5Encoded).toEqual(ethersV6Encoded)
        expect(ethersV5Encoded).toEqual(viemEncoded)

        // Decode and verify
        setGlobalAdapter(adapters.ethersV5Adapter)
        const ethersV5Decoded = decodeSigningScheme(ethersV5Encoded)

        setGlobalAdapter(adapters.ethersV6Adapter)
        const ethersV6Decoded = decodeSigningScheme(ethersV6Encoded)

        setGlobalAdapter(adapters.viemAdapter)
        const viemDecoded = decodeSigningScheme(viemEncoded)

        // Decoded values should match the original scheme
        expect(ethersV5Decoded).toEqual(scheme)
        expect(ethersV6Decoded).toEqual(scheme)
        expect(viemDecoded).toEqual(scheme)
      }
    })
  })

  describe('TradeFlags encoding/decoding', () => {
    test('should encode and decode trade flags consistently', () => {
      // Create trade flags for testing
      const tradeFlags = {
        ...testOrder,
        signingScheme: SigningScheme.EIP712,
      }

      // For each adapter, encode the flags
      setGlobalAdapter(adapters.ethersV5Adapter)
      const ethersV5Encoded = encodeTradeFlags(tradeFlags)

      setGlobalAdapter(adapters.ethersV6Adapter)
      const ethersV6Encoded = encodeTradeFlags(tradeFlags)

      setGlobalAdapter(adapters.viemAdapter)
      const viemEncoded = encodeTradeFlags(tradeFlags)

      // Encoded values should be the same
      expect(ethersV5Encoded).toEqual(ethersV6Encoded)
      expect(ethersV5Encoded).toEqual(viemEncoded)

      // Decode and verify
      setGlobalAdapter(adapters.ethersV5Adapter)
      const ethersV5Decoded = decodeTradeFlags(ethersV5Encoded)

      setGlobalAdapter(adapters.ethersV6Adapter)
      const ethersV6Decoded = decodeTradeFlags(ethersV6Encoded)

      setGlobalAdapter(adapters.viemAdapter)
      const viemDecoded = decodeTradeFlags(viemEncoded)

      // Verify that all decoded properties match
      const checkFlags = (decoded: any) => {
        expect(decoded.kind).toEqual(tradeFlags.kind)
        expect(decoded.partiallyFillable).toEqual(tradeFlags.partiallyFillable)
        expect(decoded.signingScheme).toEqual(tradeFlags.signingScheme)
      }

      checkFlags(ethersV5Decoded)
      checkFlags(ethersV6Decoded)
      checkFlags(viemDecoded)
    })
  })
})
