import React from 'react';
import { useDataSync } from '../hooks/useDataSync';
import { useLibrary } from '../hooks/useLibrarySystemData';
import {
     useActiveLanguage,
     useAvailableLanguages,
     useUpdateActiveLanguage,
     useUpdateAvailableLanguages,
     useUpdateDictionary,
     useUpdateLanguageDisplayName } from '../hooks/useLanguageData';
import { useUpdateLibraryVersion } from '../hooks/useLibrarySystemData';

/**
 * Mounted once on the startup-cache-bypass path (see navigation.js/Splash.js's
 * canBypassLoading + LaunchStackNavigator/DrawerNavigator). Silently refreshes
 * whichever cache domain evaluateStartupCache() flagged as stale or missing,
 * using the same fetch-and-persist logic Loading.js already runs in the
 * background whenever a single domain is stale - just runnable without
 * mounting the blocking LoadingScreen.
 */
export const BackgroundCacheRefresher = ({ startupCache }) => {
     const hasRunRef = React.useRef(false);

     const library = useLibrary();
     const language = useActiveLanguage();
     const languages = useAvailableLanguages();
     const updateLanguage = useUpdateActiveLanguage();
     const updateLanguageDisplayName = useUpdateLanguageDisplayName();
     const updateLanguages = useUpdateAvailableLanguages();
     const updateDictionary = useUpdateDictionary();
     const updateLibraryVersion = useUpdateLibraryVersion();

     const {
          fetchAndPersistUserData,
          fetchAndPersistLibraryBranchData,
          fetchAndPersistLibrarySystemData,
          fetchAndPersistLanguageData,
     } = useDataSync({
          library,
          language,
          languages,
          updateLanguage,
          updateLanguageDisplayName,
          updateLanguages,
          updateDictionary,
          updateLibraryVersion,
     });

     React.useEffect(() => {
          if (hasRunRef.current || !startupCache) return;
          hasRunRef.current = true;

          if (startupCache.shouldRefreshUserInBackground) {
               fetchAndPersistUserData({ runInBackground: true });
          }
          if (startupCache.shouldRefreshLibraryBranchInBackground) {
               fetchAndPersistLibraryBranchData({ runInBackground: true });
          }
          if (startupCache.shouldRefreshLibrarySystemInBackground) {
               fetchAndPersistLibrarySystemData({ runInBackground: true });
          }
          if (startupCache.shouldRefreshLanguageInBackground) {
               fetchAndPersistLanguageData({ runInBackground: true });
          }
     }, [startupCache, fetchAndPersistUserData, fetchAndPersistLibraryBranchData, fetchAndPersistLibrarySystemData, fetchAndPersistLanguageData]);

     return null;
};
