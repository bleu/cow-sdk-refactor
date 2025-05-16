import { AbstractProviderAdapter, setGlobalAdapter } from '@cowprotocol/sdk-common'
import { appDataHexToCid, appDataHexToCidLegacy } from './appDataHexToCid'
import { cidToAppDataHex } from './cidToAppDataHex'
import { fetchDocFromAppDataHex, fetchDocFromAppDataHexLegacy } from './fetchDocFromAppData'
import { fetchDocFromCid } from './fetchDocFromCid'

import { generateAppDataDoc } from './generateAppDataDoc'
import { getAppDataInfo, getAppDataInfoLegacy } from './getAppDataInfo'
import { getAppDataSchema } from './getAppDataSchema'
import { uploadMetadataDocToIpfsLegacy } from './uploadMetadataDocToIpfsLegacy'
import { validateAppDataDoc } from './validateAppDataDoc'

/**
 * AppDataApi provides a convenient interface for interacting with CoW Protocol's
 * app-data functionality. It supports both direct method calls and object-oriented usage.
 */
export class AppDataApi {
  /**
   * Creates a new AppDataApi instance
   *
   * @param adapter Provider adapter implementation
   */
  constructor(adapter: AbstractProviderAdapter) {
    setGlobalAdapter(adapter)
  }

  // Schema & Doc generation/validation
  getAppDataSchema = getAppDataSchema
  generateAppDataDoc = generateAppDataDoc
  validateAppDataDoc = validateAppDataDoc

  // appData / CID conversion
  getAppDataInfo = getAppDataInfo

  appDataHexToCid = appDataHexToCid

  cidToAppDataHex = cidToAppDataHex

  // Fetch from IPFS
  fetchDocFromAppDataHex = fetchDocFromAppDataHex

  // Legacy methods
  legacy = {
    // Fetch appData document from IPFS (deprecated)
    fetchDocFromCid: fetchDocFromCid,

    // Upload to IPFS (deprecated)
    uploadMetadataDocToIpfs: uploadMetadataDocToIpfsLegacy,

    // (appData | fullAppData) --> cid (deprecated)
    appDataToCid: getAppDataInfoLegacy,

    // appDataHex --> cid (deprecated)
    appDataHexToCid: appDataHexToCidLegacy,

    // appDataHex --> appData (deprecated)
    fetchDocFromAppDataHex: fetchDocFromAppDataHexLegacy,
  }
}
