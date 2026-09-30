import React from 'react';
import {
     saveBrowseCategories, loadBrowseCategories,
     saveBrowseCategoryList, loadBrowseCategoryList,
     saveMaxCategories, loadMaxCategories,
     updateBrowseCategoryVisibility,
     updateBrowseCategoryVisibilityBatch,
     saveAllBrowseCategoryData, loadAllBrowseCategoryData,
     resetAllBrowseCategoryData,
} from '../util/db';
import { logDebugMessage, logErrorMessage } from '../util/logging';

const subscribers = new Set();
const browseCategorySnapshotCache = new Map();
const EMPTY_ARRAY = [];

function getSnapshotCacheKey(queryKey) {
     return JSON.stringify(queryKey ?? []);
}

function subscribeToToBrowseCategoryChanges(listener) {
     subscribers.add(listener);
     return () => subscribers.delete(listener);
}

function notifyBrowseCategoryChanged(queryKey) {
     subscribers.forEach((listener) => {
          try {
               listener(queryKey);
          } catch (_error) {
               // Keep notification fan-out resilient to listener failures.
          }
     });
}

function isMatchingKey(targetKey, incomingKey) {
     if (!Array.isArray(targetKey) || !Array.isArray(incomingKey)) {
          return false;
     }
     if (targetKey.length === 0 || incomingKey.length === 0) {
          return false;
     }
     return targetKey[0] === incomingKey[0];
}

function useSqliteReadQuery(queryKey, queryFn, options = {}) {
     const {
          enabled = true,
          initialData,
          onSuccess,
          onError,
     } = options ?? {};

     const cacheKey = React.useMemo(() => getSnapshotCacheKey(queryKey), [queryKey]);
     const initialSnapshot = React.useMemo(() => {
          if (browseCategorySnapshotCache.has(cacheKey)) {
               return browseCategorySnapshotCache.get(cacheKey);
          }
          return initialData;
     }, [cacheKey, initialData]);

     const [data, setData] = React.useState(initialSnapshot);
     const [error, setError] = React.useState(null);
     const [isLoading, setIsLoading] = React.useState(Boolean(enabled));
     const [dataUpdatedAt, setDataUpdatedAt] = React.useState(0);
     const [errorUpdatedAt, setErrorUpdatedAt] = React.useState(0);

     const load = React.useCallback(async () => {
          if (!enabled) {
               return data;
          }

          setIsLoading(true);
          try {
               const nextData = await queryFn();
               browseCategorySnapshotCache.set(cacheKey, nextData);
               setData(nextData);
               setError(null);
               const now = Date.now();
               setDataUpdatedAt(now);
               if (typeof onSuccess === 'function') {
                    onSuccess(nextData);
               }
               return nextData;
          } catch (e) {
               setError(e);
               const now = Date.now();
               setErrorUpdatedAt(now);
               if (typeof onError === 'function') {
                    onError(e);
               }
               throw e;
          } finally {
               setIsLoading(false);
          }
     }, [enabled, queryFn, onSuccess, onError, cacheKey]);

     React.useEffect(() => {
          if (!enabled) {
               setIsLoading(false);
               return;
          }
          load().catch(() => {
               // Error is already captured in state.
          });
     }, [enabled, load]);

     React.useEffect(() => {
          if (!enabled) {
               return undefined;
          }

          return subscribeToToBrowseCategoryChanges((incomingKey) => {
               if (isMatchingKey(queryKey, incomingKey)) {
                    load().catch(() => {
                         // Error is already captured in state.
                    });
               }
          });
     }, [enabled, queryKey, load]);

     return {
          data,
          error,
          isLoading,
          isFetching: isLoading,
          isSuccess: !isLoading && !error,
          isError: Boolean(error),
          status: isLoading ? 'loading' : error ? 'error' : 'success',
          dataUpdatedAt,
          errorUpdatedAt,
          refetch: load,
     };
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const BROWSE_CATEGORIES_KEY = ['browse_categories'];
export const BROWSE_CATEGORY_LIST_KEY = ['browse_category_list'];
export const BROWSE_MAX_CATEGORIES_KEY = ['browse_max_categories'];
export const BROWSE_ALL_DATA_KEY = ['browse_all_data'];

// ─── Read Hooks ───────────────────────────────────────────────────────────────

/**
 * Load browse categories with cache expiration info
 */
export function useBrowseCategoriesQuery(options) {
     const loadWithExpiry = React.useCallback(async () => {
          return await loadBrowseCategories();
     }, []);
     return useSqliteReadQuery(BROWSE_CATEGORIES_KEY, loadWithExpiry, options);
}

/**
 * Simple hook returning just the categories array
 */
export function useBrowseCategories(options) {
     const { data } = useBrowseCategoriesQuery(options);
     return data?.data ?? EMPTY_ARRAY;
}

/**
 * Load category list with cache expiration info
 */
export function useBrowseCategoryListQuery(options) {
     const loadWithExpiry = React.useCallback(async () => {
          return await loadBrowseCategoryList();
     }, []);
     return useSqliteReadQuery(BROWSE_CATEGORY_LIST_KEY, loadWithExpiry, options);
}

/**
 * Simple hook returning just the category list array
 */
export function useBrowseCategoryList(options) {
     const { data } = useBrowseCategoryListQuery(options);
     return data?.data ?? EMPTY_ARRAY;
}

/**
 * Load max categories preference
 */
export function useMaxCategoriesQuery(options) {
     return useSqliteReadQuery(BROWSE_MAX_CATEGORIES_KEY, loadMaxCategories, options);
}

/**
 * Simple hook returning just the max categories number
 */
export function useMaxCategories(options) {
     const { data } = useMaxCategoriesQuery(options);
     return data ?? 5;
}

/**
 * Full query-object variants for callers that need isLoading / refetch / etc.
 */
export const useAllBrowseCategoryData = (options) =>
     useSqliteReadQuery(BROWSE_ALL_DATA_KEY, loadAllBrowseCategoryData, options);

// ─── Write Hooks ─────────────────────────────────────────────────────────────

/**
 * Returns a function that saves browse categories and refreshes the query.
 */
export function useUpdateBrowseCategories() {
     return React.useCallback(async (categories) => {
          const saved = await saveBrowseCategories(categories);
          if (saved) {
               notifyBrowseCategoryChanged(BROWSE_CATEGORIES_KEY);
               notifyBrowseCategoryChanged(BROWSE_ALL_DATA_KEY);
          } else {
               logDebugMessage('Skipped browse category write due to invalid payload shape');
          }
     }, []);
}

/**
 * Returns a function that saves browse category list and refreshes the query.
 */
export function useUpdateBrowseCategoryList() {
     return React.useCallback(async (list) => {
          const saved = await saveBrowseCategoryList(list);
          if (saved) {
               notifyBrowseCategoryChanged(BROWSE_CATEGORY_LIST_KEY);
               notifyBrowseCategoryChanged(BROWSE_ALL_DATA_KEY);
          } else {
               logDebugMessage('Skipped browse category list write due to invalid payload shape');
          }
     }, []);
}

/**
 * Returns a function that saves max categories and refreshes the query.
 */
export function useUpdateMaxCategories() {
     return React.useCallback(async (maxNum) => {
          await saveMaxCategories(maxNum);
          notifyBrowseCategoryChanged(BROWSE_MAX_CATEGORIES_KEY);
          notifyBrowseCategoryChanged(BROWSE_ALL_DATA_KEY);
     }, []);
}

/**
 * Returns a function that saves all browse category data at once and refreshes all queries.
 */
export function useUpdateAllBrowseCategoryData() {
     return React.useCallback(async (data) => {
          await saveAllBrowseCategoryData(data);
          notifyBrowseCategoryChanged(BROWSE_CATEGORIES_KEY);
          notifyBrowseCategoryChanged(BROWSE_CATEGORY_LIST_KEY);
          notifyBrowseCategoryChanged(BROWSE_MAX_CATEGORIES_KEY);
          notifyBrowseCategoryChanged(BROWSE_ALL_DATA_KEY);
     }, []);
}

/**
 * Optimistic update for toggling category visibility (hide/show).
 * Immediately updates SQLite and UI, then fires API call in background.
 * If API fails, reverts the change.
 */
export function useToggleBrowseCategoryVisibility() {
     return React.useCallback(async (categoryKey, isHidden, apiCall) => {
          try {
               // Step 1: Immediately update SQLite (optimistic)
               await updateBrowseCategoryVisibility(categoryKey, isHidden);

               // Notify subscribers to update UI immediately
               notifyBrowseCategoryChanged(BROWSE_CATEGORY_LIST_KEY);
               notifyBrowseCategoryChanged(BROWSE_ALL_DATA_KEY);

               // Step 2: Fire API request in background
               if (typeof apiCall === 'function') {
                    try {
                         const response = await apiCall();
                         // API succeeded, data is already updated in SQLite
                         logDebugMessage(`Category ${categoryKey} visibility updated successfully`);
                         return { success: true, response };
                    } catch (apiError) {
                         // Step 3: API failed, revert the change
                         logErrorMessage(`Failed to update category visibility: ${apiError.message}`);
                         await updateBrowseCategoryVisibility(categoryKey, !isHidden);
                         notifyBrowseCategoryChanged(BROWSE_CATEGORY_LIST_KEY);
                         notifyBrowseCategoryChanged(BROWSE_ALL_DATA_KEY);
                         return { success: false, error: apiError };
                    }
               }
               return { success: true };
          } catch (error) {
               logErrorMessage(`Error toggling category visibility: ${error.message}`);
               return { success: false, error };
          }
     }, []);
}

/**
 * Optimistic update for toggling multiple categories at once.
 * Applies all local visibility changes in one SQLite write and refresh event.
 */
export function useToggleBrowseCategoryVisibilityBatch() {
     return React.useCallback(async (categoryKeys, isHidden) => {
          try {
               const updated = await updateBrowseCategoryVisibilityBatch(categoryKeys, isHidden);
               if (!updated) {
                    return { success: false, error: new Error('No matching categories found for visibility update') };
               }

               notifyBrowseCategoryChanged(BROWSE_CATEGORY_LIST_KEY);
               notifyBrowseCategoryChanged(BROWSE_ALL_DATA_KEY);

               return { success: true };
          } catch (error) {
               logErrorMessage(`Error toggling category visibility batch: ${error.message}`);
               return { success: false, error };
          }
     }, []);
}

/**
 * Returns a function that resets all browse category data (typically on logout).
 */
export function useResetBrowseCategoryData() {
     return React.useCallback(async () => {
          await resetAllBrowseCategoryData();
          notifyBrowseCategoryChanged(BROWSE_CATEGORIES_KEY);
          notifyBrowseCategoryChanged(BROWSE_CATEGORY_LIST_KEY);
          notifyBrowseCategoryChanged(BROWSE_MAX_CATEGORIES_KEY);
          notifyBrowseCategoryChanged(BROWSE_ALL_DATA_KEY);
     }, []);
}

/**
 * Utility to check if browse categories data is expired (> 48 hours)
 */
export function useBrowseCategoryExpiration() {
     const { data } = useAllBrowseCategoryData();
     return React.useMemo(() => ({
          categoriesExpired: data?.categoriesExpired ?? false,
          listExpired: data?.listExpired ?? false,
     }), [data?.categoriesExpired, data?.listExpired]);
}
