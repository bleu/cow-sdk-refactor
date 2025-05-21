import { createAdapters } from '../setup'
import { setGlobalAdapter } from '@cowprotocol/common'
import {
  ContractsTs,
  InteractionLike,
  normalizeInteraction,
  normalizeInteractions,
  Eip1271SignatureData,
  encodeEip1271SignatureData,
  decodeEip1271SignatureData,
  EIP1271_MAGICVALUE,
} from '@cowprotocol/sdk-contracts-ts'
//@ts-ignore
import { log } from 'console'

describe('Interactions and EIP-1271 Signatures', () => {
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
  })

  describe('normalizeInteraction', () => {
    test('should normalize interactions consistently across different adapters', () => {
      // Test cases
      const testCases: InteractionLike[] = [
        {
          target: '0x9008D19f58AAbD9eD0D60971565AA8510560ab41',
        },
        {
          target: '0x9008D19f58AAbD9eD0D60971565AA8510560ab41',
          callData: '0x12345678',
        },
        {
          target: '0x9008D19f58AAbD9eD0D60971565AA8510560ab41',
          value: '1000000000000000000',
        },
        {
          target: '0x9008D19f58AAbD9eD0D60971565AA8510560ab41',
          callData: '0x12345678',
          value: '1000000000000000000',
        },
      ]

      for (const testCase of testCases) {
        // Normalize with each adapter
        setGlobalAdapter(adapters.ethersV5Adapter)
        const ethersV5Normalized = normalizeInteraction(testCase)

        setGlobalAdapter(adapters.ethersV6Adapter)
        const ethersV6Normalized = normalizeInteraction(testCase)

        setGlobalAdapter(adapters.viemAdapter)
        const viemNormalized = normalizeInteraction(testCase)

        // Normalized interactions should be identical
        expect(ethersV5Normalized).toEqual(ethersV6Normalized)
        expect(ethersV5Normalized).toEqual(viemNormalized)

        // Verify defaults were applied
        expect(ethersV5Normalized.target).toEqual(testCase.target)
        expect(ethersV5Normalized.callData).toEqual(testCase.callData || '0x')
        expect(ethersV5Normalized.value).toEqual(testCase.value || 0)
      }
    })
  })

  describe('normalizeInteractions', () => {
    test('should normalize multiple interactions consistently', () => {
      // Test batch of interactions
      const interactions: InteractionLike[] = [
        {
          target: '0x9008D19f58AAbD9eD0D60971565AA8510560ab41',
        },
        {
          target: '0x1234567890123456789012345678901234567890',
          callData: '0x12345678',
        },
        {
          target: '0xabcdef0123456789abcdef0123456789abcdef01',
          value: '1000000000000000000',
        },
      ]

      // Normalize batch with each adapter
      setGlobalAdapter(adapters.ethersV5Adapter)
      const ethersV5Normalized = normalizeInteractions(interactions)

      setGlobalAdapter(adapters.ethersV6Adapter)
      const ethersV6Normalized = normalizeInteractions(interactions)

      setGlobalAdapter(adapters.viemAdapter)
      const viemNormalized = normalizeInteractions(interactions)

      // Normalized interactions should be identical
      expect(ethersV5Normalized).toEqual(ethersV6Normalized)
      expect(ethersV5Normalized).toEqual(viemNormalized)

      // Verify length and content
      expect(ethersV5Normalized.length).toEqual(interactions.length)

      for (let i = 0; i < interactions.length; i++) {
        expect(ethersV5Normalized[i]!.target).toEqual(interactions[i]!.target)
        expect(ethersV5Normalized[i]!.callData).toEqual(interactions[i]!.callData || '0x')
        expect(ethersV5Normalized[i]!.value).toEqual(interactions[i]!.value || 0)
      }
    })
  })

  describe('EIP-1271 signature encoding/decoding', () => {
    test('should encode and decode EIP-1271 signatures consistently', () => {
      // Test signature data
      const signatureData: Eip1271SignatureData = {
        verifier: '0x9008D19f58AAbD9eD0D60971565AA8510560ab41',
        signature:
          '0x29a674dfc87f8c78fc2bfbcbe8ffdd435091a6a84bc7761db72a45da453d73ac41c5ce28eceb34be73fddc12a5d04af6e736405e41b613aeefeed3db8122420c1b',
      }

      log('here1')

      // Encode with each adapter
      setGlobalAdapter(adapters.ethersV5Adapter)
      const ethersV5Encoded = encodeEip1271SignatureData(signatureData)

      setGlobalAdapter(adapters.ethersV6Adapter)
      const ethersV6Encoded = encodeEip1271SignatureData(signatureData)

      setGlobalAdapter(adapters.viemAdapter)
      const viemEncoded = encodeEip1271SignatureData(signatureData)

      log('here2')

      // Encoded signatures should be identical
      expect(ethersV5Encoded).toEqual(ethersV6Encoded)
      log('here3')
      expect(ethersV5Encoded).toEqual(viemEncoded)
      log('here4')

      // Decode with each adapter
      setGlobalAdapter(adapters.ethersV5Adapter)
      const ethersV5Decoded = decodeEip1271SignatureData(ethersV5Encoded)

      setGlobalAdapter(adapters.ethersV6Adapter)
      const ethersV6Decoded = decodeEip1271SignatureData(ethersV6Encoded)

      setGlobalAdapter(adapters.viemAdapter)
      const viemDecoded = decodeEip1271SignatureData(viemEncoded)

      // Decoded signatures should be identical and match input
      log('here5')
      expect(ethersV5Decoded).toEqual(signatureData)
      log('here6')
      expect(ethersV6Decoded).toEqual(signatureData)
      log('here7')
      expect(viemDecoded).toEqual(signatureData)

      // Test with different signature lengths
      const signatures = [
        '0x', // Empty
        '0x1234', // Short
        '0x' + '1234'.repeat(32), // Long
      ]

      for (const signature of signatures) {
        const testData: Eip1271SignatureData = {
          verifier: '0x9008D19f58AAbD9eD0D60971565AA8510560ab41',
          signature,
        }

        // Encode and decode with each adapter
        setGlobalAdapter(adapters.ethersV5Adapter)
        const encoded = encodeEip1271SignatureData(testData)
        const decoded = decodeEip1271SignatureData(encoded)

        // Decoded data should match input
        expect(decoded.verifier).toEqual(testData.verifier)
        expect(decoded.signature).toEqual(testData.signature)
      }
    })

    test('should handle different verifier address formats', () => {
      // Test with addresses in different formats (lowercase, uppercase, mixed)
      const verifiers = [
        '0x9008d19f58aabd9ed0d60971565aa8510560ab41', // lowercase
        '0x9008D19F58AABD9ED0D60971565AA8510560AB41', // uppercase
        '0x9008D19f58AAbD9eD0D60971565AA8510560ab41', // mixed
      ]

      for (const verifier of verifiers) {
        const testData: Eip1271SignatureData = {
          verifier,
          signature: '0x1234',
        }

        // Encode with ethersV5 adapter
        setGlobalAdapter(adapters.ethersV5Adapter)
        const encoded = encodeEip1271SignatureData(testData)
        const decoded = decodeEip1271SignatureData(encoded)

        // Decoded verifier should be checksummed address
        expect(decoded.verifier.toLowerCase()).toEqual(verifier.toLowerCase())
      }
    })

    test('EIP1271_MAGICVALUE should be consistent with the standard', () => {
      // The EIP-1271 magic value should be 0x1626ba7e
      expect(EIP1271_MAGICVALUE).toEqual('0x1626ba7e')
    })
  })
})
