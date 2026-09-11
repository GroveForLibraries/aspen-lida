import { GLOBALS } from '../globals';
import { createApiClient } from './apiFactory';
import { logDebugMessage, logErrorMessage } from '../logging';

/**
 * Returns manifestation data for the given grouped work id and format
 * @param {string} itemId
 * @param {string} format
 * @param {string} language
 * @param {?string} url
 * @returns {Promise<{id: string, format: string, manifestation: array}>}
 **/
export async function getManifestation(itemId, format, language, url = null) {
     const client = createApiClient({ url, timeout: GLOBALS.timeoutSlow, language });

     const response = await client.get('/ItemAPI?method=getManifestation', {
          id: itemId,
          format,
          language,
     });

     return {
          id: response.data?.result.id ?? itemId,
          format: response.data?.result.format ?? format,
          manifestation: response.data?.result.manifestation ?? [],
     };
}

/**
 * Returns variation data for the given grouped work id and format
 * @param {string} itemId
 * @param {string} format
 * @param {string} language
 * @param {?string} url
 * @param {object} variation
 * @returns {Promise<{id: string, format: string, variations: array, volumeInfo: object}>}
 **/
export async function getVariations(itemId, format, language, url = null, variation) {
     const recordId = variation?.recordId ?? null;

     const client = createApiClient({ url, timeout: GLOBALS.timeoutSlow, language });

     const response = await client.get('/ItemAPI?method=getVariations', {
          id: itemId,
          format,
          language,
          recordId,
     });

     if (response.ok && response.data) {
          const result = response.data.result ?? {};

          return {
               id: result.id ?? itemId,
               format: result.format ?? format,
               variations: result.variations ?? [],
               volumeInfo: {
                    numItemsWithVolumes: result.numItemsWithVolumes ?? 0,
                    numItemsWithoutVolumes: result.numItemsWithoutVolumes ?? 0,
                    hasItemsWithoutVolumes: result.hasItemsWithoutVolumes ?? 0,
                    majorityOfItemsHaveVolumes: result.majorityOfItemsHaveVolumes ?? false,
                    alwaysPlaceVolumeHoldWhenVolumesArePresent: result.alwaysPlaceVolumeHoldWhenVolumesArePresent ?? false,
               },
          };
     }else{
          logErrorMessage('Error Loading Variations');
          return null;
     }
}

/**
 * Returns record data for the given grouped work id and format
 * @param {string} itemId
 * @param {string} format
 * @param {string} source
 * @param {string} language
 * @param {?string} url
 * @returns {Promise<{id: string, format: string, records: array}>}
 **/
export async function getRecords(itemId, format, source, language, url = null) {
     const client = createApiClient({ url, timeout: GLOBALS.timeoutSlow, language });

     const response = await client.get('/ItemAPI?method=getRecords', {
          id: itemId,
          format,
          source,
          language,
     });

     return {
          id: response.data?.result.id ?? itemId,
          format: response.data?.result.format ?? format,
          records: response.data?.result.records ?? [],
     };
}

/**
 * Returns the first record for the given grouped work id and format
 * @param {string} itemId
 * @param {string} format
 * @param {string} language
 * @param {?string} url
 * @returns {Promise<{id: string|null, source: string, record: string|null}>}
 **/
export async function getFirstRecord(itemId, format, language, url = null) {
     const client = createApiClient({ url, timeout: GLOBALS.timeoutSlow, language });

     const response = await client.get('/ItemAPI?method=getRecords', {
          id: itemId,
          format,
          language,
     });

     let id = null;
     let source = 'ils';
     let record = null;

     if (response.ok && response.data?.result.records) {
          const records = response.data.result.records;
          const firstKey = Object.keys(records)[0];

          if (firstKey) {
               record = records[firstKey].id;
               const [recordSource, recordId] = record.split(':');
               id = recordId ?? null;
               source = recordSource ?? 'ils';
          }
     }

     return { id, source, record };
}

/**
 * Returns volumes data for a given item id
 * @param {string} id
 * @param {?string} url
 * @returns {Promise<array>}
 **/
export async function getVolumes(id, url = null) {
     if (!id || !url) return [];

     const client = createApiClient({ url, timeout: GLOBALS.timeoutAverage });

     const response = await client.get('/ItemAPI?method=getVolumes', { id });
     logDebugMessage("GetVolumes");
     logDebugMessage(response);

     if (response.ok && response.data?.result.volumes) {
          const volumesList = response.data?.result?.volumes;

          const volumesArray = Array.isArray(volumesList)
               ? volumesRaw
               : Object.values(volumesList);

          //Do not resort volumes since they are already returned in order.
          return volumesArray;
     }

     return [];
}

/**
 * Returns related record data for the given item and record id
 * @param {string} id
 * @param {string} recordId
 * @param {string} format
 * @param {?string} url
 * @returns {Promise<{id: string, recordId: string, format: string, manifestation: object}>}
 **/
export async function getRelatedRecord(id, recordId, format, url = null) {
     const client = createApiClient({ url, timeout: GLOBALS.timeoutSlow });

     const response = await client.get('/ItemAPI?method=getRelatedRecord', {
          id,
          record: recordId,
          format,
     });

     return {
          id: response.data?.result.id ?? id,
          recordId: response.data?.result.record ?? recordId,
          format: response.data?.result.format ?? format,
          manifestation: response.data?.result.record ?? [],
     };
}

/**
 * Returns copies data for given record id
 * @param {string} recordId
 * @param {string} language
 * @param {string} variationId
 * @param {?string} url
 * @returns {Promise<{recordId: string, copies: array}>}
 **/
export async function getCopies(recordId, language = 'en', variationId, url = null) {
     const client = createApiClient({ url, timeout: GLOBALS.timeoutSlow, language });

     const response = await client.get('/ItemAPI?method=getCopies', {
          recordId,
          language,
          variationId,
     });

     return {
          recordId,
          copies: response.data?.result.copies ?? [],
     };
}

/**
 * Returns item details for a given record id and format
 * @param {?string} url
 * @param {string} id
 * @param {string} format
 * @returns {Promise<{id: string, format: string, details: object}>}
 **/
export async function getItemDetails(url = null, id, format) {
     const client = createApiClient({ url, timeout: GLOBALS.timeoutAverage });

     return await client.post(
          '/ItemAPI?method=getItemDetails',
          {},
          {
               params: { recordId: id, format },
          }
     );
}
