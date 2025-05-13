import { DEFAULT_IPFS_READ_URI } from '../consts'
import {
  APP_DATA_DOC_CUSTOM,
  APP_DATA_HEX_LEGACY,
  CID_LEGACY,
  HTTP_STATUS_INTERNAL_ERROR,
  HTTP_STATUS_OK,
} from '../mocks'
import { fetchDocFromAppDataHex, fetchDocFromAppDataHexLegacy } from './fetchDocFromAppData'
import { AbstractProviderAdapter } from '@cowprotocol/common'
import fetchMock from 'jest-fetch-mock'

fetchMock.enableMocks()

// Create a mock adapter
const mockAdapter: Partial<AbstractProviderAdapter> = {
  getAppDataUtils: () => ({
    arrayify: () => new Uint8Array([1, 2, 3, 4]),
    keccak256: () => '0x12345678',
    toUtf8Bytes: () => new Uint8Array([1, 2, 3, 4]),
  }),
}

// Mock the modules
jest.mock('@cowprotocol/common', () => {
  const original = jest.requireActual('@cowprotocol/common')
  return {
    ...original,
    getGlobalAdapter: jest.fn(() => mockAdapter),
  }
})

jest.mock('./appDataHexToCid', () => ({
  appDataHexToCid: jest.fn(async (hash) => {
    if (hash === 'invalidHash') {
      throw new Error('Invalid hash format')
    }
    return 'valid-cid'
  }),
  appDataHexToCidLegacy: jest.fn(async () => CID_LEGACY),
}))

jest.mock('./fetchDocFromCid', () => ({
  fetchDocFromCid: jest.fn(async (cid, ipfsUri) => {
    if (cid === CID_LEGACY) {
      return APP_DATA_DOC_CUSTOM
    }
    return {}
  }),
}))

beforeEach(() => {
  fetchMock.resetMocks()
  jest.clearAllMocks()
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('fetchDocFromAppData', () => {
  test('Decodes appData', async () => {
    // when
    const appDataDoc = await fetchDocFromAppDataHexLegacy(APP_DATA_HEX_LEGACY)

    // then
    const { appDataHexToCidLegacy } = require('./appDataHexToCid')
    const { fetchDocFromCid } = require('./fetchDocFromCid')

    expect(appDataHexToCidLegacy).toHaveBeenCalledWith(APP_DATA_HEX_LEGACY)
    expect(fetchDocFromCid).toHaveBeenCalledWith(CID_LEGACY, undefined)
    expect(appDataDoc).toEqual(APP_DATA_DOC_CUSTOM)
  })

  test('Throws with wrong hash format', async () => {
    // when
    const promise = fetchDocFromAppDataHex('invalidHash')

    // then
    await expect(promise).rejects.toThrow(/Error decoding AppData:/)
  })
})
