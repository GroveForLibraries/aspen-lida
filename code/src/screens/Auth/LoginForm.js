import { ThemedMaterialIcons as MaterialIcons, ThemedMaterialCommunityIcons as MaterialCommunityIcons } from '../../components/themed/ThemedMaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import React, { useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { DisplayMessage } from '../../components/Notifications';
import { useUpdateLibrary, useUpdateCatalogStatus, useCatalogStatus, useAppSettings } from '../../hooks/useLibrarySystemData';
import { useUpdateActiveLanguage } from '../../hooks/useLanguageData';
import { navigate } from '../../helpers/RootNavigator';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { getLocationInfo, getCatalogStatus, getSelfCheckSettings } from '../../util/api/system';
import { loginToLiDA } from '../../util/api/user';
import { stripHTML, formatDiscoveryVersion } from '../../helpers/helpers';
import { GLOBALS, isBrandedApp, LIBRARY } from '../../util/globals';
import { ResetExpiredPin } from './ResetExpiredPin';
import { saveAllLibraryBranchData, setCurrentLocationId, setCurrentLibraryId } from '../../util/db';
import { logDebugMessage, logInfoMessage, logWarnMessage, getErrorMessage } from '../../util/logging.js';
import { createApiClient } from '../../util/api/apiFactory';
import { useTheme, TOKENS } from '../../themes/theme';
import { ThemedFormControl as FormControl, ThemedInput as Input, ThemedInputField as InputField, ThemedFormControlLabelText as FormControlLabelText, ThemedFormControlLabel as FormControlLabel, ThemedInputSlot as InputSlot } from '../../components/themed/ThemedFormControls';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { Center } from '@/components/ui/center';

/**
 * GetLoginForm component that displays the login form for users to enter their username and password, handles login validation, and manages state for expired PINs and login errors.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
export const GetLoginForm = (props) => {
     const { neutralPairs, colorMode, forceRefreshTheme } = useTheme();
     const borderColor = colorMode === 'light' ? (neutralPairs?.border?.light ?? TOKENS.semanticTokens.light.border) : (neutralPairs?.border?.dark ?? TOKENS.semanticTokens.dark.border);
     const navigation = useNavigation();
     const barcode = useRoute().params?.barcode ?? null;
     const [loading, setLoading] = React.useState(false);
     const [loadingDefaultUsername, setLoadingDefaultUsername] = React.useState(false);

     const [pinValidationRules, setPinValidationRules] = React.useState([]);
     const [expiredPin, setExpiredPin] = React.useState(false);
     const [resetToken, setResetToken] = React.useState('');
     const [userId, setUserId] = React.useState('');

     const [loginError, setLoginError] = React.useState(false);
     const [loginErrorMessage, setLoginErrorMessage] = React.useState('');

     // securely set and store key:value pairs
     const [username, setUsername] = React.useState('');
     const [valueSecret, setPassword] = React.useState('');

     // show:hide data from password field
     const [showPassword, setShowPassword] = React.useState(false);
     const toggleShowPassword = () => setShowPassword(!showPassword);

     // make ref to move the user to next input field
     const passwordRef = useRef();
     const { signIn } = React.useContext(AuthContext);
      const updateCatalogStatus = useUpdateCatalogStatus();
      const { status: catalogStatus } = useCatalogStatus();
      const updateLibrary = useUpdateLibrary();
     const updateLanguage = useUpdateActiveLanguage();
     const appSettings = useAppSettings();
     const patronsLibrary = props.selectedLibrary;

     const { usernameLabel, passwordLabel, allowBarcodeScanner, allowCode39, updateSelectedLibrary, libraries } = props;

     // Pre-fill username from AsyncStorage on mount
     React.useEffect(() => {
          const prefillUsername = async () => {
               try {
                    const savedBarcode = await AsyncStorage.getItem('@userBarcode');
                    if (savedBarcode) {
                         setUsername(savedBarcode);
                         logDebugMessage('Pre-filled username from saved barcode');
                    }
               } catch (e) {
                    logWarnMessage('Failed to load saved username');
                    logErrorMessage(e);
               }
          };
          prefillUsername();
     }, []);

     const resolveSelfCheckEnabled = (result = {}) => {
          const candidates = [
               result?.settings?.isEnabled,
               result?.settings?.enableSelfCheck,
               result?.settings?.selfCheckEnabled,
               result?.isEnabled,
               result?.enableSelfCheck,
               result?.selfCheckEnabled,
          ];

          for (const candidate of candidates) {
               if (candidate === true || candidate === 1 || candidate === '1') return true;
               if (candidate === false || candidate === 0 || candidate === '0') return false;
               if (typeof candidate === 'string') {
                    const lowered = candidate.toLowerCase();
                    if (lowered === 'true') return true;
                    if (lowered === 'false') return false;
               }
          }

          return undefined;
     };

     const persistLibraryBranchDataAfterLogin = async (baseUrl, locationId) => {
          try {
               const locationResponse = await getLocationInfo(baseUrl, locationId);
               const location = locationResponse?.ok ? (locationResponse.data?.result?.location ?? null) : null;
               if (!location) {
                    return null;
               }

               const selfCheckResponse = await getSelfCheckSettings(baseUrl, locationId ?? location.locationId ?? null);
               let selfCheckEnabled;
               let selfCheckSettings;
               if (selfCheckResponse?.ok) {
                    const result = selfCheckResponse.data?.result ?? {};
                    const parsedEnabled = resolveSelfCheckEnabled(result);
                    if (typeof parsedEnabled === 'boolean') {
                         selfCheckEnabled = parsedEnabled;
                    }
                    if (result?.settings && typeof result.settings === 'object') {
                         selfCheckSettings = result.settings;
                    }
               }

               await saveAllLibraryBranchData({
                    location: location,
                    ...(typeof selfCheckEnabled === 'boolean' ? { enableSelfCheck: selfCheckEnabled } : {}),
                    ...(selfCheckSettings ? { selfCheckSettings } : {}),
               });

               return location;
          } catch (_error) {
               // Keep login resilient if branch-cache warmup fails.
               return null;
          }
     };

     const initialValidation = async () => {
          setLoginError(false);
          setLoginErrorMessage('');
          updateCatalogStatus(0, null);
          const useUserHomeLibrary = appSettings?.autoPickUserHomeLocation ?? false;
          let tmpLibrary = patronsLibrary;
          if (!useUserHomeLibrary && patronsLibrary) {
               setCurrentLibraryId(patronsLibrary['libraryId']);
               logInfoMessage('Selected baseUrl: ' + patronsLibrary['baseUrl'] + ' + libraryId: ' + patronsLibrary['libraryId']);
          } else {
               tmpLibrary = libraries[0]; // set the first library as a connection to validate Discovery connection
               logInfoMessage('Using temporary baseUrl: ' + tmpLibrary['baseUrl'] + ' to validate Discovery connection');
          }
          const result = await checkAspenDiscovery(tmpLibrary['baseUrl'], tmpLibrary['libraryId']);
          if (result.ok) {
               const libraryInfo = result.data?.result?.library;
               updateLibrary(libraryInfo);
               LIBRARY.url = libraryInfo.baseUrl;
               LIBRARY.version = formatDiscoveryVersion(libraryInfo.discoveryVersion);
               setCurrentLibraryId(libraryInfo.libraryId);
               logDebugMessage("Successfully connected to " + libraryInfo.displayName);

               // check if catalog is in offline mode
               logDebugMessage('Checking if catalog is offline for ' + libraryInfo.displayName);
               const catalogResponse = await getCatalogStatus(libraryInfo.baseUrl);
               if (catalogResponse.ok) {
                    let catalogMessage = null;
                    if (catalogResponse.data.result?.api?.message) {
                         catalogMessage = stripHTML(catalogResponse.data.result.api.message);
                    }
                    let status = catalogResponse.data.result?.catalogStatus ?? 0;
                    const currentStatus = {
                         status: status,
                         message: catalogMessage
                    }
                    logDebugMessage('Catalog is ' + (currentStatus.status === 0 && !currentStatus.message ? 'online' : 'offline!'));
                     updateCatalogStatus(currentStatus.status, currentStatus.message);
                     if (currentStatus.status >= 1) {
                         logInfoMessage('Catalog is offline! ' + currentStatus.message);
                         setLoading(false);
                         setLoginError(true);
                         if (currentStatus.message) {
                              let tmp = stripHTML(currentStatus.message);
                              tmp = tmp.trim();
                              setLoginErrorMessage(tmp);
                         } else {
                              getTermFromDictionary('en', 'catalog_offline_message');
                         }
                         return;
                    }
               }else{
                    logDebugMessage('Could not get catalog status');
                    getErrorMessage(catalogResponse.code, catalogResponse.problem);
               }

               setPinValidationRules(libraryInfo.pinValidationRules);
               const loginResults = await loginToLiDA(username, valueSecret, tmpLibrary['baseUrl']);
               if (loginResults.ok) {
                    const validatedUser = loginResults.data.result;
                    if(validatedUser) {
                         GLOBALS.appSessionId = validatedUser.session ?? '';
                         GLOBALS.language = validatedUser.lang ?? 'en';

                         let userHomeLocationId = null;
                         if (validatedUser.homeLocationId && useUserHomeLibrary && isBrandedApp()) {
                              userHomeLocationId = validatedUser.homeLocationId;
                         }
                         await updateLanguage(validatedUser.lang ?? 'en');
                         if (validatedUser.success) {
                              logInfoMessage('Validated user and connection is good, finishing login process...');
                              await setAsyncStorage(userHomeLocationId, libraryInfo);
                              signIn();
                              logInfoMessage('Successfully logged in!');
                              setLoading(false);
                         } else {
                              if (validatedUser.resetToken) {
                                   logInfoMessage('Expired pin!');
                                   setResetToken(validatedUser.resetToken);
                                   setUserId(validatedUser.userId);
                                   setExpiredPin(true);
                                   setLoading(false);
                              } else {
                                   logInfoMessage(validatedUser.message);
                                   setLoginError(true);
                                   setLoginErrorMessage(validatedUser.message);
                                   setLoading(false);
                              }
                         }
                    }
               }else{
                    const error = getErrorMessage(loginResults.code, loginResults.problem);
                    setLoginError(true);
                    setLoginErrorMessage(error.message);
                    setLoading(false);
                    logDebugMessage("Error logging in user");
                    logDebugMessage(loginResults);
               }
          } else {
               const error = getErrorMessage(result.code, result.problem);
               logDebugMessage("Error fetching library info as a pre-login check in initialValidation");
               logDebugMessage(result);
               setLoading(false);
               setLoginError(true);
               setLoginErrorMessage(error.message);
          }
     };

     const openScanner = async () => {
          navigate('LibraryCardScanner', { allowCode39 });
     };

      const setAsyncStorage = async (userHomeLocationId = null, library) => {
           const effectiveLibrary = patronsLibrary ?? library;
           await SecureStore.setItemAsync('userKey', username);
           await SecureStore.setItemAsync('secretKey', valueSecret);
           // Save username for convenience on next login
           await AsyncStorage.setItem('@userBarcode', username);
           await AsyncStorage.setItem('@lastStoredVersion', Constants.expoConfig.version);
          let selectedLocationId = effectiveLibrary['locationId'] ?? null;
          let selectedBaseUrl = effectiveLibrary['baseUrl'] ?? library.baseUrl;

          if (userHomeLocationId) {
               logDebugMessage('User has a home location set (' + userHomeLocationId + ') and autoPickUserHomeLocation is enabled. Fetching details for that location...');
               await getLocationInfo(library.baseUrl, userHomeLocationId).then(async (response) => {
                    const patronHomeLocation = response.data.result.location;
                    if (typeof patronHomeLocation.baseUrl !== 'undefined') {
                         logDebugMessage('Successfully retrieved location info for user home location while logging in, setting asyncStorage library and location to: ' + patronHomeLocation.displayName + ' (' + patronHomeLocation.libraryId + ')');
                         updateSelectedLibrary(patronHomeLocation);
                         LIBRARY.url = patronHomeLocation.baseUrl;
                         setCurrentLibraryId(patronHomeLocation.libraryId);
                         setCurrentLocationId(patronHomeLocation.locationId);
                         await SecureStore.setItemAsync('library', JSON.stringify(patronHomeLocation.libraryId));
                         await AsyncStorage.setItem('@libraryId', JSON.stringify(patronHomeLocation.libraryId));
                         await SecureStore.setItemAsync('libraryName', patronHomeLocation.displayName);
                         await SecureStore.setItemAsync('locationId', JSON.stringify(patronHomeLocation.locationId));
                         await AsyncStorage.setItem('@locationId', JSON.stringify(patronHomeLocation.locationId));
                         await SecureStore.setItemAsync('solrScope', patronHomeLocation.solrScope);
                         await AsyncStorage.setItem('@solrScope', patronHomeLocation.solrScope);
                         await AsyncStorage.setItem('@pathUrl', patronHomeLocation.baseUrl);
                          selectedLocationId = patronHomeLocation.locationId;
                          selectedBaseUrl = patronHomeLocation.baseUrl;

                    } else {
                         // just store what we know
                         logDebugMessage('Problem getting location info for user home location. Setting library and location to: ' + library.displayName);
                         setCurrentLibraryId(library.libraryId);
                         setCurrentLocationId(library.locationId);
                         await SecureStore.setItemAsync('library', library.libraryId);
                         await AsyncStorage.setItem('@libraryId', library.libraryId);
                         await SecureStore.setItemAsync('libraryName', library.displayName);
                         await SecureStore.setItemAsync('locationId', library.locationId);
                         await AsyncStorage.setItem('@locationId', 0);
                         await SecureStore.setItemAsync('solrScope', effectiveLibrary['solrScope']);
                         await AsyncStorage.setItem('@solrScope', effectiveLibrary['solrScope']);
                         await AsyncStorage.setItem('@pathUrl', library.baseUrl);
                          selectedLocationId = 0;
                          selectedBaseUrl = library.baseUrl;
                    }
               });
          } else {
               logDebugMessage('User is not allowed to log into home location automatically, setting library and location to: ' + effectiveLibrary['displayName']);
               LIBRARY.url = effectiveLibrary['baseUrl'];
               setCurrentLibraryId(effectiveLibrary['libraryId']);
               setCurrentLocationId(effectiveLibrary['locationId']);
               updateSelectedLibrary(effectiveLibrary);
               await SecureStore.setItemAsync('library', effectiveLibrary['libraryId']);
               await AsyncStorage.setItem('@libraryId', effectiveLibrary['libraryId']);
               await SecureStore.setItemAsync('libraryName', effectiveLibrary['name']);
               await SecureStore.setItemAsync('locationId', effectiveLibrary['locationId']);
               await AsyncStorage.setItem('@locationId', effectiveLibrary['locationId']);
               await SecureStore.setItemAsync('solrScope', effectiveLibrary['solrScope']);

               await AsyncStorage.setItem('@solrScope', effectiveLibrary['solrScope']);
               await AsyncStorage.setItem('@pathUrl', effectiveLibrary['baseUrl']);
               selectedLocationId = effectiveLibrary['locationId'];
               selectedBaseUrl = effectiveLibrary['baseUrl'];
          }

          setCurrentLocationId(selectedLocationId);
          const activeLocation = await persistLibraryBranchDataAfterLogin(selectedBaseUrl, selectedLocationId);

          try {
               const activeLocationId = activeLocation?.locationId ?? selectedLocationId;
               logDebugMessage('Fetching theme for active location after login: ' + activeLocationId);
               await forceRefreshTheme(selectedBaseUrl, activeLocationId);
          } catch (error) {
               logWarnMessage('Failed to initialize theme for the active location after login');
               logDebugMessage(error);
          }
     };

     React.useEffect(() => {
          const loadDefaultUsername = async () => {
               try {
                    const defaultUsername = await SecureStore.getItemAsync('defaultUsername');
                    if (barcode)
                    {
                         setUsername(barcode);
                    }
                    else if (defaultUsername !== null && defaultUsername) {
                         setUsername(defaultUsername); // Set the retrieved username
                         //logDebugMessage("Default username is: " + defaultUsername);
                    }
               } catch (error) {
                    logWarnMessage("Error loading saved username:", error);
               } finally {
                    setLoadingDefaultUsername(false); // Stop loading regardless of success/failure
               }
          };

          loadDefaultUsername();
     }, [barcode]);

     const loginFormContent = (
          <>
               {loginError ? <DisplayMessage type="error" message={loginErrorMessage} /> : null}
               <FormControl>
                    <FormControlLabel>
                         <FormControlLabelText size="sm">{usernameLabel}</FormControlLabelText>
                    </FormControlLabel>
                    <Input style={{ borderColor }}>
                         <InputField autoCapitalize="none"
                              autoCorrect={false}
                              size="xl"
                              id="barcode"
                              value={username}
                              default={username}
                              onChangeText={(text) => {SecureStore.setItemAsync('defaultUsername', text); setUsername(text);}}
                              returnKeyType="next"
                              textContentType="username"
                              onSubmitEditing={() => {
                                   passwordRef.current.focus();
                              }}
                              blurOnSubmit={false}
                                     autoComplete="username"
                         />
                         {allowBarcodeScanner ?
                              <InputSlot onPress={() => openScanner()}>
                             <MaterialCommunityIcons name="barcode" size={20} className="mr-2" />
                        </InputSlot> : null}
                    </Input>
               </FormControl>
               <FormControl className="mt-3">
                    <FormControlLabel>
                        <FormControlLabelText size="sm">{passwordLabel}</FormControlLabelText>
                    </FormControlLabel>
                   <Input style={{ borderColor }}>
                        <InputField
                             size="xl"
                              type={showPassword ? 'text' : 'password'}
                              returnKeyType="go"
                              textContentType="password"
                              ref={passwordRef}
                              onChangeText={(text) => setPassword(text)}
                              onSubmitEditing={async () => {
                                   setLoading(true);
                                   await initialValidation();
                              }}
                              autoComplete="password"
                        />
                        <InputSlot onPress={toggleShowPassword}>
                             <MaterialIcons name={showPassword ? 'visibility' : 'visibility-off'} size={20} className="mr-2" />
                        </InputSlot>
                   </Input>
               </FormControl>

               <Center>
                    <Button
                        colorScheme="primary" className="mt-3"
                        size="md"
                        isLoading={loading}
                        isLoadingText={getTermFromDictionary('en', 'logging_in', true)}
                        onPress={async () => {
                             setLoading(true);
                             await initialValidation();
                         }}>
                        <ButtonText>{getTermFromDictionary('en', 'login')}</ButtonText>
                    </Button>
               </Center>
          </>
     );

     if (expiredPin) {
          return <ResetExpiredPin username={username} userId={userId} resetToken={resetToken} url={patronsLibrary['baseUrl']} pinValidationRules={pinValidationRules} setExpiredPin={setExpiredPin} patronsLibrary={patronsLibrary} />;
     }

     return loginFormContent;
};

async function checkAspenDiscovery(url, id) {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutFast });
     return await client.get('/SystemAPI?method=getLibraryInfo', { id });
}
