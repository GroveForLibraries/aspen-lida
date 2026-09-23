import { popAlert } from '../../components/feedback';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { GLOBALS } from '../globals';
import { saveLastListUsed } from '../db';
import { createApiClient } from './apiFactory';

/** *******************************************************************
 * General
 ******************************************************************* **/

/**
 * Returns array of basic details about a given user list
 * @param {array} id
 * @param {?string} url
 * @returns {Promise<array>}
 **/
export async function getListDetails(id, url = null) {
     const client = createApiClient({ url, timeout: GLOBALS.timeoutFast });

     const response = await client.post(
          '/ListAPI?method=getListDetails',
          {},
          {
               params: { id },
          }
     );

     return response.ok ? (response.data?.result ?? []) : [];
}

/**
 * Returns all lists for a given user
 * @param {?string} url
 * @param {int} page
 * @param {int} limit
 * @param {int} includePagination
 **/
export async function getLists(url = null, page = 1, limit = 20, includePagination = 1) {
     const client = createApiClient({ url, timeout: GLOBALS.timeoutAverage });

     return await client.post(
          '/ListAPI?method=getUserLists&checkIfValid=false',
          {},
          {
               params: { page, limit, includePagination },
          }
     );
}

/**
 * Create a new list for a user
 * @param {string} title
 * @param {string} description
 * @param {boolean} isPublic
 * @param {?string} url
 * @param {string} addToListGroup
 * @param {int} addToListGroupNestedId
 * @param {string} addToListGroupNewName
 * @param {int} existingListId
 **/
export async function createList(title, description, isPublic = false, url = null, addToListGroup, addToListGroupNestedId, addToListGroupNewName, existingListId) {
     const client = createApiClient({ url, timeout: GLOBALS.timeoutAverage });

     const response = await client.post(
          '/ListAPI?method=createList',
          {},
          {
               params: {
                    title,
                    description,
                    isPublic,
                    addToListGroupOption: addToListGroup,
                    addToListGroupNested: (addToListGroup === 'no' || addToListGroupNestedId === 'no') ? null : addToListGroupNestedId === '' ? existingListId : addToListGroupNestedId,
                    addToListGroupNewName,
               },
          }
     );

     if (response.ok) {
          if (response.data?.result?.listId) {
               await saveLastListUsed(response.data.result.listId);
          }
          return response.data?.result;
     }

     return false;
}

/**
 * Create a new list for a user based on a title, and optionally add to a list group
 * @param title
 * @param description
 * @param access
 * @param items
 * @param url
 * @param source
 * @param addToListGroup
 * @param addToListGroupNestedId
 * @param addToListGroupNewName
 * @returns {Promise<*|boolean>}
 */
export async function createListFromTitle(title, description, access, items, url = null, source = 'GroupedWork', addToListGroup, addToListGroupNestedId, addToListGroupNewName) {
     const client = createApiClient({ url, timeout: GLOBALS.timeoutAverage });

     const response = await client.post(
          '/ListAPI?method=createList',
          {},
          {
               params: {
                    title,
                    description,
                    access,
                    source,
                    recordIds: items,
                    addToListGroupOption: addToListGroup,
                    addToListGroupNested: addToListGroupNestedId,
                    addToListGroupNewName,
               },
          }
     );

     if (response.ok) {
          const result = response.data?.result;

          if (result?.listId) {
               await saveLastListUsed(result.listId);
          }

          const status = result?.success ? 'success' : 'danger';
          // TODO(api-translation): For response.ok, API should return localized alert title values.
          const alertTitle = result?.success ? 'Success' : 'Error';
          // TODO(api-translation): For response.ok, API should return localized alert message text.
          const alertMessage = result?.numAdded ? `${result.numAdded} added to ${title}` : `Title added to ${title}`;

          popAlert(alertTitle, alertMessage, status);
          return result;
     }

     return false;
}

/**
 * Edit an existing list for a user based on a title, and optionally move to a different list group
 * @param listId
 * @param title
 * @param description
 * @param access
 * @param url
 * @param listGroupId
 * @returns {Promise<*>}
 */
export async function editList(listId, title, description, access, url = null, listGroupId = null) {
     const client = createApiClient({ url, timeout: GLOBALS.timeoutAverage });

     const response = await client.post(
          '/ListAPI?method=editList',
          {},
          {
               params: { id: listId, title, description, public: access, listGroupId },
          }
     );

     if (response.ok) {
          await saveLastListUsed(listId);
          return response.data;
     }
}

/**
 * Add titles to an existing list for a user
 * @param id
 * @param itemId
 * @param url
 * @param source
 * @param language
 * @returns {Promise<*>}
 */
export async function addTitlesToList(id, itemId, url = null, source = 'GroupedWork', language = 'en') {
     const client = createApiClient({ url, timeout: GLOBALS.timeoutAverage });

     const response = await client.post(
          '/ListAPI?method=addTitlesToList',
          {},
          {
               params: { listId: id, recordIds: itemId, source },
          }
     );

     if (response.ok) {
          await saveLastListUsed(id);
          const result = response.data?.result;

          if (result?.success) {
               // TODO(api-translation): For response.ok, API should return localized success message text.
               popAlert(getTermFromDictionary(language, 'added_successfully'), `${result.numAdded} added to list`, 'success');
          } else {
               // TODO(api-translation): For response.ok, API should return localized error message text.
               popAlert(getTermFromDictionary(language, 'error'), 'Unable to add item to list', 'error');
          }

          return result;
     }
}

/**
 * Returns titles for a given list with pagination and sorting options
 * @param id
 * @param url
 * @param page
 * @param pageSize
 * @param numTitles
 * @param sort
 * @returns {Promise<{listTitles: *[], totalResults: number, curPage: number, totalPages: number, hasMore: boolean, sort: string, message: null}|{listTitles, totalResults, curPage, totalPages, hasMore: boolean, sort: string, message}>}
 */
export async function getListTitles(id, url = null, page, pageSize = 20, numTitles = 25, sort = 'dateAdded') {
     const client = createApiClient({ url, timeout: GLOBALS.timeoutAverage });

     const response = await client.post(
          '/ListAPI?method=getListTitles',
          {},
          {
               params: { id, page, pageSize, numTitles, sort_by: sort },
          }
     );

     if (response.ok) {
          const result = response.data?.result ?? {};
          return {
               listTitles: result.titles ?? [],
               totalResults: result.totalResults ?? 0,
               curPage: result.page_current ?? 0,
               totalPages: result.page_total ?? 0,
               hasMore: result.page_current !== result.page_total,
               sort,
               message: result.message ?? null,
          };
     }

     return {
          listTitles: [],
          totalResults: 0,
          curPage: 0,
          totalPages: 0,
          hasMore: false,
          sort,
          message: null,
     };
}

/**
 * Remove titles from an existing list for a user
 * @param listId
 * @param title
 * @param url
 * @param source
 * @returns {Promise<*>}
 */
export async function removeTitlesFromList(listId, title, url = null, source) {
     const client = createApiClient({ url, timeout: GLOBALS.timeoutAverage });

     const response = await client.post(
          '/ListAPI?method=removeTitlesFromList',
          {},
          {
               params: { listId, source, recordIds: title },
          }
     );

     if (response.ok) {
          await saveLastListUsed(listId);
          return response.data?.result;
     }
}

/**
 * Delete a list for a user with the option to hard delete instead of soft delete
 * @param listId
 * @param url
 * @param optOutOfSoftDeletion
 * @returns {Promise<*|undefined>}
 */
export async function deleteList(listId, url = null, optOutOfSoftDeletion = false) {
     const client = createApiClient({ url, timeout: GLOBALS.timeoutAverage });

     const response = await client.post(
          '/ListAPI?method=deleteList',
          {},
          {
               params: { id: listId, optOutOfSoftDeletion },
          }
     );

     return response.ok ? response.data?.result : undefined;
}

/** *******************************************************************
 * List Groups
 ******************************************************************* **/

/**
 * Returns all list groups for a given user
 * @param url
 * @returns {Promise<{ok: boolean, status: number, statusText: string, headers: {[p: string]: string}, data: Blob | string, config: {}}|{ok: boolean, status, problem: string, data, config: {}}|undefined>}
 */
export async function getListGroups(url = null) {
     const client = createApiClient({ url, timeout: GLOBALS.timeoutAverage });

     return await client.post('/ListAPI?method=getUserListGroups');
}

/**
 * Returns details about a given list group
 * @param listGroupId
 * @param url
 * @param page
 * @param limit
 * @param includePagination
 * @returns {Promise<{ok: boolean, status: number, statusText: string, headers: {[p: string]: string}, data: Blob | string, config: {}}|{ok: boolean, status, problem: string, data, config: {}}|undefined>}
 */
export async function getListGroupDetails(listGroupId, url = null, page = 1, limit = 20, includePagination = 1) {
     const client = createApiClient({ url, timeout: GLOBALS.timeoutAverage });

     return await client.post(
          '/ListAPI?method=getListGroupDetails',
          {},
          {
               params: { groupId: listGroupId, page, limit, includePagination },
          }
     );
}

/**
 * Creates a new list group for a user with the option to nest within an existing list group
 * @param title
 * @param nestedGroupId
 * @param url
 * @returns {Promise<{ok: boolean, status: number, statusText: string, headers: {[p: string]: string}, data: Blob | string, config: {}}|{ok: boolean, status, problem: string, data, config: {}}|undefined>}
 */
export async function createListGroup(title, nestedGroupId, url = null) {
     const client = createApiClient({ url, timeout: GLOBALS.timeoutAverage });

     return await client.post(
          '/ListAPI?method=createListGroup',
          {},
          {
               params: { title, nestedGroupId },
          }
     );
}

/**
 * Deletes a list group for a user
 * @param listGroupId
 * @param url
 * @returns {Promise<{ok: boolean, status: number, statusText: string, headers: {[p: string]: string}, data: Blob | string, config: {}}|{ok: boolean, status, problem: string, data, config: {}}|undefined>}
 */
export async function deleteListGroup(listGroupId, url = null) {
     const client = createApiClient({ url, timeout: GLOBALS.timeoutAverage });

     return await client.post(
          '/ListAPI?method=deleteListGroup',
          {},
          {
               params: { groupId: listGroupId },
          }
     );
}

/**
 * Edits a given list group
 * @param listGroupId
 * @param newTitle
 * @param url
 * @returns {Promise<{ok: boolean, status: number, statusText: string, headers: {[p: string]: string}, data: Blob | string, config: {}}|{ok: boolean, status, problem: string, data, config: {}}|undefined>}
 */
export async function editListGroup(listGroupId, newTitle, url = null) {
     const client = createApiClient({ url, timeout: GLOBALS.timeoutAverage });

     return await client.post(
          '/ListAPI?method=editListGroup',
          {},
          {
               params: { groupId: listGroupId, listGroupNameNew: newTitle },
          }
     );
}

/**
 * Edits the parent list group for a given nested list group
 * @param listGroupId
 * @param newParentListGroupId
 * @param url
 * @returns {Promise<{ok: boolean, status: number, statusText: string, headers: {[p: string]: string}, data: Blob | string, config: {}}|{ok: boolean, status, problem: string, data, config: {}}|undefined>}
 */
export async function editListGroupParent(listGroupId, newParentListGroupId, url = null) {
     const client = createApiClient({ url, timeout: GLOBALS.timeoutAverage });

     return await client.post(
          '/ListAPI?method=editListGroupParent',
          {},
          {
               params: { groupId: listGroupId, listGroupMove: newParentListGroupId },
          }
     );
}

/** *******************************************************************
 * Saved Searches
 ******************************************************************* **/

/**
 * Returns all saved searches for a given user
 * @param url
 * @param language
 * @returns {Promise<{ok: boolean, status: number, statusText: string, headers: {[p: string]: string}, data: Blob | string, config: {}}|{ok: boolean, status, problem: string, data, config: {}}|undefined>}
 */
export async function fetchSavedSearches(url = null, language = 'en') {
     const client = createApiClient({ url, language });

     return await client.post(
          '/ListAPI?method=getSavedSearchesForLiDA',
          {},
          {
               params: { checkIfValid: false, language },
          }
     );
}

/**
 * Returns details about a given saved search
 * @param id
 * @param language
 * @param url
 * @returns {Promise<*|*[]>}
 */
export async function getSavedSearch(id, language = 'en', url = null) {
     const client = createApiClient({ url, timeout: GLOBALS.timeoutAverage, language });

     const response = await client.post(
          '/ListAPI?method=getSavedSearchTitles',
          {},
          {
               params: { searchId: id, numTitles: 30, language },
          }
     );

     return response.ok ? (response.data?.result ?? []) : [];
}
