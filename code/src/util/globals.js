import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';

const iOSDist = Constants.expoConfig.ios.buildNumber;
const androidDist = Constants.expoConfig.android.versionCode;
const iOSBundle = Constants.expoConfig.ios.bundleIdentifier;
const androidBundle = Constants.expoConfig.android.package;
const releaseChannel = Updates.channel ?? Updates.releaseChannel;

/**
 * Global constants and configuration for the application, including timeouts, app version, build information, session ID, patch and stage information, library settings, theme settings, and other global variables used throughout the app.
 * @type {{timeoutAverage: number, timeoutSlow: number, timeoutFast: number, appVersion: string, appBuild: number|string, appSessionId: *, appPatch: any, appStage: any, showSelectLibrary: boolean, runGreenhouse: boolean, slug: string, url: any, releaseChannel: string|string|*, language: string, country: string, lastSeen: null, prevLaunched: boolean, pendingSearchFilters: *[], availableFacetClusters: *[], hasPendingChanges: boolean, solrScope: string, libraryId: any, themeId: any, bundleId: string, greenhouse: any, privacyPolicy: string, iosStoreUrl: any, androidStoreUrl: any, logLevel: number|number}}
 */
export const GLOBALS = {
     timeoutAverage: 60000,
     timeoutSlow: 100000,
     timeoutFast: 30000,
     appVersion: Constants.expoConfig.version,
     appBuild: Platform.OS === 'android' ? androidDist : iOSDist,
     appSessionId: Constants.expoConfig.sessionid,
     appPatch: Constants.expoConfig.extra.patch,
     appStage: Constants.expoConfig.extra.stage,
     showSelectLibrary: true,
     runGreenhouse: true,
     slug: Constants.expoConfig.slug,
     url: Constants.expoConfig.extra.apiUrl,
     releaseChannel: __DEV__ ? 'DEV' : releaseChannel,
     language: 'en',
     country: 'us',
     lastSeen: null,
     prevLaunched: false,
     pendingSearchFilters: [],
     availableFacetClusters: [],
     hasPendingChanges: false,
     solrScope: 'unknown',
     libraryId: Constants.expoConfig.extra.libraryId,
     themeId: Constants.expoConfig.extra.themeId,
     bundleId: Platform.OS === 'android' ? androidBundle : iOSBundle,
     greenhouse: Constants.expoConfig.extra.greenhouseUrl,
     privacyPolicy: 'https://bywatersolutions.com/lida-app-privacy-policy',
     iosStoreUrl: Constants.expoConfig.extra.iosStoreUrl,
     androidStoreUrl: Constants.expoConfig.extra.androidStoreUrl,
     logLevel: !Constants.expoConfig.extra.logLevel ? 0 : parseInt(Constants.expoConfig.extra.logLevel)
};

/**
 * Global login data and state for the application, including flags for showing the library selection, running Greenhouse, the number of libraries, nearby and all locations, extra data, pending changes, initial data loading status, and theme saving status.
 * @type {{showSelectLibrary: boolean, runGreenhouse: boolean, num: number, nearbyLocations: *[], allLocations: *[], extra: *[], hasPendingChanges: boolean, loadedInitialData: boolean, themeSaved: boolean}}
 */
export const LOGIN_DATA = {
     showSelectLibrary: true,
     runGreenhouse: true,
     num: 0,
     nearbyLocations: [],
     allLocations: [],
     extra: [],
     hasPendingChanges: false,
     loadedInitialData: false,
     themeSaved: false,
};

/**
 * Global search state and parameters for the application, including the search term, ID, pending changes, sort method, applied filters, sort list, available facets, default facets, pending filters, appended parameters, pending parameters, search source, and search index.
 * @type {{term: null, id: null, hasPendingChanges: boolean, sortMethod: string, appliedFilters: *[], sortList: *[], availableFacets: *[], defaultFacets: *[], pendingFilters: *[], appendedParams: string, pendingParams: *[], searchSource: string, searchIndex: string}}
 */
export const SearchGlobal = {
     term: null,
     id: null,
     hasPendingChanges: false,
     sortMethod: 'relevance',
     appliedFilters: [],
     sortList: [],
     availableFacets: [],
     defaultFacets: [],
     pendingFilters: [],
     appendedParams: '',
     pendingParams: [],
     searchSource: 'local',
     searchIndex: 'Keyword',
};

/**
 * Global library information and settings for the application, including the library URL, name, favicon, supported languages, local illustrations, ID, version, app settings URL, app settings slug, and app settings.
 * @type {{url: string, name: string, favicon: string, languages: *[], localIll: *[], id: number, version: null, appSettingsUrl: null, appSettingsSlug: null, appSettings: null}}
 */
export const LIBRARY = {
     url: '',
     name: '',
     favicon: '',
     languages: [],
     localIll: [],
     id: 0,
     version: null,
     appSettingsUrl: null,
     appSettingsSlug: null,
     appSettings: null,
};


/**
 * Whether this app build is a branded (library-specific) app rather than the generic Aspen LiDA app.
 * Branded apps use per-location theme catalogs (getAspenLiDAThemesByLocation) instead of the
 * single static app-config themeId.
 * @returns {boolean}
 */
export function isBrandedApp() {
     return !GLOBALS.slug.startsWith('aspen-lida') || GLOBALS.slug === 'aspen-lida-bws';
}

