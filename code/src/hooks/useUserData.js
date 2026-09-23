import React from 'react';
import {
     loadUserState, saveUserProfile, saveUserSettings, savePickupLocationPrefs,
     loadAccounts, saveAccounts,
     loadViewers, saveViewers,
     loadLists, saveLists,
     loadListGroups, saveListGroups,
     loadLocations, saveLocations,
     loadReadingHistory, saveReadingHistory,
     loadSavedEvents, saveSavedEvents,
     loadCards, saveCards,
     loadNotificationSettings, saveNotificationSettings,
     saveAppPreferences,
     loadDebugMessages, saveDebugMessages,
     loadNotificationHistory, saveNotificationHistory,
     loadInbox, saveInbox,
     loadSublocations, saveSublocations,
     loadSavedSearches, saveSavedSearches,
} from '../util/db';

const subscribers = new Set();
const userDataSnapshotCache = new Map();

function getSnapshotCacheKey(queryKey) {
     return JSON.stringify(queryKey ?? []);
}

function subscribeToUserDataChanges(listener) {
     subscribers.add(listener);
     return () => subscribers.delete(listener);
}

function notifyUserDataChanged(queryKey) {
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
          if (userDataSnapshotCache.has(cacheKey)) {
               return userDataSnapshotCache.get(cacheKey);
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
                userDataSnapshotCache.set(cacheKey, nextData);
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

          return subscribeToUserDataChanges((incomingKey) => {
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

export const USER_STATE_KEY = ['user_state'];
export const USER_ACCOUNTS_KEY = ['user_accounts'];
export const USER_VIEWERS_KEY = ['user_viewers'];
export const USER_LISTS_KEY = ['user_lists'];
export const USER_LIST_GROUPS_KEY = ['user_list_groups'];
export const USER_LOCATIONS_KEY = ['user_locations'];
export const USER_READING_HISTORY_KEY = ['user_reading_history'];
export const USER_SAVED_EVENTS_KEY = ['user_saved_events'];
export const USER_CARDS_KEY = ['user_cards'];
export const USER_NOTIFICATION_SETTINGS_KEY = ['user_notification_settings'];
export const USER_APP_PREFERENCES_KEY = ['user_app_preferences'];
export const USER_DEBUG_MESSAGES_KEY = ['user_debug_messages'];
export const USER_NOTIFICATION_HISTORY_KEY = ['user_notification_history'];
export const USER_INBOX_KEY = ['user_inbox'];
export const USER_SUBLOCATIONS_KEY = ['user_sublocations'];
export const USER_SAVED_SEARCHES_KEY = ['user_saved_searches'];

// ─── Read Hooks ───────────────────────────────────────────────────────────────

export const useUserState = (options) =>
     useSqliteReadQuery(USER_STATE_KEY, loadUserState, options);

export const useAccounts = (options) =>
     useSqliteReadQuery(USER_ACCOUNTS_KEY, loadAccounts, options);

export const useViewers = (options) =>
     useSqliteReadQuery(USER_VIEWERS_KEY, loadViewers, options);

export const useLists = (options) =>
     useSqliteReadQuery(USER_LISTS_KEY, loadLists, options);

export const useListGroups = (options) =>
     useSqliteReadQuery(USER_LIST_GROUPS_KEY, loadListGroups, options);

export const useLocations = (options) =>
     useSqliteReadQuery(USER_LOCATIONS_KEY, loadLocations, options);

export const useReadingHistory = (options) =>
     useSqliteReadQuery(USER_READING_HISTORY_KEY, loadReadingHistory, options);

export const useSavedEvents = (options) =>
     useSqliteReadQuery(USER_SAVED_EVENTS_KEY, loadSavedEvents, options);

export const useCards = (options) =>
     useSqliteReadQuery(USER_CARDS_KEY, loadCards, options);

export const useNotificationSettings = (options) =>
     useSqliteReadQuery(USER_NOTIFICATION_SETTINGS_KEY, loadNotificationSettings, options);

export const useDebugMessages = (options) =>
     useSqliteReadQuery(USER_DEBUG_MESSAGES_KEY, loadDebugMessages, options);

export const useNotificationHistory = (options) =>
     useSqliteReadQuery(USER_NOTIFICATION_HISTORY_KEY, loadNotificationHistory, options);

export const useInbox = (options) =>
     useSqliteReadQuery(USER_INBOX_KEY, loadInbox, options);

export const useSublocations = (options) =>
     useSqliteReadQuery(USER_SUBLOCATIONS_KEY, loadSublocations, options);

export const useSavedSearches = (options) =>
     useSqliteReadQuery(USER_SAVED_SEARCHES_KEY, loadSavedSearches, options);

// ─── Write Hooks (save to SQLite) ────────────────────────────────────────────

/**
 * Returns a function that saves the user profile and refreshes the user_state query.
 */
export function useUpdateUserProfile() {
     return React.useCallback(async (user) => {
          await saveUserProfile(user);
          notifyUserDataChanged(USER_STATE_KEY);
     }, []);
}

/**
 * Returns a function that saves session settings and refreshes the user_state query.
 */
export function useUpdateUserSettings() {
     return React.useCallback(async (settings) => {
          await saveUserSettings(settings);
          notifyUserDataChanged(USER_STATE_KEY);
     }, []);
}

/**
 * Returns a function that saves pickup location prefs and refreshes the user_state query.
 */
export function useUpdatePickupLocationPrefs() {
     return React.useCallback(async (isValid, warning) => {
          await savePickupLocationPrefs(isValid, warning);
          notifyUserDataChanged(USER_STATE_KEY);
     }, []);
}

export function useUpdateViewers() {
     return React.useCallback(async (data) => {
          await saveViewers(data);
          notifyUserDataChanged(USER_VIEWERS_KEY);
     }, []);
}

export function useUpdateReadingHistory() {
     return React.useCallback(async (data) => {
          await saveReadingHistory(data);
          notifyUserDataChanged(USER_READING_HISTORY_KEY);
     }, []);
}

export function useUpdateSavedEvents() {
     return React.useCallback(async (data) => {
          await saveSavedEvents(data);
          notifyUserDataChanged(USER_SAVED_EVENTS_KEY);
     }, []);
}

export function useUpdateInbox() {
     return React.useCallback(async (data) => {
          await saveInbox(data);
          notifyUserDataChanged(USER_INBOX_KEY);
     }, []);
}

/**
 * Returns a function that saves the expo token to user_state and refreshes.
 */
export function useUpdateExpoToken() {
     return React.useCallback(async (token) => {
          await saveUserSettings({ expoToken: token });
          notifyUserDataChanged(USER_STATE_KEY);
     }, []);
}

/**
 * Returns a function that prepends a debug message to user_debug_messages (max 50 entries).
 */
export function useAddDebugMessage() {
     return React.useCallback(async (message) => {
          const current = await loadDebugMessages() ?? [];
          const next = [message, ...current].slice(0, 50);
          await saveDebugMessages(next);
          notifyUserDataChanged(USER_DEBUG_MESSAGES_KEY);
     }, []);
}

/**
 * Returns a function that saves user sort settings and refreshes user_state.
 */
export function useUpdateSortSettings() {
     return React.useCallback(async (settings) => {
          await saveUserSettings(settings);
          notifyUserDataChanged(USER_STATE_KEY);
     }, []);
}

export function useUpdateAccounts() {
     return React.useCallback(async (data) => {
          await saveAccounts(data);
          notifyUserDataChanged(USER_ACCOUNTS_KEY);
     }, []);
}

export function useUpdateLists() {
     return React.useCallback(async (data) => {
          await saveLists(data);
          notifyUserDataChanged(USER_LISTS_KEY);
     }, []);
}

export function useUpdateListGroups() {
     return React.useCallback(async (data) => {
          await saveListGroups(data);
          notifyUserDataChanged(USER_LIST_GROUPS_KEY);
     }, []);
}

export function useUpdateLocations() {
     return React.useCallback(async (data) => {
          await saveLocations(data);
          notifyUserDataChanged(USER_LOCATIONS_KEY);
     }, []);
}

export function useUpdateCards() {
     return React.useCallback(async (data) => {
          await saveCards(data);
          notifyUserDataChanged(USER_CARDS_KEY);
     }, []);
}

export function useUpdateNotificationSettings() {
     return React.useCallback(async (data) => {
          await saveNotificationSettings(data);
          notifyUserDataChanged(USER_NOTIFICATION_SETTINGS_KEY);
     }, []);
}

export function useUpdateAppPreferences() {
     return React.useCallback(async (data) => {
          await saveAppPreferences(data);
          notifyUserDataChanged(USER_APP_PREFERENCES_KEY);
     }, []);
}

export function useUpdateNotificationHistory() {
     return React.useCallback(async (data) => {
          await saveNotificationHistory(data);
          notifyUserDataChanged(USER_NOTIFICATION_HISTORY_KEY);
     }, []);
}

export function useUpdateSavedSearches() {
     return React.useCallback(async (data) => {
          await saveSavedSearches(data);
          notifyUserDataChanged(USER_SAVED_SEARCHES_KEY);
     }, []);
}

export function useUpdateSublocations() {
     return React.useCallback(async (data) => {
          await saveSublocations(data);
          notifyUserDataChanged(USER_SUBLOCATIONS_KEY);
     }, []);
}

// ─── Pre-hydration (bypass path) ─────────────────────────────────────────────

/**
 * Pre-populates module-level snapshot caches with user data already loaded from SQLite.
 * `allData` is the result of loadAllUserData() which already includes the user_state
 * row as its base alongside collection fields.
 */
export function prehydrateUserDataSnapshotCache(allData) {
     if (!allData) return;
     // The user_state shape mirrors the loadUserState() return value
     const userState = {
          updatedAt: allData.updatedAt,
          user: allData.user ?? {},
          language: allData.language,
          languageDisplayName: allData.languageDisplayName,
          notificationOnboard: allData.notificationOnboard,
          expoToken: allData.expoToken,
          seenNotificationOnboardPrompt: allData.seenNotificationOnboardPrompt,
          userCheckoutSortMethod: allData.userCheckoutSortMethod,
          userHoldPendingSortMethod: allData.userHoldPendingSortMethod,
          userHoldReadySortMethod: allData.userHoldReadySortMethod,
          preferredPickupLocationIsValid: allData.preferredPickupLocationIsValid,
          preferredPickupLocationWarning: allData.preferredPickupLocationWarning,
     };
     userDataSnapshotCache.set(JSON.stringify(USER_STATE_KEY), userState);
     userDataSnapshotCache.set(JSON.stringify(USER_ACCOUNTS_KEY), allData.accounts ?? null);
     userDataSnapshotCache.set(JSON.stringify(USER_VIEWERS_KEY), allData.viewers ?? null);
     userDataSnapshotCache.set(JSON.stringify(USER_LISTS_KEY), allData.lists ?? null);
     userDataSnapshotCache.set(JSON.stringify(USER_LIST_GROUPS_KEY), allData.listGroups ?? null);
     userDataSnapshotCache.set(JSON.stringify(USER_LOCATIONS_KEY), allData.locations ?? null);
     userDataSnapshotCache.set(JSON.stringify(USER_READING_HISTORY_KEY), allData.readingHistory ?? null);
     userDataSnapshotCache.set(JSON.stringify(USER_SAVED_EVENTS_KEY), allData.savedEvents ?? null);
     userDataSnapshotCache.set(JSON.stringify(USER_CARDS_KEY), allData.cards ?? null);
     userDataSnapshotCache.set(JSON.stringify(USER_NOTIFICATION_HISTORY_KEY), allData.notificationHistory ?? null);
     userDataSnapshotCache.set(JSON.stringify(USER_INBOX_KEY), allData.inbox ?? null);
}
