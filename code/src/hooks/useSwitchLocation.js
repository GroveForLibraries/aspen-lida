import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { numberOrNull } from '../helpers/helpers';
import { GLOBALS, LIBRARY } from '../util/globals';
import { locationRowExists, setCurrentLibraryId } from '../util/db';
import { getLocationInfo, getSelfCheckSettings, getLibraryInfo, normalizeBooleanLike } from '../util/api/system';
import { getHomeScreenFeed } from '../util/api/search';
import { logDebugMessage, logErrorMessage } from '../util/logging';
import { useUpdateLibraryLocation } from './useLibraryBranchData';
import { useUpdateSelfCheckEnabled, useUpdateSelfCheckSettings } from './useLibraryBranchData';
import { useUpdateLibrary, useUpdateHomeScreenLinks } from './useLibrarySystemData';
import { useUpdateBrowseCategories, useUpdateMaxCategories } from './useBrowseCategoryData';

function resolveSelfCheckEnabled(result = {}) {
     const candidates = [
          result?.settings?.isEnabled,
          result?.settings?.enableSelfCheck,
          result?.settings?.selfCheckEnabled,
          result?.isEnabled,
          result?.enableSelfCheck,
          result?.selfCheckEnabled,
     ];

     for (const candidate of candidates) {
          const normalized = normalizeBooleanLike(candidate);
          if (typeof normalized === 'boolean') {
               return normalized;
          }
     }

     return undefined;
}

/**
 * Returns a function that fully switches the app's "active" location to the
 * given location, while keeping all the location-scoped caches used around the app in sync.
 *
 * @returns {function(object, object): Promise<object>} an async function (location, currentLibrary) =>
 *      Promise<object>
 */
export function useSwitchLocation() {
     const updateLibraryLocation = useUpdateLibraryLocation();
     const updateSelfCheckEnabled = useUpdateSelfCheckEnabled();
     const updateSelfCheckSettings = useUpdateSelfCheckSettings();
     const updateLibrary = useUpdateLibrary();
     const updateHomeScreenLinks = useUpdateHomeScreenLinks();
     const updateBrowseCategories = useUpdateBrowseCategories();
     const updateMaxCategories = useUpdateMaxCategories();

     return React.useCallback(async (location, currentLibrary) => {
          const targetLocationId = numberOrNull(location?.locationId);
          if (targetLocationId == null) {
               throw new Error('Cannot switch location: missing locationId');
          }

          const fallbackBaseUrl = location?.baseUrl || currentLibrary?.baseUrl || LIBRARY.url;

          let locationToSave = location;
          const exists = await locationRowExists(targetLocationId);
          if (!exists) {
               logDebugMessage('No cached row for location ' + targetLocationId + ', fetching location info before switching.');
               const response = await getLocationInfo(fallbackBaseUrl, targetLocationId);
               if (response?.ok && response.data?.result?.location) {
                    locationToSave = response.data.result.location;
               }
          }

          const resolvedBaseUrl = locationToSave?.baseUrl || fallbackBaseUrl;
          const targetLibraryId = numberOrNull(locationToSave?.libraryId);
          const isDifferentLibrary = targetLibraryId != null && targetLibraryId !== numberOrNull(currentLibrary?.libraryId);

          await updateLibraryLocation(locationToSave);

          await SecureStore.setItemAsync('locationId', JSON.stringify(targetLocationId));
          await AsyncStorage.setItem('@locationId', JSON.stringify(targetLocationId));

          if (locationToSave?.solrScope) {
               GLOBALS.solrScope = locationToSave.solrScope;
               await SecureStore.setItemAsync('solrScope', locationToSave.solrScope);
               await AsyncStorage.setItem('@solrScope', locationToSave.solrScope);
          }

          if (isDifferentLibrary && resolvedBaseUrl) {
               logDebugMessage('Switching to location ' + targetLocationId + ' on a different library (' + targetLibraryId + '), updating active library.');
               LIBRARY.url = resolvedBaseUrl;
               setCurrentLibraryId(targetLibraryId);
               await SecureStore.setItemAsync('library', JSON.stringify(targetLibraryId));
               await AsyncStorage.setItem('@libraryId', JSON.stringify(targetLibraryId));
               await AsyncStorage.setItem('@pathUrl', resolvedBaseUrl);

               try {
                    const libraryResponse = await getLibraryInfo(resolvedBaseUrl, targetLibraryId);
                    if (libraryResponse?.ok && libraryResponse.data?.result?.library) {
                         await updateLibrary(libraryResponse.data.result.library);
                    }
               } catch (error) {
                    logErrorMessage(error);
               }
          }

          try {
               const selfCheckResponse = await getSelfCheckSettings(resolvedBaseUrl, targetLocationId);
               if (selfCheckResponse?.ok) {
                    const result = selfCheckResponse.data?.result ?? {};
                    const enabled = resolveSelfCheckEnabled(result);
                    if (typeof enabled === 'boolean') {
                         await updateSelfCheckEnabled(enabled);
                    }
                    if (result?.settings && typeof result.settings === 'object') {
                         await updateSelfCheckSettings(result.settings);
                    }
               }
          } catch (error) {
               logErrorMessage(error);
          }

          try {
               const feedResponse = await getHomeScreenFeed(5, resolvedBaseUrl);
               if (feedResponse?.ok) {
                    const result = feedResponse.data?.result ?? {};
                    await updateBrowseCategories(result.browseCategories ?? []);
                    await updateHomeScreenLinks(result.homeScreenLinks ?? []);
                    await updateMaxCategories(5);
               }
          } catch (error) {
               logErrorMessage(error);
          }

          return locationToSave;
     }, [updateLibraryLocation, updateSelfCheckEnabled, updateSelfCheckSettings, updateLibrary, updateHomeScreenLinks, updateBrowseCategories, updateMaxCategories]);
}

