import { getThemeInfo, resolveThemeInfoIdFromWebThemes } from '../src/util/api/system';

const mockGet = jest.fn();

jest.mock('../src/util/api/apiFactory', () => ({
     createApiClient: jest.fn(() => ({
          get: mockGet,
          post: jest.fn(),
     })),
}));

jest.mock('../src/util/globals', () => ({
     LIBRARY: { url: '' },
     GLOBALS: {
          url: 'https://config-url.example',
          themeId: 99,
          slug: 'aspen-lida-bws',
          timeoutFast: 1000,
     },
     isBrandedApp: jest.fn(() => true),
}));

jest.mock('../src/util/db', () => ({
     loadLibrary: jest.fn(async () => ({ baseUrl: 'https://library.example' })),
     loadLocation: jest.fn(async () => ({ locationId: 2 })),
     loadAppSettings: jest.fn(async () => null),
     saveAppSettings: jest.fn(async () => {}),
     saveThemeCatalog: jest.fn(async () => {}),
     loadThemeState: jest.fn(async () => null),
     clearThemeCatalog: jest.fn(async () => {}),
}));

jest.mock('../src/helpers/helpers', () => ({
     generateSwatches: jest.fn((color) => ({ base: color })),
     buildSwatchFromThemeTokens: jest.fn((tokens) => ({ base: tokens?.base ?? null })),
}));

jest.mock('../src/components/feedback', () => ({
     popToast: jest.fn(),
}));

jest.mock('../src/translations/TranslationHelper', () => ({
     getTermFromDictionary: jest.fn(() => 'Error'),
}));

jest.mock('../src/hooks/useThemeData', () => ({
     notifyThemeCatalogChanged: jest.fn(),
}));

jest.mock('../src/util/logging', () => ({
     logDebugMessage: jest.fn(),
     logErrorMessage: jest.fn(),
     logInfoMessage: jest.fn(),
     logWarnMessage: jest.fn(),
}));

describe('theme assignment fallback behavior', () => {
     beforeEach(() => {
          jest.clearAllMocks();
     });

     it('picks the lowest-weight themeId from assignment rows', () => {
          const rawThemes = {
               68: { id: 68, libraryId: 2, themeId: 4, weight: 3 },
               81: { id: 81, libraryId: 2, themeId: 1, weight: 0 },
               83: { id: 83, libraryId: 2, themeId: 27, weight: 4 },
          };

          expect(resolveThemeInfoIdFromWebThemes(rawThemes)).toBe(1);
     });

     it('uses lowest-weight assigned themeId when catalog has no color definitions', async () => {
          mockGet.mockImplementation(async (endpoint, params = {}) => {
               if (endpoint === '/SystemAPI?method=getAppSettings') {
                    return { ok: true, data: { result: { settings: [] } } };
               }

               if (endpoint === 'SystemAPI?method=getAspenLiDAThemesByLocation') {
                    return {
                         ok: true,
                         data: {
                              result: {
                                   success: true,
                                   themes: {
                                        68: { id: 68, libraryId: 2, themeId: 4, weight: 3 },
                                        81: { id: 81, libraryId: 2, themeId: 1, weight: 0 },
                                        83: { id: 83, libraryId: 2, themeId: 27, weight: 4 },
                                   },
                              },
                         },
                    };
               }

               if (endpoint === '/SystemAPI?method=getThemeInfo') {
                    expect(params.id).toBe(1);
                    return {
                         ok: true,
                         data: {
                              result: {
                                   theme: {
                                        primaryBackgroundColor: '#111111',
                                        secondaryBackgroundColor: '#222222',
                                        tertiaryBackgroundColor: '#333333',
                                   },
                              },
                         },
                    };
               }

               throw new Error(`Unexpected endpoint: ${endpoint}`);
          });

          const result = await getThemeInfo(null, 2);

          expect(result.themeId).toBe(99);
          expect(result.palettes).toHaveLength(3);
          expect(mockGet).toHaveBeenCalledWith('/SystemAPI?method=getThemeInfo', { id: 1 });
     });
});

