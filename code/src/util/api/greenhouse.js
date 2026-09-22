import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { GLOBALS } from '../globals';
import { createApiClient } from './apiFactory';
import { Platform } from 'react-native';
import { getAppSettings } from './system';
import { logDebugMessage } from '../logging';
import { setCurrentLibraryId } from '../db';
import { numberOrNull } from '../../helpers/helpers';

/**
 * Determines the appropriate Greenhouse API configuration based on the app's slug and release channel, and whether the app is branded or not
 * @returns {{url: any, channel: string, method: string, isBranded: boolean}}
 */
function resolveGreenhouseConfig() {
     const slug = GLOBALS.slug;
     const isBranded = !slug.startsWith('aspen-lida') || slug === 'aspen-lida-bws';

     const url = isBranded ? Constants.expoConfig.extra.apiUrl : Constants.expoConfig.extra.greenhouseUrl;

     let channel = GLOBALS.releaseChannel;
     if (['DEV', 'alpha', 'beta', 'internal'].includes(channel)) {
          channel = 'any';
     }

     if (slug === 'aspen-lida-alpha') channel = 'alpha';
     else if (slug === 'aspen-lida-beta') channel = 'beta';
     else if (slug === 'aspen-lida-zeta') channel = 'zeta';
     else if (slug === 'aspen-lida-bws') channel = 'any';

     const method = isBranded ? 'getLibrary' : 'getLibraries';

     return { url, channel, method, isBranded };
}

/**
 * Updates Aspen LiDA Build Tracker with patch information
 * @param {string} updateId
 * @param {string} updateChannel
 * @param {date} updateDate
 * @returns {Promise<void>}
 **/
export async function updateAspenLiDABuild(updateId, updateChannel, updateDate) {
     const greenhouseUrl = Constants.expoConfig.extra.greenhouseUrl;
     const iOSDist = Constants.expoConfig.ios.buildNumber;
     const androidDist = Constants.expoConfig.android.versionCode;
     const patch = GLOBALS.appStage === '' ? GLOBALS.appPatch : `${GLOBALS.appStage} ${GLOBALS.appPatch}`.trim();
     const client = createApiClient({ url: greenhouseUrl, timeout: GLOBALS.timeoutFast });
     await client.post(
          '/GreenhouseAPI?method=updateAspenLiDABuild',
          {},
          {
               params: {
                    app: Constants.expoConfig.name,
                    version: Constants.expoConfig.version,
                    build: Platform.OS === 'android' ? androidDist : iOSDist,
                    channel: __DEV__ ? 'development' : updateChannel,
                    platform: Platform.OS,
                    id: updateId,
                    patch,
                    timestamp: updateDate,
               },
          }
     );
}

/**
 * Fetches nearby libraries from Greenhouse based on patron's location and release channel, and determines if the select library screen should be shown
 * @returns {Promise<{success: boolean, libraries, shouldShowSelectLibrary: boolean}|{success: boolean, shouldShowSelectLibrary: boolean, libraries: *[]}>}
 */
export async function fetchNearbyLibrariesFromGreenhouse() {
     logDebugMessage("Getting nearby libraries from the greenhouse");
     const { url, channel, method, isBranded } = resolveGreenhouseConfig();
     let latitude = null;
     let longitude = null;

     try {
          latitude = await SecureStore.getItemAsync('latitude');
          longitude = await SecureStore.getItemAsync('longitude');
     } catch (e) {
          logDebugMessage(e);
     }

     const client = createApiClient({ url, timeout: GLOBALS.timeoutSlow });

     const response = await client.get(`/GreenhouseAPI?method=${method}`, {
          latitude,
          longitude,
          release_channel: channel,
     });

     if (response.ok) {
          const data = response.data?.result;

          let libraries = method == 'getLibraries' ? data.libraries : Object.values(data.library ?? {});

          libraries = [...(libraries ?? [])].sort((a, b) => {
               if (a.distance !== b.distance) return (a.distance ?? 0) - (b.distance ?? 0);
               if (a.name !== b.name) return (a.name ?? '').localeCompare(b.name ?? '');
               return (a.librarySystem ?? '').localeCompare(b.librarySystem ?? '');
          });

          let showSelectLibrary = data.count > 1;

          if (isBranded) {
               logDebugMessage("Getting branded app settings");
               const resolvedLibraryId = numberOrNull(libraries?.[0]?.libraryId);
               if (resolvedLibraryId != null) {
                    setCurrentLibraryId(resolvedLibraryId);
               }
               const appSettings = await getAppSettings(GLOBALS.url, GLOBALS.timeoutAverage, GLOBALS.slug);
               logDebugMessage(appSettings);

               const autoPickUserHomeLocation = appSettings?.autoPickUserHomeLocation ?? false;
               logDebugMessage(`autoPickUserHomeLocation: ${autoPickUserHomeLocation}`);

               if (autoPickUserHomeLocation) {
                    showSelectLibrary = false;
               }
          }

          return {
               success: true,
               libraries: libraries ?? [],
               shouldShowSelectLibrary: showSelectLibrary,
          };
     }

     return {
          success: false,
          shouldShowSelectLibrary: false,
          libraries: [],
     };
}

export async function fetchAllLibrariesFromGreenhouse() {
     const { url, channel } = resolveGreenhouseConfig();

     const client = createApiClient({ url, timeout: GLOBALS.timeoutSlow });

     const response = await client.get('/GreenhouseAPI?method=getLibraries', {
          release_channel: channel,
     });

     if (response.ok) {
          const data = response.data?.result;
          const libraries = [...(data.libraries ?? [])].sort((a, b) => {
               if (a.name !== b.name) return (a.name ?? '').localeCompare(b.name ?? '');
               return (a.librarySystem ?? '').localeCompare(b.librarySystem ?? '');
          });

          return {
               success: true,
               libraries: libraries ?? [],
          };
     }

     return {
          success: false,
          libraries: [],
     };
}
