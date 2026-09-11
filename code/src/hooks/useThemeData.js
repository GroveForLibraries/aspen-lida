import React from 'react';
import {
     loadThemeState,
     saveThemeState,
     saveThemeColors,
     saveThemeColorMode,
     resetThemeState,
     loadThemeCatalog,
} from '../util/db';

const subscribers = new Set();
const themeSnapshotCache = new Map();
const inFlightLoads = new Map();

function getSnapshotCacheKey(queryKey) {
     return JSON.stringify(queryKey ?? []);
}

function subscribeToThemeChanges(listener) {
     subscribers.add(listener);
     return () => subscribers.delete(listener);
}

function notifyThemeChanged(queryKey) {
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
          if (themeSnapshotCache.has(cacheKey)) {
               return themeSnapshotCache.get(cacheKey);
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
               let loadPromise = inFlightLoads.get(cacheKey);
               if (!loadPromise) {
                    loadPromise = queryFn();
                    inFlightLoads.set(cacheKey, loadPromise);
                    loadPromise.finally(() => {
                         if (inFlightLoads.get(cacheKey) === loadPromise) {
                              inFlightLoads.delete(cacheKey);
                         }
                    });
               }
               const nextData = await loadPromise;
               themeSnapshotCache.set(cacheKey, nextData);
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

          return subscribeToThemeChanges((incomingKey) => {
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

export const THEME_STATE_KEY = ['theme_state'];

export const useThemeStateQuery = (options) =>
     useSqliteReadQuery(THEME_STATE_KEY, loadThemeState, options);

export function useThemeState(options) {
     const { data } = useThemeStateQuery(options);
     // Derive textColor from colorMode rather than reading the stored value.
     // Stored values can be in inconsistent formats ('textLight50', '$warmGray600', etc.)
     // and may not match the current colorMode if saved by a different code path.
     const colorMode = data?.colorMode ?? 'light';
     return {
          themeId: data?.themeId ?? null,
          locationId: data?.locationId ?? null,
          colorMode,
          textColor: colorMode === 'dark' ? '#e5e7eb' : '#57534e',
          themeColors: data?.themeColors ?? null,
          header: data?.header ?? null,
          updatedAt: data?.updatedAt ?? 0,
     };
}

export function useUpdateThemeState() {
     return React.useCallback(async (state) => {
          await saveThemeState(state ?? {});
          notifyThemeChanged(THEME_STATE_KEY);
     }, []);
}

export function useUpdateThemeColors() {
     return React.useCallback(async (themeColors, themeId, locationId, header) => {
          await saveThemeColors(themeColors, themeId, locationId, header);
          notifyThemeChanged(THEME_STATE_KEY);
     }, []);
}

export function useUpdateThemeColorMode() {
     return React.useCallback(async (colorMode) => {
          await saveThemeColorMode(colorMode);
          notifyThemeChanged(THEME_STATE_KEY);
     }, []);
}

export function useResetThemeState() {
     return React.useCallback(async () => {
          await resetThemeState();
          notifyThemeChanged(THEME_STATE_KEY);
     }, []);
}

export const THEME_CATALOG_KEY = ['theme_catalog'];

export function useThemeCatalogQuery(locationId, options) {
     const queryKey = React.useMemo(() => [...THEME_CATALOG_KEY, locationId ?? null], [locationId]);
     const enabled = (options?.enabled ?? true) && locationId != null;
     const queryFn = React.useCallback(() => loadThemeCatalog(locationId), [locationId]);
     return useSqliteReadQuery(queryKey, queryFn, { ...options, enabled });
}

export function useAvailableThemes(locationId, options) {
     const { data } = useThemeCatalogQuery(locationId, options);
     return data ?? [];
}

/**
 * Notify any mounted useAvailableThemes subscribers that the stored theme_catalog has changed.
 * Plain function (not a hook) so non-component callers, like getThemeInfo's network refresh, can call it too.
 */
export function notifyThemeCatalogChanged() {
     notifyThemeChanged(THEME_CATALOG_KEY);
}
