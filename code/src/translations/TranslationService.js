import { translationsLibrary as helperLibrary, getTermFromDictionary as helperGetTermFromDictionary } from './TranslationHelper';
import { MaterialIcons } from '@expo/vector-icons';
import { Box, Button, ButtonText, ButtonIcon, Menu, MenuItem, MenuItemLabel, Spinner, Text } from '@gluestack-ui/themed';
import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { saveLanguage } from '../util/api/user';
import { useLibrary } from '../hooks/useLibrarySystemData';
import {
     useActiveLanguage,
     useAvailableLanguages,
     useLanguageDisplayName,
     useUpdateActiveLanguage,
     useUpdateLanguageDisplayName,
     useUpdateDictionary } from '../hooks/useLanguageData';

import { decodeHTML, findByProperty, getCurrentDate, isObject, mergeDeep, mergeIntoNew } from '../helpers/helpers';
import { GLOBALS } from '../util/globals';

import { logDebugMessage, logInfoMessage, logWarnMessage, logErrorMessage, getErrorMessage } from '../util/logging.js';
import { createApiClient } from '../util/api/apiFactory';
import { loadDictionary, loadDictionaryForLanguage, saveDictionary } from '../util/db';
import { useTheme } from '../themes/theme';

/** *******************************************************************
 * General
 ******************************************************************* **/
export const LanguageSwitcher = () => {
     const { theme, colorMode, textColor } = useTheme();
     const library = useLibrary();
     const language = useActiveLanguage();
     const languages = useAvailableLanguages();
     const languageDisplayName = useLanguageDisplayName();
     const updateLanguage = useUpdateActiveLanguage();
     const updateDictionary = useUpdateDictionary();
     const updateLanguageDisplayName = useUpdateLanguageDisplayName();

     const [isLanguageMenuOpen, setIsLanguageMenuOpen] = React.useState(false);
     const [isSwitchingLanguage, setIsSwitchingLanguage] = React.useState(false);

     const changeLanguage = async (val) => {
          if (isSwitchingLanguage) return;
          setIsSwitchingLanguage(true);
          try {
               const result = await saveLanguage(val, library?.baseUrl ?? '', language);
               if (!result) {
                    logErrorMessage('there was an error updating the language...');
                    return;
               }

               const nextDisplayName = getLanguageDisplayName(val, languages);
               const languageUrl = library?.baseUrl ?? '';

               // Hydrate selected language terms from SQLite immediately so UI reads the correct row
               // while fresh translations are fetched.
               const cachedTerms = await loadDictionaryForLanguage(val);
               if (isObject(cachedTerms) && Object.keys(cachedTerms).length > 0) {
                    setTranslationsLibrary(mergeIntoNew(translationsLibrary, { [val]: cachedTerms }));
               }

               await getTranslatedTermsForUserPreferredLanguage(val, languageUrl);
               setTranslationsLibrary(translationsLibrary);
               await updateDictionary(translationsLibrary);

               // Flip active language only after dictionary is ready to avoid flashing defaults.
               logDebugMessage("Updating language to " + val + " in changeLanguage");
               await updateLanguage(val);
               logDebugMessage("Updating language display name to " + nextDisplayName + " in changeLanguage");
               await updateLanguageDisplayName(nextDisplayName);
          } catch (error) {
               logWarnMessage('Language switch translation fetch failed; applying language selection with current dictionary.');
               logErrorMessage(error);
               await updateLanguage(val);
               const fallbackDisplayName = getLanguageDisplayName(val, languages);
               await updateLanguageDisplayName(fallbackDisplayName);
          } finally {
               setIsSwitchingLanguage(false);
          }
     };

     if (Array.isArray(languages) && languages.length > 1) {
          return (
               <>
                    <Box>
                         <Menu
                         bgColor={colorMode === 'light' ? "$warmGray50" : "$coolGray700"}
                         isOpen={isLanguageMenuOpen}
                         onClose={() => setIsLanguageMenuOpen(false)}
                         onOpen={() => setIsLanguageMenuOpen(true)}
                         placement="top"
                         selectedKeys={language} selectionMode="single"
                         trigger={(triggerProps) => {
                              return (
                                   <Button
                                        size="sm"
                                        borderRadius="$full"
                                        {...triggerProps}
                                        isDisabled={isSwitchingLanguage}
                                        onPress={() => {
                                             if (!isSwitchingLanguage) {
                                                  setIsLanguageMenuOpen(true);
                                             }
                                        }}
                                        bg="transparent"
                                   >
                                        <ButtonIcon as={MaterialIcons} name="language" color={theme['tokens']['colors']['primary']['500']} />
                                        <ButtonText color={theme['tokens']['colors']['primary']['500']}> {languageDisplayName}</ButtonText>
                                   </Button>
                              );
                         }}>
                         {Array.isArray(languages) ? (
                              <>
                                   {languages.map((language) => {
                                        return (
                                             <MenuItem
                                                  key={language.code}
                                                  textValue={language.code}
                                                   isDisabled={isSwitchingLanguage}
                                                  onPress={() => {
                                                       setIsLanguageMenuOpen(false);
                                                       changeLanguage(language.code);
                                                  }}
                                             >
                                                  <MenuItemLabel color={textColor}>{language.displayName}</MenuItemLabel>
                                             </MenuItem>
                                        );
                                   })}
                              </>
                         ) : null}
                         </Menu>
                    </Box>
                    <Modal transparent animationType="fade" visible={isSwitchingLanguage}>
                         <View
                              style={[
                                   styles.languageSwitchOverlay,
                                   colorMode === 'dark' ? styles.languageSwitchOverlayDark : styles.languageSwitchOverlayLight,
                              ]}
                         >
                              <Box
                                   bg={colorMode === 'dark' ? '$coolGray800' : '$warmGray50'}
                                   borderRadius="$xl"
                                   px="$6"
                                   py="$5"
                                   alignItems="center"
                                   justifyContent="center"
                              >
                                   <Spinner size="large" color={theme['tokens']['colors']['primary']['500']} />
                                    <Text mt="$3" color={textColor}>Switching language...</Text>
                              </Box>
                         </View>
                    </Modal>
               </>
          );
     }

     return null;
};

/**
 * Returns translation of a single term for the given language
 * @param term
 * @param language
 * @param url
 * @returns {Promise<*|unknown[]>}
 */
export async function getTranslation(term, language, url) {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutAverage,
          language });

     const response = await client.get('/SystemAPI?method=getTranslation', { term, language });
     if (response.ok) {
          if (response.data?.success) {
               if (response?.data?.result?.[language]?.[term]) {
                    logDebugMessage('Got translation for term: ' + term + ' in language: ' + language);
                    logDebugMessage(response?.data?.result?.[language]?.[term]);
                    return Object.values(response?.data?.result?.[language]?.[term]);
               }
          }
     }
     return term;
}

/**
 * Returns translation of an array of terms for the given language
 * @param terms
 * @param language
 * @param url
 * @returns {Promise<*>}
 */
export async function getTranslations(terms, language, url) {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutAverage,
          language });

     const response = await client.get('/SystemAPI?method=getTranslation', {
          terms,
          language });

     if (response.ok) {
          return response.data?.result?.translations;
     }

     logWarnMessage('getTranslations failed');
     logWarnMessage(response);
}

/**
 * Returns translation of a term with interchangeable values in the given language
 * getTranslationsWithValues('last_updated_on', $value, 'en', $url)
 * getTranslationsWithValues('filter_by_source', [$value1, $value2], 'en', $url)
 * @param key
 * @param values
 * @param language
 * @param url
 * @param addToDictionary
 * @returns {Promise<unknown[]|string>}
 */
export async function getTranslationsWithValues(key, values, language, url, addToDictionary = false) {
     await ensureTranslationsLibraryHydrated();

     const defaults = require('../translations/defaults.json');
     const term = defaults[key];
     const normalizedValues = normalizeTranslationValues(values);
     const valuesCacheKey = `${key}::${JSON.stringify(normalizedValues)}`;

     const cachedDictionary = translationsLibrary?.[language] ?? {};
     const cachedValueTranslation = cachedDictionary[valuesCacheKey];
     if (cachedValueTranslation) {
          return [formatTranslationWithValues(cachedValueTranslation, normalizedValues)];
     }

     const cachedTermTranslation = cachedDictionary[key];
     if (cachedTermTranslation) {
          const cachedTermText = String(cachedTermTranslation ?? '');
          const canUseBaseTermCache = normalizedValues.length === 0 || cachedTermText.includes('%');

          if (canUseBaseTermCache) {
               const resolvedCachedTerm = formatTranslationWithValues(cachedTermText, normalizedValues);
               if (!resolvedCachedTerm.includes('%')) {
                    return [resolvedCachedTerm];
               }
          }
     }

     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutAverage,
          language });

     const response = await client.get('/SystemAPI?method=getTranslationWithValues', {
          term,
          values,
          language });

     if (response.ok) {
          if (response.data?.result?.translation) {
               const translation = Object.values(response.data?.result?.translation);
               if (Object.values(response.data?.result?.translation) && addToDictionary) {
                    const lastUpdated = {
                         lastUpdated: getCurrentDate() };
                    translationsLibrary = mergeDeep(translationsLibrary, lastUpdated);

                    const resolvedTranslation = formatTranslationWithValues(translation[0], normalizedValues);
                    const obj = {
                         [language]: {
                              [key]: translation[0],
                              [valuesCacheKey]: resolvedTranslation } };
                     translationsLibrary = mergeDeep(translationsLibrary, obj);

                    try {
                         await saveDictionary(translationsLibrary);
                    } catch (error) {
                         logWarnMessage('Failed to persist value translation to SQLite dictionary');
                         logErrorMessage(error);
                    }
               }
               return translation;
          }
     }

     return decodeHTML(term);
}

function normalizeTranslationValues(values) {
     if (Array.isArray(values)) {
          return values;
     }
     return typeof values === 'undefined' || values === null ? [] : [values];
}

export const formatTranslationWithValues = (term, values) => {
     const source = String(term ?? '');
     const normalizedValues = normalizeTranslationValues(values);

     return normalizedValues.reduce((result, value, index) => {
          return result.replace(`%${index + 1}%`, String(value ?? ''));
     }, source);
};

export async function getTranslationWithValuesText(key, values, language, url, addToDictionary = false) {
     const fallback = formatTranslationWithValues(getTermFromDictionary(language, key, false), values);

     try {
          const response = await getTranslationsWithValues(key, values, language, url, addToDictionary);
          const translated = Array.isArray(response) ? response[0] : response;
          const resolved = formatTranslationWithValues(translated, values).trim();

          return resolved.includes('%') ? fallback : resolved;
     } catch (error) {
          logErrorMessage('getTranslationWithValuesText failed');
          logErrorMessage(error);
          return fallback;
     }
}

/**
 * Returns the display name for the given language code
 * @param {string} code
 * @param {string} languages
 **/
export function getLanguageDisplayName(code, languages) {
     if (!Array.isArray(languages) || !code) {
          return '';
     }
     const language = findByProperty(languages, 'code', code);
     return language?.displayName ?? '';
}

/**
 * Local storage for translated terms
 */
export let translationsLibrary = helperLibrary;
let dictionaryHydrationPromise = null;

export async function ensureTranslationsLibraryHydrated() {
     if (!dictionaryHydrationPromise) {
          dictionaryHydrationPromise = (async () => {
               try {
                    logDebugMessage("Doing initial load of translations from SQL at startup")
                    const cachedDictionary = await loadDictionary();
                    if (isObject(cachedDictionary) && Object.keys(cachedDictionary).length > 0) {
                         translationsLibrary = mergeIntoNew(helperLibrary, cachedDictionary);
                    }
               } catch (error) {
                    logWarnMessage('Failed loading cached translations dictionary from SQLite');
                    logErrorMessage(error);
               }
          })();
     }

     await dictionaryHydrationPromise;
}

export function setTranslationsLibrary(dictionary) {
     if (isObject(dictionary)) {
          translationsLibrary = mergeIntoNew(helperLibrary, dictionary);
          dictionaryHydrationPromise = Promise.resolve();
     }
}

// Make sure we only load translations once.
const activeTranslationRequests = {};
/**
 * Returns translation of terms used in Aspen LiDA for the given language
 * @param language
 * @param url
 * @returns {Promise<void>}
 */
export async function loadTranslationsFromDiscovery(language, url) {
     const defaults = require('../translations/defaults.json');

     const isEmptyDefaults =
          !defaults ||
          (Array.isArray(defaults) && defaults.length === 0) ||
          (typeof defaults === 'object' && Object.keys(defaults).length === 0);

     if (isEmptyDefaults) {
          logInfoMessage("Skipping getBulkTranslations because defaults.json is empty.");
          const obj = {
               [language]: {} };
          translationsLibrary = mergeDeep(translationsLibrary, obj);
          return;
     }

     let numDefaultTerms;
     if (Array.isArray(defaults)) {
          numDefaultTerms = defaults.length
     }else{
          numDefaultTerms = Object.keys(defaults).length;
     }

     if (activeTranslationRequests[language]) {
          logInfoMessage(`[Sync] Request for "${language}" is already loading. Joining existing queue.`);
          return activeTranslationRequests[language];
     }

     activeTranslationRequests[language] = (async () => {
          try {
               const client = createApiClient({
                    url,
                    timeout: GLOBALS.timeoutFast,
                    language });

               logDebugMessage("Loading bulk translations for " + numDefaultTerms + " terms");
               const response = await client.post(
                    '/SystemAPI?method=getBulkTranslations',
                    { terms: defaults },
                    {
                         params: { language },
                         headers: { 'Content-Type': 'application/json' } },
                    false
               );

               if (response.ok) {
                    const translation = response?.data?.result?.[language] ?? defaults;
                    const lastUpdated = {
                         lastUpdated: getCurrentDate() };
                    translationsLibrary = mergeDeep(translationsLibrary, lastUpdated);

                    if (isObject(translation)) {
                         const obj = {
                              [language]: translation };
                         translationsLibrary = mergeDeep(translationsLibrary, obj);
                    }
               } else {
                    const obj = {
                         [language]: defaults };
                    translationsLibrary = mergeDeep(translationsLibrary, obj);
                    logDebugMessage('loadTranslationsFromDiscovery failed');
                    logDebugMessage(response);
                    getErrorMessage(response.code, response.problem);
               }
          } catch (error) {
               logErrorMessage("Uncaught error inside synchronized loadTranslationsFromDiscovery: " + error.message);
               // Fallback to defaults on catastrophic crash
               const obj = {
                    [language]: defaults };

               translationsLibrary = mergeDeep(translationsLibrary, obj);
          } finally {
               // 4. Cleanup: Clear the lock once done so future updates can trigger if needed
               delete activeTranslationRequests[language];
          }
     })();

     // Execute the promise for the first caller
     return activeTranslationRequests[language];
}

/**
 * Updates dictionary for translations used in Aspen LiDA for the given language
 * @param {string} language // the language code used in Aspen Discovery
 * @param {string} url
 **/
export async function getTranslatedTermsForUserPreferredLanguage(language, url) {
     logDebugMessage('Getting translations for ' + language + '...');
     await loadTranslationsFromDiscovery(language, url);
     logDebugMessage('getTranslatedTermsForUserPreferredLanguage - last updated at ' + translationsLibrary.lastUpdated);
     return true;
}

export const getTermFromDictionary = (language = 'en', key, ellipsis = false) => {
     return helperGetTermFromDictionary(language, key, ellipsis, translationsLibrary);
};

const styles = StyleSheet.create({
     languageSwitchOverlay: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
     },
     languageSwitchOverlayLight: {
          backgroundColor: 'rgba(15, 23, 42, 0.35)',
     },
     languageSwitchOverlayDark: {
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
     },
});

