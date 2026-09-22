/**
 * evaluateStartupCache.test.js
 * Regression tests for Splash.js's evaluateStartupCache(): session identity must be
 * resolved (and legacy rows backfilled) BEFORE any of the per-table cache loads run,
 * since every one of those loads is now scoped to whatever the session context says is
 * the active user/location/library.
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../src/util/db', () => ({
     loadAllLanguageData: jest.fn().mockResolvedValue(null),
     loadAllLibraryBranchData: jest.fn().mockResolvedValue(null),
     loadAllLibrarySystemData: jest.fn().mockResolvedValue(null),
     loadAllUserData: jest.fn().mockResolvedValue(null),
     loadLibraryUrl: jest.fn().mockResolvedValue(''),
     loadLocation: jest.fn().mockResolvedValue(null),
     loadThemeState: jest.fn().mockResolvedValue(null),
     saveThemeState: jest.fn().mockResolvedValue(undefined),
     setCurrentUserId: jest.fn(),
     setCurrentLocationId: jest.fn(),
     setCurrentLibraryId: jest.fn(),
     findCachedUserIdForUsername: jest.fn().mockResolvedValue(null),
     backfillLegacyUserId: jest.fn().mockResolvedValue(undefined),
     backfillLegacyBrowseCategoryScope: jest.fn().mockResolvedValue(undefined),
     parseStoredNumber: jest.requireActual('../src/util/db/sessionContext').parseStoredNumber,
     saveSelfCheckEnabled: jest.fn().mockResolvedValue(undefined),
     saveSelfCheckSettings: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/util/logging', () => ({
     logDebugMessage: jest.fn(),
     logErrorMessage: jest.fn(),
}));

jest.mock('../src/hooks/useLibrarySystemData', () => ({
     prehydrateLibrarySystemSnapshotCache: jest.fn(),
}));

jest.mock('../src/hooks/useLibraryBranchData', () => ({
     prehydrateLibraryBranchSnapshotCache: jest.fn(),
     invalidateSelfCheckSnapshot: jest.fn(),
}));

jest.mock('../src/hooks/useLanguageData', () => ({
     prehydrateLanguageSnapshotCache: jest.fn(),
}));

jest.mock('../src/hooks/useUserData', () => ({
     prehydrateUserDataSnapshotCache: jest.fn(),
}));

jest.mock('../src/util/api/system', () => ({
     getSelfCheckSettings: jest.fn().mockResolvedValue({ ok: false }),
}));

jest.mock('../src/translations/TranslationService', () => ({
     getTermFromDictionary: jest.fn(() => 'App Name'),
     ensureTranslationsLibraryHydrated: jest.fn().mockResolvedValue(undefined),
     setTranslationsLibrary: jest.fn(),
}));

import { evaluateStartupCache } from '../src/screens/Auth/Splash';
import {
     loadAllUserData,
     loadAllLibraryBranchData,
     loadAllLibrarySystemData,
     loadAllLanguageData,
     setCurrentUserId,
     setCurrentLocationId,
     setCurrentLibraryId,
     findCachedUserIdForUsername,
     backfillLegacyUserId,
     backfillLegacyBrowseCategoryScope,
} from '../src/util/db';

describe('evaluateStartupCache', () => {
     beforeEach(async () => {
          jest.clearAllMocks();
          // Restore default resolved values clobbered by clearAllMocks.
          loadAllUserData.mockResolvedValue(null);
          loadAllLibraryBranchData.mockResolvedValue(null);
          loadAllLibrarySystemData.mockResolvedValue(null);
          loadAllLanguageData.mockResolvedValue(null);
          findCachedUserIdForUsername.mockResolvedValue(null);

          // The SecureStore/AsyncStorage mocks are backed by module-level in-memory stores
          // that persist across tests within this file - clear them so one test's seeded
          // values (e.g. locationId) can't leak into the next.
          await SecureStore.deleteItemAsync('userKey');
          await SecureStore.deleteItemAsync('locationId');
          await AsyncStorage.clear();
     });

     it('resolves location/library session context before loading any per-table cache', async () => {
          await SecureStore.setItemAsync('locationId', '10');
          await AsyncStorage.setItem('@libraryId', '2');

          await evaluateStartupCache();

          expect(setCurrentLocationId).toHaveBeenCalledWith(10);
          expect(setCurrentLibraryId).toHaveBeenCalledWith(2);

          const locationOrder = setCurrentLocationId.mock.invocationCallOrder[0];
          const libraryOrder = setCurrentLibraryId.mock.invocationCallOrder[0];
          const branchLoadOrder = loadAllLibraryBranchData.mock.invocationCallOrder[0];
          const systemLoadOrder = loadAllLibrarySystemData.mock.invocationCallOrder[0];

          expect(locationOrder).toBeLessThan(branchLoadOrder);
          expect(libraryOrder).toBeLessThan(systemLoadOrder);
     });

     it('looks up the cached user id by username, and sets it before loading user data', async () => {
          await SecureStore.setItemAsync('userKey', 'JaneDoe');
          findCachedUserIdForUsername.mockResolvedValueOnce(5);

          await evaluateStartupCache();

          expect(findCachedUserIdForUsername).toHaveBeenCalledWith('JaneDoe');
          expect(setCurrentUserId).toHaveBeenCalledWith(5);

          const userIdSetOrder = setCurrentUserId.mock.invocationCallOrder[0];
          const userLoadOrder = loadAllUserData.mock.invocationCallOrder[0];
          expect(userIdSetOrder).toBeLessThan(userLoadOrder);
     });

     it('runs the legacy backfill before loading user data, only when a cached user id was found', async () => {
          findCachedUserIdForUsername.mockResolvedValueOnce(5);

          await evaluateStartupCache();

          expect(backfillLegacyUserId).toHaveBeenCalledWith(5);
          const backfillOrder = backfillLegacyUserId.mock.invocationCallOrder[0];
          const userLoadOrder = loadAllUserData.mock.invocationCallOrder[0];
          expect(backfillOrder).toBeLessThan(userLoadOrder);
     });

     it('does not run the legacy backfill when no cached user id was found', async () => {
          findCachedUserIdForUsername.mockResolvedValueOnce(null);

          await evaluateStartupCache();

          expect(backfillLegacyUserId).not.toHaveBeenCalled();
     });

     it('only backfills the browse-category scope when both a user id and a location id are known', async () => {
          findCachedUserIdForUsername.mockResolvedValueOnce(5);
          await SecureStore.setItemAsync('locationId', '10');

          await evaluateStartupCache();

          expect(backfillLegacyBrowseCategoryScope).toHaveBeenCalledWith(5, 10);
     });

     it('does not backfill the browse-category scope when the location id is unknown', async () => {
          findCachedUserIdForUsername.mockResolvedValueOnce(5);
          // No locationId seeded in SecureStore this time.

          await evaluateStartupCache();

          expect(backfillLegacyBrowseCategoryScope).not.toHaveBeenCalled();
     });

     it('hasUsableUserCache reflects only whether cachedUserState.user is present - no separate identity matching', async () => {
          loadAllUserData.mockResolvedValueOnce({ user: { id: 5, displayName: 'Jane' }, updatedAt: Date.now() });

          const result = await evaluateStartupCache();

          expect(result.hasUsableUserCache).toBe(true);
     });

     it('hasUsableUserCache is false when the scoped load finds nothing for the current identity', async () => {
          loadAllUserData.mockResolvedValueOnce(null);

          const result = await evaluateStartupCache();

          expect(result.hasUsableUserCache).toBe(false);
     });

     it('canBypassLoading requires every one of the four caches to be usable', async () => {
          loadAllUserData.mockResolvedValueOnce({ user: { id: 5 }, updatedAt: Date.now() });
          loadAllLibraryBranchData.mockResolvedValueOnce({
               location: { locationId: 10 },
               updatedAt: Date.now(),
          });
          loadAllLibrarySystemData.mockResolvedValueOnce({
               library: { libraryId: 2 },
               updatedAt: Date.now(),
          });
          // Language cache deliberately left unusable (null).

          const result = await evaluateStartupCache();

          expect(result.hasUsableUserCache).toBe(true);
          expect(result.hasUsableLibraryBranchCache).toBe(true);
          expect(result.hasUsableLibrarySystemCache).toBe(true);
          expect(result.hasUsableLanguageCache).toBe(false);
          expect(result.canBypassLoading).toBe(false);
     });
});
