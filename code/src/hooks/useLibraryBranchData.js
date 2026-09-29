import React from 'react';
import {
     loadLocation, saveLocation,
     loadScope, saveScope,
     loadSelfCheckEnabled, saveSelfCheckEnabled,
     loadSelfCheckSettings, saveSelfCheckSettings,
     loadAvailableLocations, saveAvailableLocations,
     saveAllLibraryBranchData, loadAllLibraryBranchData,
} from '../util/db';

const subscribers = new Set();
const libraryBranchSnapshotCache = new Map();

function getSnapshotCacheKey(queryKey) {
     return JSON.stringify(queryKey ?? []);
}

function subscribeToLibraryBranchChanges(listener) {
     subscribers.add(listener);
     return () => subscribers.delete(listener);
}

function notifyLibraryBranchChanged(queryKey) {
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
          if (libraryBranchSnapshotCache.has(cacheKey)) {
               return libraryBranchSnapshotCache.get(cacheKey);
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
               libraryBranchSnapshotCache.set(cacheKey, nextData);
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

          return subscribeToLibraryBranchChanges((incomingKey) => {
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

export const LIBRARY_LOCATION_KEY = ['library_location'];
export const LIBRARY_SCOPE_KEY = ['library_scope'];
export const LIBRARY_SELF_CHECK_ENABLED_KEY = ['library_self_check_enabled'];
export const LIBRARY_SELF_CHECK_SETTINGS_KEY = ['library_self_check_settings'];
export const LIBRARY_AVAILABLE_LOCATIONS_KEY = ['library_available_locations'];
export const LIBRARY_ALL_BRANCH_DATA_KEY = ['library_all_branch_data'];

// ─── Read Hooks ───────────────────────────────────────────────────────────────

export function useLibraryLocation(options) {
     const { data } = useSqliteReadQuery(LIBRARY_LOCATION_KEY, loadLocation, options);
     return data ?? null;
}

export function useLibraryScope(options) {
     const { data } = useSqliteReadQuery(LIBRARY_SCOPE_KEY, loadScope, options);
     return data ?? '';
}

export function useSelfCheckEnabled(options) {
     const { data } = useSqliteReadQuery(LIBRARY_SELF_CHECK_ENABLED_KEY, loadSelfCheckEnabled, options);
     return data ?? false;
}

export function useSelfCheckSettings(options) {
     const { data } = useSqliteReadQuery(LIBRARY_SELF_CHECK_SETTINGS_KEY, loadSelfCheckSettings, options);
     return data ?? {};
}

export function useAvailableLocations(options) {
     const { data } = useSqliteReadQuery(LIBRARY_AVAILABLE_LOCATIONS_KEY, loadAvailableLocations, options);
     return normalizeLocationsList(data);
}

// Full query-object variants for callers that need isLoading / refetch / etc.
export const useLibraryLocationQuery = (options) =>
     useSqliteReadQuery(LIBRARY_LOCATION_KEY, loadLocation, options);

export const useLibraryScopeQuery = (options) =>
     useSqliteReadQuery(LIBRARY_SCOPE_KEY, loadScope, options);

export const useSelfCheckEnabledQuery = (options) =>
     useSqliteReadQuery(LIBRARY_SELF_CHECK_ENABLED_KEY, loadSelfCheckEnabled, options);

export const useSelfCheckSettingsQuery = (options) =>
     useSqliteReadQuery(LIBRARY_SELF_CHECK_SETTINGS_KEY, loadSelfCheckSettings, options);

export const useAvailableLocationsQuery = (options) =>
     useSqliteReadQuery(LIBRARY_AVAILABLE_LOCATIONS_KEY, loadAvailableLocations, options);

export const useAllLibraryBranchData = (options) =>
     useSqliteReadQuery(LIBRARY_ALL_BRANCH_DATA_KEY, loadAllLibraryBranchData, options);

/**
 * Combined hook that returns all library branch data fields as raw values.
 * Uses the all-in-one loader for efficiency.
 */
export function useLibraryBranchData() {
     const { data } = useAllLibraryBranchData();
     return {
          location: data?.location ?? null,
          scope: data?.scope ?? '',
          selfCheckEnabled: data?.enableSelfCheck ?? false,
          selfCheckSettings: data?.selfCheckSettings ?? {},
          availableLocations: normalizeLocationsList(data?.locations ?? data),
     };
}

// ─── Write Hooks ─────────────────────────────────────────────────────────────

/**
 * Returns a function that saves the current library location and refreshes the location query.
 */
export function useUpdateLibraryLocation() {
     return React.useCallback(async (location) => {
          await saveLocation(location);
          notifyLibraryBranchChanged(LIBRARY_LOCATION_KEY);
          notifyLibraryBranchChanged(LIBRARY_ALL_BRANCH_DATA_KEY);
     }, []);
}

/**
 * Returns a function that saves the search scope and refreshes the scope query.
 */
export function useUpdateLibraryScope() {
     return React.useCallback(async (scope) => {
          await saveScope(scope);
          notifyLibraryBranchChanged(LIBRARY_SCOPE_KEY);
          notifyLibraryBranchChanged(LIBRARY_ALL_BRANCH_DATA_KEY);
     }, []);
}

/**
 * Returns a function that saves self-check enabled status and refreshes the query.
 */
export function useUpdateSelfCheckEnabled() {
     return React.useCallback(async (enabled) => {
          await saveSelfCheckEnabled(enabled);
          notifyLibraryBranchChanged(LIBRARY_SELF_CHECK_ENABLED_KEY);
          notifyLibraryBranchChanged(LIBRARY_ALL_BRANCH_DATA_KEY);
     }, []);
}

/**
 * Returns a function that saves self-check settings and refreshes the query.
 */
export function useUpdateSelfCheckSettings() {
     return React.useCallback(async (settings) => {
          await saveSelfCheckSettings(settings);
          notifyLibraryBranchChanged(LIBRARY_SELF_CHECK_SETTINGS_KEY);
          notifyLibraryBranchChanged(LIBRARY_ALL_BRANCH_DATA_KEY);
     }, []);
}

/**
 * Returns a function that saves the available locations list and refreshes the query.
 */
export function useUpdateAvailableLocations() {
     return React.useCallback(async (locations) => {
          await saveAvailableLocations(locations);
          notifyLibraryBranchChanged(LIBRARY_AVAILABLE_LOCATIONS_KEY);
          notifyLibraryBranchChanged(LIBRARY_ALL_BRANCH_DATA_KEY);
     }, []);
}

/**
 * Returns a function that saves all library branch data at once and refreshes all queries.
 */
export function useUpdateAllLibraryBranchData() {
     return React.useCallback(async (data) => {
          await saveAllLibraryBranchData(data);
          notifyLibraryBranchChanged(LIBRARY_LOCATION_KEY);
          notifyLibraryBranchChanged(LIBRARY_SCOPE_KEY);
          notifyLibraryBranchChanged(LIBRARY_SELF_CHECK_ENABLED_KEY);
          notifyLibraryBranchChanged(LIBRARY_SELF_CHECK_SETTINGS_KEY);
          notifyLibraryBranchChanged(LIBRARY_AVAILABLE_LOCATIONS_KEY);
          notifyLibraryBranchChanged(LIBRARY_ALL_BRANCH_DATA_KEY);
     }, []);
}

// ─── Pre-hydration (bypass path) ─────────────────────────────────────────────

/**
 * Pre-populates module-level snapshot caches with branch data already loaded from SQLite.
 */
export function prehydrateLibraryBranchSnapshotCache(allData) {
     if (!allData) return;
     libraryBranchSnapshotCache.set(JSON.stringify(LIBRARY_LOCATION_KEY), allData.location ?? null);
     libraryBranchSnapshotCache.set(JSON.stringify(LIBRARY_SCOPE_KEY), allData.scope ?? '');
     libraryBranchSnapshotCache.set(JSON.stringify(LIBRARY_SELF_CHECK_ENABLED_KEY), allData.enableSelfCheck ?? false);
     libraryBranchSnapshotCache.set(JSON.stringify(LIBRARY_SELF_CHECK_SETTINGS_KEY), allData.selfCheckSettings ?? {});
     libraryBranchSnapshotCache.set(JSON.stringify(LIBRARY_AVAILABLE_LOCATIONS_KEY), normalizeLocationsList(allData.locations ?? []));
     libraryBranchSnapshotCache.set(JSON.stringify(LIBRARY_ALL_BRANCH_DATA_KEY), allData);
}

/**
 * Updates snapshot cache with fresh self-check data and notifies subscribers.
 * Call this after fetching fresh self-check settings from API (e.g., in Splash.js)
 * to ensure hooks read the fresh values instead of stale pre-hydrated cache.
 */
export function invalidateSelfCheckSnapshot(enabled, settings) {
     if (typeof enabled === 'boolean') {
          libraryBranchSnapshotCache.set(JSON.stringify(LIBRARY_SELF_CHECK_ENABLED_KEY), enabled);
     }
     if (typeof settings === 'object' && settings !== null) {
          libraryBranchSnapshotCache.set(JSON.stringify(LIBRARY_SELF_CHECK_SETTINGS_KEY), settings);
     }
     // Notify subscribers so hooks re-read from the updated cache
     notifyLibraryBranchChanged(LIBRARY_SELF_CHECK_ENABLED_KEY);
     notifyLibraryBranchChanged(LIBRARY_SELF_CHECK_SETTINGS_KEY);
     notifyLibraryBranchChanged(LIBRARY_ALL_BRANCH_DATA_KEY);
}


/**
 * Normalizes a value into an array of locations.
 * @param value
 * @returns {*|unknown[]|*[]}
 */
function normalizeLocationsList(value) {
     if (Array.isArray(value)) return value;

     if (value == null) return [];

     if (typeof value === 'object') {
          if (Array.isArray(value.locations)) return value.locations;
          if (Array.isArray(value.result?.locations)) return value.result.locations;
          return Object.values(value);
     }

     return [];
}

