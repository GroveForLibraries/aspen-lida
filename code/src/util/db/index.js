export { getDb, initDatabase, runUpdates, resetDatabase } from './sqlite';
export { normalizePage, buildPageMeta } from './queryUtils';
export { safeStringify } from './serialize';
export { isUserDataEmpty, isSQLiteMigrationNeeded } from './migrations';

/* Specific Tables */
export { insertApiErrorLog, purgeExpiredApiErrorLogs, getApiErrorLogsPage, clearApiErrorLogs } from './repositories/apiErrorLogRepository';
export {
     saveLocation, loadLocation, saveScope, loadScope, saveSelfCheckEnabled,
     loadSelfCheckEnabled, saveSelfCheckSettings, loadSelfCheckSettings,
     saveLocations as saveAvailableLocations, loadLocations as loadAvailableLocations,
     saveAllLibraryBranchData, loadAllLibraryBranchData, resetAllLibraryBranchData,
} from './repositories/libraryBranchRepository';
export {
     saveBrowseCategories, loadBrowseCategories,
     saveBrowseCategoryList, loadBrowseCategoryList,
     updateBrowseCategoryVisibility,
     updateBrowseCategoryVisibilityBatch,
     saveMaxCategories, loadMaxCategories,
     saveAllBrowseCategoryData, loadAllBrowseCategoryData, resetAllBrowseCategoryData,
     isCacheExpired,
} from './repositories/browseCategoryRepository';
export {
     saveLibraryUrl, loadLibraryUrl,
     saveLibraryVersion, loadLibraryVersion,
     saveLibraryLanguages, loadLibraryLanguages,
     saveLibraryMetadata, loadLibraryMetadata,
     saveLibrary, loadLibrary,
     saveMenu, loadMenu,
     saveCatalogStatus, loadCatalogStatus,
     saveHomeScreenLinks, loadHomeScreenLinks,
     saveAppSettings, loadAppSettings,
     saveAllLibrarySystemData, loadAllLibrarySystemData, resetAllLibrarySystemData,
} from './repositories/librarySystemRepository';
export {
     saveAvailableLanguages,
     loadAvailableLanguages,
     saveDictionary,
     loadDictionary,
     loadDictionaryForLanguage,
     saveAllLanguageData,
     loadAllLanguageData,
     resetLanguageData,
} from './repositories/languageRepository';
export {
     saveThemeState,
     loadThemeState,
     saveThemeColors,
     saveThemeColorMode,
     resetThemeState,
     isStoredThemeIdMatch,
     saveThemeCatalog,
     loadThemeCatalog,
} from './repositories/themeRepository';
export {
     saveUserProfile,
     saveUserSettings,
     savePickupLocationPrefs,
     saveLastListUsed,
     loadUserState,
     saveAccounts,
     loadAccounts,
     saveViewers,
     loadViewers,
     saveLists,
     loadLists,
     saveListGroups,
     loadListGroups,
     saveLocations,
     loadLocations,
     saveReadingHistory,
     loadReadingHistory,
     saveSavedEvents,
     loadSavedEvents,
     saveCards,
     loadCards,
     saveNotificationSettings,
     loadNotificationSettings,
     saveAppPreferences,
     loadAppPreferences,
     saveDebugMessages,
     loadDebugMessages,
     saveNotificationHistory,
     loadNotificationHistory,
     saveInbox,
     loadInbox,
     saveSublocations,
     loadSublocations,
     saveSavedSearches,
     loadSavedSearches,
     saveAllUserData,
     loadAllUserData,
     clearAllUserData,
} from './repositories/userRepository';
