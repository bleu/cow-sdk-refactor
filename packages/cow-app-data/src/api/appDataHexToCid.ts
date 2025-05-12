import { AbstractProviderAdapter, getGlobalAdapter } from '@cowprotocol/common'
import { MetaDataError } from '../consts'

/**
 *  Convert an app-data hex string to a CID
 *
 * @param appDataHex - The app-data hex string (app-data part of the order struct)
 * @param adapter
 * @returns The IPFS CID v1 of the content
 */
export async function appDataHexToCid(appDataHex: string, adapter?: AbstractProviderAdapter): Promise<string> {
  const internalaAdapter = adapter || getGlobalAdapter()
  const cid = await _appDataHexToCid(appDataHex, internalaAdapter)
  _assertCid(cid, appDataHex)
  return cid
}

/**
 * Convert an app-data hex string to a CID using the legacy method (IPFS CID has different hashing algorithm, this hashing algorithm is not used anymore by CoW Protocol)
 *
 * @deprecated Please use appDataHexToCid instead
 *
 * @param appDataHex
 * @param adapter
 * @returns
 */
export async function appDataHexToCidLegacy(appDataHex: string, adapter?: AbstractProviderAdapter): Promise<string> {
  const internalaAdapter = adapter || getGlobalAdapter()
  const cid = await _appDataHexToCidLegacy(appDataHex, internalaAdapter)
  _assertCid(cid, appDataHex)

  return cid
}

export async function _assertCid(cid: string, appDataHex: string) {
  if (!cid) throw new MetaDataError('Error getting CID from appDataHex: ' + appDataHex)
}

/**
 *  Derive the IPFS CID v1 from the appData hex
 *
 * For reference see  https://github.com/cowprotocol/services/issues/1465 and https://github.com/cowprotocol/services/blob/main/crates/app-data-hash/src/lib.rs
 *
 * @param appDataHex hex with tha appData hash
 * @param adapter
 * @returns the IPFS CID v0 of the content
 */
async function _appDataHexToCid(appDataHex: string, adapter: AbstractProviderAdapter): Promise<string> {
  const cidBytes = await _toCidBytes(
    {
      version: 0x01, // CIDv1
      multicodec: 0x55, // Raw codec
      hashingAlgorithm: 0x1b, // keccak hash algorithm
      hashingLength: 32, // keccak hash length (0x20 = 32)
      multihashHex: appDataHex, // 32 bytes of the keccak256 hash
    },
    adapter
  )

  // Encode to base16
  const { base16 } = await import('multiformats/bases/base16')
  return base16.encode(cidBytes)
}

async function _appDataHexToCidLegacy(appDataHex: string, adapter: AbstractProviderAdapter): Promise<string> {
  const cidBytes = await _toCidBytes(
    {
      version: 0x01, // CIDv1
      multicodec: 0x70, // dag-pb
      hashingAlgorithm: 0x12, // sha2-256 hash algorithm
      hashingLength: 32, //  SHA-256 length (0x20 = 32)
      multihashHex: appDataHex, // 32 bytes of the sha2-256 hash
    },
    adapter
  )

  const { CID } = await import('multiformats/cid')
  return CID.decode(cidBytes).toV0().toString()
}

interface ToCidParams {
  version: number
  multicodec: number
  hashingAlgorithm: number
  hashingLength: number
  multihashHex: string
}

async function _toCidBytes(params: ToCidParams, adapter: AbstractProviderAdapter): Promise<Uint8Array> {
  const teste = {
    campo1: params.multihashHex,
  }

  const hashBytes = adapter.getAppDataUtils().arrayify(params.multihashHex)

  // Concat prefix and multihash
  const cidPrefix = Uint8Array.from([params.version, params.multicodec, params.hashingAlgorithm, params.hashingLength])
  var cidBytes = new Uint8Array(cidPrefix.length + hashBytes.length)
  cidBytes.set(cidPrefix)
  cidBytes.set(hashBytes, cidPrefix.length)

  return cidBytes
}
