import { AbstractProviderAdapter, getGlobalAdapter } from '@cowprotocol/common'
import { MetaDataError } from '../consts'
import { AnyAppDataDocVersion } from '../generatedTypes'
import { AppDataInfo } from '../types'
import { extractDigest } from '../utils/ipfs'
import { stringifyDeterministic } from '../utils/stringify'
import { appDataHexToCid } from './appDataHexToCid'
import { validateAppDataDoc } from './validateAppDataDoc'

/**
 * Calculates appDataHex without publishing file to IPFS
 *
 * This method is intended to quickly generate the appDataHex independent
 * of IPFS upload/pinning
 *
 * @param appData JSON document which will be stringified in a deterministic way to calculate the IPFS hash
 * @param adapter
 */
export async function getAppDataInfo(
  appData: AnyAppDataDocVersion,
  adapter?: AbstractProviderAdapter
): Promise<AppDataInfo>

/**
 * Calculates appDataHex without publishing file to IPFS
 *
 * @deprecated AppData is not longer stored on IPFS nor it's derived from IPFS content hashes
 *
 * This method is intended to quickly generate the appDataHex independent
 * of IPFS upload/pinning
 *
 * @param fullAppData JSON string with the full appData document
 * @param adapter
 */
export async function getAppDataInfo(
  fullAppData: string,
  adapter?: AbstractProviderAdapter
): Promise<AppDataInfo | undefined>

/**
 * @deprecated AppData is not longer stored on IPFS nor it's derived from IPFS content hashes
 *
 * @param appDataAux App data document or JSON string
 * @param adapter
 * @returns App data information including CID and hex
 */
export async function getAppDataInfo(
  appDataAux: AnyAppDataDocVersion | string,
  adapter?: AbstractProviderAdapter
): Promise<AppDataInfo> {
  const internalAdapter = adapter || getGlobalAdapter()
  return _appDataToCidAux(appDataAux, (fullAppData) => _appDataToCid(fullAppData, internalAdapter), internalAdapter)
}

/**
 * Gets the appDataInfo using the legacy method (IPFS CID has different hashing algorithm, this hashing algorithm is not used anymore by CoW Protocol)
 *
 * @deprecated Please use getAppDataInfo instead
 *
 * @param appData JSON document which will be stringified in a deterministic way to calculate the IPFS hash
 * @param adapter
 */
export async function getAppDataInfoLegacy(
  appData: AnyAppDataDocVersion,
  adapter?: AbstractProviderAdapter
): Promise<AppDataInfo | undefined>

/**
 * Calculates appDataHex without publishing file to IPFS
 *
 * This method is intended to quickly generate the appDataHex independent
 * of IPFS upload/pinning
 *
 * @deprecated Please use getAppDataInfo instead
 *
 * @param fullAppData JSON string with the full appData document
 * @param adapter
 */
export async function getAppDataInfoLegacy(
  fullAppData: string,
  adapter?: AbstractProviderAdapter
): Promise<AppDataInfo | undefined>

/**
 * Gets the appDataInfo using the legacy method (IPFS CID has different hashing algorithm, this hashing algorithm is not used anymore by CoW Protocol)
 *
 * @deprecated Please use getAppDataInfo instead
 *
 * @param appDataAux App data document or JSON string
 * @param adapter
 */
export async function getAppDataInfoLegacy(
  appDataAux: AnyAppDataDocVersion | string,
  adapter?: AbstractProviderAdapter
): Promise<AppDataInfo | undefined> {
  // For the legacy-mode we use plain JSON.stringify to maintain backwards compatibility, however this is not a good idea to do since JSON.stringify. Better specify the doc as a fullAppData string or use stringifyDeterministic
  const fullAppData = JSON.stringify(appDataAux)
  const internalAdapter = adapter || getGlobalAdapter()
  return _appDataToCidAux(fullAppData, (data) => _appDataToCidLegacy(data), internalAdapter)
}

/**
 * Helper function to process app data and derive CID
 *
 * @param appDataAux App data document or JSON string
 * @param deriveCid Function to derive CID from full app data
 * @param adapter
 */
export async function _appDataToCidAux(
  appDataAux: AnyAppDataDocVersion | string,
  deriveCid: (fullAppData: string) => Promise<string>,
  adapter: AbstractProviderAdapter
): Promise<AppDataInfo> {
  const [appDataDoc, fullAppData] =
    typeof appDataAux === 'string'
      ? [JSON.parse(appDataAux), appDataAux]
      : [appDataAux, await stringifyDeterministic(appDataAux)]

  const validation = await validateAppDataDoc(appDataDoc)

  if (!validation?.success) {
    throw new MetaDataError(`Invalid appData provided: ${validation?.errors}`)
  }

  try {
    const cid = await deriveCid(fullAppData)
    const appDataHex = await extractDigest(cid)

    if (!appDataHex) {
      throw new MetaDataError(`Could not extract appDataHex from calculated cid ${cid}`)
    }

    return { cid, appDataHex, appDataContent: fullAppData }
  } catch (e) {
    const error = e as MetaDataError
    console.error('Failed to calculate appDataHex', error)
    throw new MetaDataError(`Failed to calculate appDataHex: ${error.message}`)
  }
}

/**
 * Derive the IPFS CID v0 from the full appData JSON content
 *
 * @param fullAppDataJson string with the full AppData in JSON format. It is a string to make the hashing deterministic (do not rely on stringification of objects)
 * @param adapter
 * @returns the IPFS CID v0 of the content
 */
async function _appDataToCid(fullAppDataJson: string, adapter: AbstractProviderAdapter): Promise<string> {
  const appDataUtils = adapter.getAppDataUtils()
  const appDataHex = appDataUtils.keccak256(appDataUtils.toUtf8Bytes(fullAppDataJson))
  return appDataHexToCid(appDataHex, adapter)
}

/**
 * Derive CID using legacy method
 *
 * @param doc App data document or JSON string
 * @returns IPFS CID
 */
export async function _appDataToCidLegacy(doc: AnyAppDataDocVersion | string): Promise<string> {
  const fullAppData = typeof doc === 'string' ? doc : await stringifyDeterministic(doc)

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const { of } = await import('ipfs-only-hash')
  return of(fullAppData, { cidVersion: 0 })
}
