import { AbstractProviderAdapter, getGlobalAdapter } from '@cowprotocol/common'
import { AnyAppDataDocVersion } from '../generatedTypes'
import { AppDataInfo } from '../types'
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
  private adapter?: AbstractProviderAdapter

  /**
   * Creates a new AppDataApi instance
   *
   * @param adapter Provider adapter implementation
   */
  constructor(adapter?: AbstractProviderAdapter) {
    if (adapter) {
      // It's an adapter
      this.adapter = adapter
    } else {
      // Use global adapter
      this.adapter = getGlobalAdapter()
    }
  }

  // Schema & Doc generation/validation
  getAppDataSchema = getAppDataSchema
  generateAppDataDoc = generateAppDataDoc
  validateAppDataDoc = validateAppDataDoc

  // appData / CID conversion
  getAppDataInfo = (appData: AnyAppDataDocVersion | string): Promise<AppDataInfo> =>
    getAppDataInfo(appData as AnyAppDataDocVersion, this.adapter)

  appDataHexToCid = (appDataHex: string): Promise<string> => appDataHexToCid(appDataHex, this.adapter)

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
    appDataToCid: (appData: AnyAppDataDocVersion | string): Promise<AppDataInfo | undefined> =>
      getAppDataInfoLegacy(appData as AnyAppDataDocVersion, this.adapter),

    // appDataHex --> cid (deprecated)
    appDataHexToCid: (appDataHex: string): Promise<string> => appDataHexToCidLegacy(appDataHex, this.adapter),

    // appDataHex --> appData (deprecated)
    fetchDocFromAppDataHex: fetchDocFromAppDataHexLegacy,
  }
}
