global.IS_REACT_ACT_ENVIRONMENT = true;

import React from 'react';

//Set up and override globals as needed
import {GLOBALS, LIBRARY} from '../src/util/globals';

LIBRARY.url = 'https://mocklibrary.com';
LIBRARY.name = 'Mock Library'
LIBRARY.id = '123';
LIBRARY.appSettings = {
     loadingMessageType: 1,
     loadingMessage: null
};
GLOBALS.logLevel = 1;
GLOBALS.slug = 'aspen-lida';

import {render, screen, waitFor} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {GluestackUIProvider} from '@/components/ui/gluestack-ui-provider';

// Import all contexts used by the component to mock them
import {
     SystemMessagesContext
} from '../src/context/initialContext';
import { AuthContext } from '../src/context/AuthContext';

const {act} = require('@testing-library/react-native');

// Create a helper wrapper for Providers
const createTestQueryClient = () => new QueryClient({
     defaultOptions: {
          queries: {
               retry: false, // turn off retries for faster test failures
               cacheTime: 0, // Prevents stale queries from freezing state transitions
               staleTime: 0,
          },
     },
});

const mockContextValues = {
     language: {
          language: 'en',
          updateLanguage: jest.fn(),
          updateLanguages: jest.fn(),
          updateDictionary: jest.fn(),
          dictionary: {},
          languageDisplayName: 'English',
          updateLanguageDisplayName: jest.fn(),
          languages: []
     },
     messages: {systemMessages: [], updateSystemMessages: jest.fn()},
     theme: {
          theme: {
               tokens: {
                    ui: {
                         border: {
                              light: '#6b7280',
                              dark: '#d6d3d1',
                         },
                    },
                    colors: {
                         primary: {
                              500: '#1d4ed8',
                              '500-text': '#ffffff',
                         },
                         ui: {
                              border: {
                                   light: '#6b7280',
                                   dark: '#d6d3d1',
                              },
                         },
                    },
               },
          },
          updateTheme: jest.fn(),
          colorMode: 'light',
          updateColorMode: jest.fn(),
          textColor: '#000'
     }
};

const mockUpdateUserProfile = jest.fn(async () => {});
const mockUpdateAccounts = jest.fn(async () => {});
const mockUpdateCards = jest.fn(async () => {});
const mockUpdateAppPreferences = jest.fn(async () => {});
const mockUpdateNotificationHistory = jest.fn(async () => {});
const mockUpdateInbox = jest.fn(async () => {});

jest.mock('../src/hooks/useUserData', () => ({
     useUpdateUserProfile: () => mockUpdateUserProfile,
     useUpdateAccounts: () => mockUpdateAccounts,
     useUpdateCards: () => mockUpdateCards,
     useUpdateAppPreferences: () => mockUpdateAppPreferences,
     useUpdateNotificationHistory: () => mockUpdateNotificationHistory,
     useUpdateInbox: () => mockUpdateInbox,
}));

// Mock the API endpoints called by useQuery
jest.mock('../src/themes/theme', () => {
     const {basicThemeObject} = require('../__mocks__/themes');
     const uiColors = {
          surface: { light: '#e7e5e4', dark: '#111827' },
          text: { light: '#1f2937', dark: '#e5e7eb' },
          border: { light: '#6b7280', dark: '#d6d3d1' },
          icon: { light: '#57534e', dark: '#e5e7eb' },
          iconMuted: { light: '#6b7280', dark: '#9ca3af' },
          card: { light: '#f9fafb', dark: '#1f2937' },
          white: '#ffffff',
          black: '#000000',
          danger: '#ef4444',
     };
     const themeColors = {
          primary: basicThemeObject.tokens.colors.primary,
          secondary: basicThemeObject.tokens.colors.secondary,
          tertiary: basicThemeObject.tokens.colors.tertiary,
     };
     const compatibilityTheme = {
          ...basicThemeObject,
          tokens: {
               ...basicThemeObject.tokens,
               colors: {
                    ...themeColors,
                    ui: uiColors,
               },
               ui: uiColors,
          },
     };

     return {
          buildThemeForLibrary: jest.fn(() => Promise.resolve({
               theme: compatibilityTheme,
               themeColors,
               themeId: 1,
          })),
          useThemeForDisplay: jest.fn(() => ({
               theme: compatibilityTheme,
               themeColors,
               themeId: 1,
               colorMode: 'light',
               textColor: '#000',
               uiColors,
          })),
          useTheme: jest.fn(() => ({
               theme: compatibilityTheme,
               themeColors,
               themeId: 1,
               colorMode: 'light',
               textColor: '#000',
               uiColors,
               updateTheme: jest.fn(),
               updateColorMode: jest.fn(),
               updateTextColor: jest.fn(),
               resetTheme: jest.fn(),
          })),
          useColorModeValue: jest.fn((lightValue) => lightValue),
          UI_COLOR_FALLBACKS: uiColors,
     };
});

jest.mock('../src/translations/TranslationService', () => {
     const {englishTranslations} = require('../__mocks__/translations');
     const actualHelper = jest.requireActual('../src/translations/TranslationHelper');

     return {
          ...actualHelper,
          LanguageSwitcher: () => null,
          getLanguageDisplayName: jest.fn((code, languages) => {
               if (!Array.isArray(languages) || !code) {
                    return '';
               }
               const language = languages.find((item) => item?.code === code);
               return language?.displayName ?? '';
          }),
          getTranslatedTermsForUserPreferredLanguage: jest.fn(() => Promise.resolve(true)),
          loadTranslationsFromDiscovery: jest.fn(() => Promise.resolve(englishTranslations)),
          setTranslationsLibrary: jest.fn(),
          translationsLibrary: englishTranslations,
     };
});

// Mock the actual React Query custom hooks used in the screen waterfall sequence
jest.mock('../src/util/api/system', () => {
     const {catalogOnlineObject} = require('../__mocks__/catalogStatus');
     const {englishOnlyLanguageObject} = require('../__mocks__/libraryLanguages');
     const {basicLibraryInfoObject} = require('../__mocks__/libraryInfo');
     const {noLibraryLinks} = require('../__mocks__/libraryLinks');
     const {basicLocationInfo} = require('../__mocks__/locationInfo');
     const {selfCheckDisabled} = require('../__mocks__/selfCheckSettings');
     const {noSystemMessages} = require('../__mocks__/systemMessages');

     return {
          getCatalogStatus: jest.fn(() => Promise.resolve(catalogOnlineObject)),
          getLibraryLanguages: jest.fn(() => Promise.resolve(englishOnlyLanguageObject)),
          normalizeLibraryLanguagesPayload: jest.fn((languages) => (Array.isArray(languages) ? languages : Object.values(languages ?? {}))),
          getLibraryInfo: jest.fn(() => Promise.resolve(basicLibraryInfoObject)),
          getLibraryLinks: jest.fn(() => Promise.resolve(noLibraryLinks)),
          getLocationInfo: jest.fn(() => Promise.resolve(basicLocationInfo)),
          getSelfCheckSettings: jest.fn(() => Promise.resolve(selfCheckDisabled)),
          getSystemMessages: jest.fn(() => Promise.resolve(noSystemMessages)),
     };
});

jest.mock('../src/util/api/user', () => {
     const {basicProfile} = require('../__mocks__/profile');
     const {noLinkedAccounts} = require('../__mocks__/linkedAccounts');
     const {noNotificationPreferences} = require('../__mocks__/appPreferences');
     const {noNotificationHistory} = require('../__mocks__/notificationHistory');
     return {
          // Step 8
          refreshProfile: jest.fn(() => Promise.resolve(basicProfile)),
          // Step 9
          getLinkedAccounts: jest.fn(() => Promise.resolve(noLinkedAccounts)),
          // Step 10
          getAppPreferencesForUser: jest.fn(() => Promise.resolve(noNotificationPreferences)),
          // Step 11
          fetchNotificationHistory: jest.fn(() => Promise.resolve(noNotificationHistory)),
     }
});

jest.mock('../src/util/api/search', () => {
     const {homeScreenFeedWithoutLinks} = require('../__mocks__/homeScreenFeed');
     const {basicBrowseCategoryList} = require('../__mocks__/browseCategoryListForUser');

     return {
          getHomeScreenFeed: jest.fn(() => Promise.resolve(homeScreenFeedWithoutLinks)),
          getBrowseCategoryListForUser: jest.fn(() => Promise.resolve(basicBrowseCategoryList))
     }
});

jest.mock('../src/util/db', () => ({
     loadAllUserData: jest.fn(() => Promise.resolve({ user: null, updatedAt: null })),
     loadUserState: jest.fn(() => Promise.resolve({ user: null, language: 'en', languageDisplayName: 'English' })),
     saveUserSettings: jest.fn(() => Promise.resolve()),
     loadAllLibraryBranchData: jest.fn(() => Promise.resolve({ location: null, selfCheckSettings: null, updated_at: null })),
     loadAllLibrarySystemData: jest.fn(() => Promise.resolve({ library: null, menu: null, catalogStatus: null, updatedAt: null })),
      loadAllLanguageData: jest.fn(() => Promise.resolve({ languages: [], dictionary: {}, updatedAt: null })),
      saveAllLanguageData: jest.fn(() => Promise.resolve()),
      loadAvailableLanguages: jest.fn(() => Promise.resolve([])),
      saveAvailableLanguages: jest.fn(() => Promise.resolve()),
      loadLibraryLanguages: jest.fn(() => Promise.resolve([])),
      saveLibraryLanguages: jest.fn(() => Promise.resolve()),
      loadDictionary: jest.fn(() => Promise.resolve({})),
      saveDictionary: jest.fn(() => Promise.resolve()),
     loadBrowseCategories: jest.fn(() => Promise.resolve({ data: [], updatedAt: Date.now(), isExpired: false })),
     loadBrowseCategoryList: jest.fn(() => Promise.resolve({ data: [], updatedAt: Date.now(), isExpired: false })),
     loadMaxCategories: jest.fn(() => Promise.resolve(5)),
     saveUserProfile: jest.fn(() => Promise.resolve()),
     saveAccounts: jest.fn(() => Promise.resolve()),
     saveCards: jest.fn(() => Promise.resolve()),
     saveAppPreferences: jest.fn(() => Promise.resolve()),
     saveNotificationHistory: jest.fn(() => Promise.resolve()),
     saveInbox: jest.fn(() => Promise.resolve()),
     saveAllLibraryBranchData: jest.fn(() => Promise.resolve()),
     saveBrowseCategories: jest.fn(() => Promise.resolve(true)),
     saveBrowseCategoryList: jest.fn(() => Promise.resolve(true)),
     saveMaxCategories: jest.fn(() => Promise.resolve()),
     saveCatalogStatus: jest.fn(() => Promise.resolve()),
     saveLibraryVersion: jest.fn(() => Promise.resolve()),
     saveLibrary: jest.fn(() => Promise.resolve()),
     saveMenu: jest.fn(() => Promise.resolve()),
     saveHomeScreenLinks: jest.fn(() => Promise.resolve()),
     loadLocation: jest.fn(() => Promise.resolve({ locationId: 2 })),
     loadThemeState: jest.fn(() => Promise.resolve({
          themeId: 1,
          colorMode: 'light',
          textColor: 'textLight950',
          themeColors: null,
          updatedAt: null,
     })),
     saveThemeState: jest.fn(() => Promise.resolve()),
     isStoredThemeIdMatch: jest.fn(() => Promise.resolve(false)),
}));

const mockNavigate = jest.fn();
let triggerFocusEvent = () => { };
let mockIsFocused = true;

jest.mock('@react-navigation/native', () => {
     const actualNav = jest.requireActual('@react-navigation/native');

     // noinspection JSUnusedGlobalSymbols
     return {
          ...actualNav,
          useNavigation: () => ({
               navigate: mockNavigate,
               addListener: jest.fn((event, callback) => {
                    // noinspection JSUnresolvedReference
                    const unsubscribe = jest.fn();
                    if (event === 'focus') {
                         triggerFocusEvent = callback;
                    }
                    return unsubscribe;
               }),
               reset: jest.fn(),
          }),
          useRoute: () => ({ params: { isSQLiteMigrationNeeded: false } }),
          useIsFocused: () => mockIsFocused,
          useLinkTo: () => jest.fn(),
      };
});

jest.mock('@react-native-aria/overlays', () => {
     // noinspection JSUnusedGlobalSymbols
     return {
          useOverlayPosition: () => ({
               overlayProps: {},
               positionProps: {style: {}},
               updatePosition: jest.fn(),
          }),
          OverlayContainer: ({children}) => children,
          OverlayProvider: ({children}) => children,
     };
}, { virtual: true });

jest.mock('react-native-safe-area-context', () => {
     const inset = {top: 0, right: 0, bottom: 0, left: 0};
     // noinspection JSUnusedGlobalSymbols
     return {
          SafeAreaProvider: ({children}) => children,
          SafeAreaView: ({children}) => children,
          useSafeAreaInsets: () => inset,
          useSafeAreaFrame: () => ({x: 0, y: 0, width: 390, height: 844}),
     };
});

const AllTheProviders = ({children}) => {
     const [testQueryClient] = React.useState(() => createTestQueryClient());
     const authValue = React.useMemo(() => ({ signOut: jest.fn(), signIn: jest.fn(), signUp: jest.fn(), state: {} }), []);
     // noinspection JSValidateTypes
       return (
            <GluestackUIProvider>
                 <QueryClientProvider client={testQueryClient}>
                      <AuthContext.Provider value={authValue}>
                           <SystemMessagesContext.Provider value={mockContextValues.messages}>
                                 {children}
                           </SystemMessagesContext.Provider>
                      </AuthContext.Provider>
                 </QueryClientProvider>
            </GluestackUIProvider>
       );
};

beforeEach(() => {
     mockIsFocused = true;
     mockNavigate.mockClear();
     mockUpdateUserProfile.mockClear();
     mockUpdateAccounts.mockClear();
     mockUpdateCards.mockClear();
     mockUpdateAppPreferences.mockClear();
     mockUpdateNotificationHistory.mockClear();
     mockUpdateInbox.mockClear();
     triggerFocusEvent = () => { };
     jest.clearAllMocks();
});

//Finally, import the actual screen to make sure that all the mocks are set up first.
import {LoadingScreen} from '../src/screens/Auth/Loading';

/*
 * Do a basic test to be sure the screen renders properly
 */
describe('<LoadingScreen />', () => {
     it('renders correctly', async () => {
          const {unmount} = await render(<LoadingScreen/>, {wrapper: AllTheProviders});

          // 1. Assert that the component renders without crashing
          expect(screen.toJSON()).toBeTruthy();

          await unmount();
     });
});

/*
 * Test the happy path startup to ensure the focus listener proceeds properly
 */
it('completes the sequential loading happy path and navigates to DrawerStack', async () => {
     const {unmount} = await render(<LoadingScreen/>, {wrapper: AllTheProviders});

     const progressBar = screen.getByTestId('progress-bar');

     await act(async () => {
          if (typeof triggerFocusEvent === 'function') {
               triggerFocusEvent();
          } else {
               throw new Error("❌ triggerFocusEvent was never populated by the component's addListener!");
          }
     });

     try {
          await waitFor(() => {
               expect(progressBar.props['aria-valuenow']).toEqual(100);
               expect(mockNavigate).toHaveBeenCalledWith('DrawerStack', expect.objectContaining({
                    prevRoute: 'LoadingScreen'
               }));
          }, {timeout: 4000, interval: 50});
     } catch (error) {
          // FORCE JEST TO PRINT THE EXACT DOM STATE BEFORE THE TIMEOUT FAILED
          console.log('❌ TEST STALLED! CURRENT SCREEN STATE VIEW TREE:');
          screen.debug();
          throw error; // Rethrow so the test runner fails clearly
     }

     await unmount();
});

it('does not start loading side effects while the screen is not focused', async () => {
     mockIsFocused = false;

     const systemApi = require('../src/util/api/system');
     const userApi = require('../src/util/api/user');
     const searchApi = require('../src/util/api/search');

     const {unmount} = await render(<LoadingScreen/>, {wrapper: AllTheProviders});

     // Give effects a tick; focused-only effects should remain gated.
     await act(async () => {
          await Promise.resolve();
     });

     expect(systemApi.getCatalogStatus).not.toHaveBeenCalled();
     expect(systemApi.getLibraryInfo).not.toHaveBeenCalled();
     expect(systemApi.getLocationInfo).not.toHaveBeenCalled();
     expect(userApi.refreshProfile).not.toHaveBeenCalled();
     expect(searchApi.getHomeScreenFeed).not.toHaveBeenCalled();
     expect(mockNavigate).not.toHaveBeenCalled();

     await unmount();
});
