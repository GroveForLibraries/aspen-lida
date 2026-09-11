import { LIBRARY, isBrandedApp } from '../globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logDebugMessage, logErrorMessage, logInfoMessage, logWarnMessage } from '../logging';
import { GLOBALS } from '../globals';
import { popToast } from '../../components/feedback';
import { createApiClient } from './apiFactory';
import { generateSwatches, buildSwatchFromThemeTokens } from '../../helpers/helpers';
import { getTermFromDictionary } from '../../translations/TranslationHelper';
import { notifyThemeCatalogChanged } from '../../hooks/useThemeData';

/**
 * Return basic information about the library
 * @param url
 * @param id
 * @returns {Promise<*|{ok: boolean, status, problem: string, data, config: {}}>}
 */
export async function getLibraryInfo(url = null, id = null) {
     let libraryId;

     try {
          libraryId = await AsyncStorage.getItem('@libraryId');
     } catch (e) {
          logErrorMessage('Error loading library info');
          logErrorMessage(e);
     }

     if (id) {
          libraryId = id;
     }

     if (typeof libraryId === 'string') {
          libraryId = libraryId.replace(/['"]+/g, '');
          libraryId = parseInt(libraryId, 10);
     }

     const client = createApiClient({ url, timeout: GLOBALS.timeoutFast });

     let result = await client.get('/SystemAPI?method=getLibraryInfo', { id: libraryId });

     if (result?.data?.result?.success === false && result?.data?.result?.message === 'Library not found') {
          logDebugMessage('Original library ID not found, trying global library ID');
          libraryId = GLOBALS.libraryId;
          result = await client.get('/SystemAPI?method=getLibraryInfo', { id: libraryId });
     }

     return result;
}

/**
 * Return list of library menu links
 * @param url
 * @returns {Promise<*|{ok: boolean, status, problem: string, data, config: {}}|undefined>}
 */
export async function getLibraryLinks(url = null) {
     const client = createApiClient({ url, timeout: GLOBALS.timeoutFast });
     return await client.post('/SystemAPI?method=getLibraryLinks');
}

/**
 * Return list of available languages
 * @param url
 * @returns {Promise<*|{ok: boolean, status, problem: string, data, config: {}}|undefined>}
 */
export async function getLibraryLanguages(url = null) {
     const client = createApiClient({ url, timeout: GLOBALS.timeoutFast });
     return await client.get('/SystemAPI?method=getLanguages');
}

/**
 * Normalizes getLanguages payloads into an array of language rows.
 */
export function normalizeLibraryLanguagesPayload(rawLanguages) {
     if (Array.isArray(rawLanguages)) {
          return rawLanguages;
     }

     if (rawLanguages && typeof rawLanguages === 'object') {
          return Object.values(rawLanguages);
     }

     return [];
}

/**
 * Return array of pre-validated system messages
 * @param libraryId
 * @param locationId
 * @param url
 * @returns {Promise<*|{ok: boolean, status, problem: string, data, config: {}}|undefined>}
 */
export async function getSystemMessages(libraryId = null, locationId = null, url = null) {
     const client = createApiClient({ url, timeout: GLOBALS.timeoutFast });
     return await client.post(
          '/SystemAPI?method=getSystemMessages',
          {},
          {
               params: { libraryId, locationId },
          }
     );
}

/**
 * Dismiss given system message from displaying again
 * @param systemMessageId
 * @param url
 * @returns {Promise<*|*[]>}
 */
export async function dismissSystemMessage(systemMessageId, url = null) {
     const client = createApiClient({ url, timeout: GLOBALS.timeoutFast });

     const response = await client.post(
          '/SystemAPI?method=dismissSystemMessage',
          {},
          {
               params: { systemMessageId },
          }
     );

     if (response.ok && response?.data?.result) {
          return response.data.result;
     }

     return [];
}

/**
 * Check if Aspen Discovery is in offline mode
 * @param url
 * @returns {Promise<*|{ok: boolean, status, problem: string, data, config: {}}|undefined>}
 */
export async function getCatalogStatus(url = null) {
     const client = createApiClient({ url, timeout: GLOBALS.timeoutAverage });
     return await client.get('/SystemAPI?method=getCatalogStatus');
}

/**
 * Fetch settings for app that are maintained by the library
 * @param url
 * @param timeout
 * @param slug
 * @returns {Promise<*|*[]>}
 */
export async function getAppSettings(url, timeout, slug) {
     const APPSETTINGS_STALE_MS = 48 * 60 * 60 * 1000; // 48 hours

     try {
          // Check SQLite cache first
          const { loadAppSettings, saveAppSettings } = require('../db');
          const cached = await loadAppSettings();

          if (cached?.settings && cached.urlCache === url && cached.slugCache === slug) {
               const cacheAgeMs = Date.now() - (cached?.updatedAt ?? 0);
               if (cacheAgeMs < APPSETTINGS_STALE_MS) {
                    logDebugMessage(`Using cached app settings for url: ${url} slug: ${slug} (cache age: ${cacheAgeMs}ms)`);
                    return cached.settings;
               }
          }

          logDebugMessage(`Getting App Settings from url: ${url} slug: ${slug}`);

          const client = createApiClient({ url, timeout });
          const response = await client.get('/SystemAPI?method=getAppSettings', { slug });

          if (response?.ok) {
               const settings = response.data?.result?.settings ?? [];
               await saveAppSettings(settings, url, slug);
               return settings;
          }

          logWarnMessage(`Did not get valid response from getAppSettings url: ${url} slug: ${slug}`);
          logWarnMessage(response);
          return [];
     } catch (err) {
          // TODO(translation-client): Exception path is local; move toast body text to TranslationService key.
          popToast(getTermFromDictionary('en', 'error_no_server_connection'), 'Could not retrieve App Settings, please try again later.', 'error');
          logErrorMessage(`Exception in getAppSettings ${err}`);
          return [];
     }
}

/**
 * Return local ILL form details
 * @param url
 * @param id
 * @returns {Promise<*|{ok: boolean, status, problem: string, data, config: {}}>}
 */
export async function getLocalIllForm(url = null, id) {
     const client = createApiClient({ url, timeout: GLOBALS.timeoutAverage });

     const response = await client.post(
          '/SystemAPI?method=getLocalIllForm',
          {},
          {
               params: { formId: id },
          }
     );

     if (response.ok) {
          LIBRARY.localIll = response.data?.result;
     }

     return response;
}

/**
 * Return information about the library location/branch
 * @param url
 * @param locationId
 * @returns {Promise<*|{ok: boolean, status, problem: string, data, config: {}}|undefined>}
 */
export async function getLocationInfo(url = null, locationId = null) {
     if (!locationId) {
          try {
               locationId = await AsyncStorage.getItem('@locationId');
          } catch (e) {
               logDebugMessage(e);
          }
     }

     const client = createApiClient({ url, timeout: GLOBALS.timeoutFast });

     return await client.get('/SystemAPI?method=getLocationInfo', {
          id: locationId,
          version: GLOBALS.appVersion,
     });
}

/**
 * Return self check settings for the library
 * @param url
 * @param locationIdOverride
 * @returns {Promise<*|{ok: boolean, status, problem: string, data, config: {}}|undefined>}
 */
export async function getSelfCheckSettings(url = null, locationIdOverride = null) {
     let locationId = locationIdOverride;

     if (locationId === null || typeof locationId === 'undefined' || locationId === '') {
          try {
               locationId = await AsyncStorage.getItem('@locationId');
          } catch (e) {
               logDebugMessage(e);
          }
     }


     const client = createApiClient({ url, timeout: GLOBALS.timeoutFast });

     return await client.get('/SystemAPI?method=getSelfCheckSettings', {
          locationId,
     });
}

export function normalizeBooleanLike(value) {
     if (value === true || value === 1 || value === '1') return true;
     if (value === false || value === 0 || value === '0') return false;
     if (typeof value === 'string') {
          const lowered = value.toLowerCase();
          if (lowered === 'true') return true;
          if (lowered === 'false') return false;
     }
     return undefined;
}

export function resolveSelfCheckEnabled(result = {}) {
     const candidates = [
          result?.settings?.isEnabled,
          result?.settings?.enableSelfCheck,
          result?.isEnabled,
          result?.enableSelfCheck,
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
 * Return nearby library locations based on latitude and longitude
 * @param url
 * @param language
 * @param latitude
 * @param longitude
 * @returns {Promise<*|{ok: boolean, status, problem: string, data, config: {}}|undefined>}
 */
export async function getLocations(url = null, language = 'en', latitude, longitude) {
     const client = createApiClient({ url, timeout: GLOBALS.timeoutFast, language });

     const response = await client.get('/SystemAPI?method=getLocations', {
          latitude,
          longitude,
          language,
     });
     if (response.ok) {
          logDebugMessage("Got a good response from SystemAPI getLocations");
     }else{
          logWarnMessage("Did not get a good response from SystemAPI getLocations");
     }

     return response;
}

/**
 * Check if the provided URL is valid and has a working connection to Aspen Discovery by making a test API call
 * @param url
 * @returns {Promise<boolean>}
 */
export async function checkCachedUrl(url) {
     const client = createApiClient({ url, timeout: GLOBALS.timeoutFast });
     const response = await client.post('/SystemAPI?method=getCatalogStatus');
     return !!response.ok;
}

/**
 * Return information about the library system which may include multiple branches/locations
 * @param data
 * @returns {Promise<null|[]|*|*[]>}
 */
export async function getLibrarySystem(data) {
     const client = createApiClient({
          url: data?.patronsLibrary?.baseUrl,
          timeout: GLOBALS.timeoutFast,
     });

     const response = await client.get('/SystemAPI?method=getLibraryInfo', {
          id: data?.patronsLibrary?.libraryId,
     });

     if (response.ok && response?.data?.result) {
          return response.data.result.library;
     }

     return [];
}

/**
 * Return information about the library branch/location the patron is associated with
 * @param data
 * @returns {Promise<*|*[]>}
 */
export async function getLibraryBranch(data) {
     const client = createApiClient({
          url: data?.patronsLibrary?.baseUrl,
          timeout: GLOBALS.timeoutFast,
     });

     const response = await client.get('/SystemAPI?method=getLocationInfo', {
          id: data?.patronsLibrary?.locationId,
          library: data?.patronsLibrary?.solrScope,
          version: GLOBALS.appVersion,
     });

     if (response.ok && response?.data?.result) {
          return response.data.result.location;
     }

     return [];
}

function toNumberOrNull(value) {
     const num = Number(value);
     return Number.isFinite(num) ? num : null;
}

/**
 * Ensures a color string is in leading-# hex form, tolerating values the API sends without one.
 * Malformed values are returned unchanged rather than discarded.
 */
export function normalizeHexColor(value) {
     if (typeof value !== 'string') return null;
     const stripped = value.trim().replace(/^#/, '');
     if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(stripped)) {
          return value;
     }
     return `#${stripped.toLowerCase()}`;
}

function normalizeColorGroup(group) {
     if (!group || typeof group !== 'object') return null;
     return {
          ...group,
          lighter: normalizeHexColor(group.lighter),
          base: normalizeHexColor(group.base),
          darker: normalizeHexColor(group.darker),
          text: normalizeHexColor(group.text),
     };
}

/**
 * For Discovery web theme payloads (when Aspen LiDA Themes are not setup), pick the themeId with the
 * lowest weight (primary) so legacy getThemeInfo can fetch the theme definition.
 */
export function resolveThemeInfoIdFromWebThemes(rawThemes) {
     const entries = Array.isArray(rawThemes)
          ? rawThemes
          : rawThemes && typeof rawThemes === 'object'
               ? Object.values(rawThemes)
               : [];

     let best = null;
     for (const entry of entries) {
          if (!entry || typeof entry !== 'object') continue;
          if (entry.themeId === undefined || entry.themeId === null) continue;

          const themeId = toNumberOrNull(entry.themeId);
          if (themeId === null) continue;

          const weight = toNumberOrNull(entry.weight) ?? Number.MAX_SAFE_INTEGER;
          if (
               !best ||
               weight < best.weight ||
               (weight === best.weight && themeId < best.themeId)
          ) {
               best = { themeId, weight };
          }
     }

     return best?.themeId ?? null;
 }

/**
 * Normalizes getAspenLiDAThemesByLocation's `result.themes` payload into an ordered array of theme rows.
 *
 * The raw payload is a single object keyed by arbitrary indices, mixing two row shapes together:
 *  - location/theme assignment rows: { id, themeId, locationId, weight } (no styling)
 *  - theme definition rows: { id, name, baseMode, logo, header, primary, secondary, tertiary }
 * Assignment rows are matched to their definition by themeId === definition.id, and their `weight`
 * determines display order. If no assignment rows are present, all definitions are returned as-is.
 */
export function normalizeAspenLiDAThemesPayload(rawThemes) {
     const entries = Array.isArray(rawThemes)
          ? rawThemes
          : rawThemes && typeof rawThemes === 'object'
               ? Object.values(rawThemes)
               : [];

     const definitionsById = new Map();
     const assignments = [];

     for (const entry of entries) {
          if (!entry || typeof entry !== 'object') continue;
          if (entry.primary && typeof entry.primary === 'object') {
               definitionsById.set(toNumberOrNull(entry.id), entry);
          } else if (entry.themeId !== undefined) {
               assignments.push(entry);
          }
     }

     let ordered;
     if (assignments.length > 0) {
          const seen = new Set();
          ordered = [];
          for (const assignment of assignments) {
               const themeId = toNumberOrNull(assignment.themeId);
               if (themeId === null || seen.has(themeId)) continue;
               const definition = definitionsById.get(themeId);
               if (!definition) continue;
               seen.add(themeId);
               ordered.push({ definition, weight: toNumberOrNull(assignment.weight) ?? 0 });
          }
     } else {
          ordered = Array.from(definitionsById.values()).map((definition, index) => ({
               definition,
               weight: index,
          }));
     }

     ordered.sort((a, b) => a.weight - b.weight || toNumberOrNull(a.definition.id) - toNumberOrNull(b.definition.id));

     return ordered.map(({ definition, weight }) => ({
          id: toNumberOrNull(definition.id),
          themeId: toNumberOrNull(definition.id),
          name: definition.name ?? null,
          baseMode: definition.baseMode ?? null,
          logo: definition.logo ?? null,
          weight,
          header: definition.header && typeof definition.header === 'object'
               ? { ...definition.header, backgroundColor: normalizeHexColor(definition.header.backgroundColor) }
               : definition.header ?? null,
          primary: normalizeColorGroup(definition.primary),
          secondary: normalizeColorGroup(definition.secondary),
          tertiary: normalizeColorGroup(definition.tertiary),
     }));
}

/**
 * Fetch theme information for the library and generate color swatches for the app
 * with fallback to a default theme if there are any issues with the request or response.
 * @param url
 * @param locationId
 * @returns {Promise<{palettes: unknown[], themeId: (number|null), locationId: (number|null), header: (object|null)}>}
 *   palettes is always 3 swatch objects (primary/secondary/tertiary); themeId identifies which
 *   theme they came from - a real theme_catalog id for branded locations, or the static
 *   app-config themeId otherwise; locationId is whichever location was actually resolved (passed
 *   in, or loaded from storage); header is the selected theme's {logo, alignment, backgroundColor}
 *   from the catalog, or null when there's no catalog data (legacy endpoint has no equivalent).
 *   Callers should persist all of these so a stored theme can be tied to the location it was
 *   fetched for, instead of just re-resolving it from scratch.
 */
export async function getThemeInfo(url = null, locationId = null) {
     let libraryUrl = LIBRARY.url ?? GLOBALS.url;
     if (url !== null && url !== '') {
          libraryUrl = url;
     }

     const isBranded = isBrandedApp();
     const fallbackThemeId = Number(GLOBALS.themeId ?? 1);

     const { loadLibrary, loadLocation } = require('../db');
     const library = (await loadLibrary()) ?? {};
     const location = await loadLocation();

     if(isBranded && library.baseUrl) {
          libraryUrl = library.baseUrl;
     }

     if(location && !locationId) {
          locationId = location.locationId;
     }

     const resolvedLocationId = locationId != null ? Number(locationId) : null;
     let fallbackThemeInfoId = null;

     if (!libraryUrl) {
          logWarnMessage('No library URL provided, returning backup theme');
          const COLOR_SCHEMES = ['#3dbdd6', '#9acf87', '#c1adcc'];
          return { palettes: COLOR_SCHEMES.map(generateSwatches), themeId: fallbackThemeId, locationId: resolvedLocationId, header: null };
     }

     await getAppSettings(libraryUrl, 10000, GLOBALS.slug);

     if (isBranded && locationId) {
          const aspenLiDAThemesClient = createApiClient({
               url: libraryUrl,
               timeout: 10000,
          });
          const aspenLiDAThemesResponse = await aspenLiDAThemesClient.get('SystemAPI?method=getAspenLiDAThemesByLocation', {
               id: locationId,
          });
          if (aspenLiDAThemesResponse.ok && aspenLiDAThemesResponse.data?.result?.success) {
               fallbackThemeInfoId = resolveThemeInfoIdFromWebThemes(aspenLiDAThemesResponse.data.result.themes);
               const themes = normalizeAspenLiDAThemesPayload(aspenLiDAThemesResponse.data.result.themes);
               if (themes.length > 0) {
                    const { saveThemeCatalog, loadThemeState } = require('../db');
                    await saveThemeCatalog(locationId, themes);
                    notifyThemeCatalogChanged();

                    const currentThemeState = await loadThemeState();
                    const isSameLocationAsStored = currentThemeState?.locationId === resolvedLocationId;
                    const selectedTheme = (isSameLocationAsStored && themes.find((theme) => theme.id === currentThemeState?.themeId)) || themes[0];
                    fallbackThemeInfoId = selectedTheme?.id ?? fallbackThemeInfoId;

                    const COLOR_GROUPS = [selectedTheme.primary, selectedTheme.secondary, selectedTheme.tertiary];
                    if (COLOR_GROUPS.every((group) => typeof group?.base === 'string' && group.base.length > 0)) {
                         logDebugMessage(`Loaded AspenLiDA theme catalog (${themes.length} themes), using themeId=${selectedTheme.id}`);
                         return {
                              palettes: COLOR_GROUPS.map(buildSwatchFromThemeTokens),
                              themeId: selectedTheme.id,
                              locationId: resolvedLocationId,
                              header: selectedTheme.header ?? null,
                         };
                    }
                    logWarnMessage(`AspenLiDA theme catalog themeId=${selectedTheme.id} is missing color data, falling back to getThemeInfo`);
               } else if (fallbackThemeInfoId !== null) {
                    logDebugMessage(
                         `AspenLiDA theme catalog returned assignment-only rows, falling back to getThemeInfo with themeId=${fallbackThemeInfoId}`
                    );
               }
          }
     }

     const client = createApiClient({
          url: libraryUrl,
          timeout: 10000,
     });
     const response = await client.get('/SystemAPI?method=getThemeInfo', {
          id: isBranded ? (fallbackThemeInfoId ?? locationId) : GLOBALS.themeId,
     });

     if (response.ok) {
          const result = response.data?.result?.theme;
          if (result !== undefined) {
               const COLOR_SCHEMES = [result.primaryBackgroundColor, result.secondaryBackgroundColor, result.tertiaryBackgroundColor];
               const palettes = COLOR_SCHEMES.map(generateSwatches);
               logDebugMessage('Theme downloaded and swatches generated.');
               return { palettes, themeId: fallbackThemeId, locationId: resolvedLocationId, header: null };
          }

          const COLOR_SCHEMES = ['#3dbdd6', '#9acf87', '#c1adcc'];
          const palettes = COLOR_SCHEMES.map(generateSwatches);
          logInfoMessage('Backup theme loaded due to unexpected response.');
          logErrorMessage(response);
          return { palettes, themeId: fallbackThemeId, locationId: resolvedLocationId, header: null };
     }

     const COLOR_SCHEMES = ['#3dbdd6', '#9acf87', '#c1adcc'];
     const palettes = COLOR_SCHEMES.map(generateSwatches);
     logInfoMessage('Backup theme loaded due to server or client issue.');
     logErrorMessage(response);
     return { palettes, themeId: fallbackThemeId, locationId: resolvedLocationId, header: null };
}
