import { ThemedMaterialIcons as MaterialIcons, ThemedMaterialCommunityIcons as MaterialCommunityIcons } from '../../components/themed/ThemedMaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import React, { useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { DisplayMessage } from '../../components/Notifications';
import { useUpdateLibrary, useUpdateCatalogStatus, useCatalogStatus } from '../../hooks/useLibrarySystemData';
import { useUpdateActiveLanguage } from '../../hooks/useLanguageData';
import { navigate } from '../../helpers/RootNavigator';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { getLocationInfo, getCatalogStatus, getSelfCheckSettings } from '../../util/api/system';
import { loginToLiDA } from '../../util/api/user';
import { stripHTML } from '../../helpers/helpers';
import { GLOBALS, LIBRARY } from '../../util/globals';
import { formatDiscoveryVersion } from '../../helpers/helpers';
import { ResetExpiredPin } from './ResetExpiredPin';
import { saveAllLibraryBranchData } from '../../util/db';
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
     const patronsLibrary = props.selectedLibrary;

     const { usernameLabel, passwordLabel, allowBarcodeScanner, allowCode39, updateSelectedLibrary } = props;

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
           logInfoMessage ("Base Url is: " + patronsLibrary['baseUrl'] + " library is: " + patronsLibrary['libraryId']);
           const result = await checkAspenDiscovery(patronsLibrary['baseUrl'], patronsLibrary['libraryId']);
          if (result.ok) {
               const libraryInfo = result.data?.result?.library;
               updateLibrary(libraryInfo);
               LIBRARY.id = patronsLibrary['libraryId'];
               LIBRARY.url = patronsLibrary['baseUrl'];
               LIBRARY.version = formatDiscoveryVersion(libraryInfo.discoveryVersion);
               logDebugMessage("Successfully received library info");

               // check if catalog is in offline mode
               logDebugMessage("Checking if catalog is offline baseUrl:" + patronsLibrary['baseUrl'] );
               const catalogResponse = await getCatalogStatus(patronsLibrary['baseUrl']);
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
                    logDebugMessage('Catalog status: ' + JSON.stringify(currentStatus));
                     updateCatalogStatus(currentStatus.status, currentStatus.message);
                     if (currentStatus.status >= 1) {
                         // catalog is offline
                         logInfoMessage('catalog is offline');
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
                    } else {
                         logInfoMessage('Catalog online');
                          logDebugMessage(catalogStatus);
                          updateCatalogStatus(0, null);
                    }
               }else{
                    logDebugMessage('Could not get catalog status');
                    getErrorMessage(catalogResponse.code, catalogResponse.problem);
               }

               setPinValidationRules(libraryInfo.pinValidationRules);
               const loginResults = await loginToLiDA(username, valueSecret, patronsLibrary['baseUrl']);
               if (loginResults.ok) {
                    const validatedUser = loginResults.data.result;
                    if(validatedUser) {
                         GLOBALS.appSessionId = validatedUser.session ?? '';
                         GLOBALS.language = validatedUser.lang ?? 'en';
                         const userHomeLocationId = validatedUser.homeLocationId ?? null;
                         await updateLanguage(validatedUser.lang ?? 'en');
                         if (validatedUser.success) {
                              logInfoMessage('Successfully logged in');
                              await setAsyncStorage(userHomeLocationId);
                              signIn();
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

      const setAsyncStorage = async (userHomeLocationId = null) => {
           await SecureStore.setItemAsync('userKey', username);
           await SecureStore.setItemAsync('secretKey', valueSecret);
           // Save username for convenience on next login
           await AsyncStorage.setItem('@userBarcode', username);
           await AsyncStorage.setItem('@lastStoredVersion', Constants.expoConfig.version);
          const autoPickUserHomeLocation = parseInt(LIBRARY.appSettings?.autoPickUserHomeLocation ?? 0);
          let selectedLocationId = patronsLibrary['locationId'];
          let selectedBaseUrl = patronsLibrary['baseUrl'];

          if (userHomeLocationId && !GLOBALS.slug.startsWith('aspen-lida') && autoPickUserHomeLocation === 1) {
               logDebugMessage('User has a home location set (' + userHomeLocationId + ') and autoPickUserHomeLocation is enabled, attempting to use that location as default');
               await getLocationInfo(LIBRARY.url, userHomeLocationId).then(async (response) => {
                    const patronHomeLocation = response.data.result.location;
                    if (typeof patronHomeLocation.baseUrl !== 'undefined') {
                         logDebugMessage('Successfully retrieved location info for user home location while logging in, setting asyncStorage library and location to: ' + patronHomeLocation.displayName + ' (' + patronHomeLocation.libraryId + ')');
                         updateSelectedLibrary(patronHomeLocation);
                         LIBRARY.url = patronHomeLocation.baseUrl;
                         LIBRARY.id = patronHomeLocation.libraryId;
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
                         logDebugMessage('Problem getting location info for user home location. Setting library and location to: ' + patronsLibrary['name']);
                         LIBRARY.url = patronsLibrary['baseUrl'];
                         LIBRARY.id = patronsLibrary['libraryId'];
                         await SecureStore.setItemAsync('library', patronsLibrary['libraryId']);
                         await AsyncStorage.setItem('@libraryId', patronsLibrary['libraryId']);
                         await SecureStore.setItemAsync('libraryName', patronsLibrary['name']);
                         await SecureStore.setItemAsync('locationId', patronsLibrary['locationId']);
                         await AsyncStorage.setItem('@locationId', patronsLibrary['locationId']);
                         await SecureStore.setItemAsync('solrScope', patronsLibrary['solrScope']);
                         await AsyncStorage.setItem('@solrScope', patronsLibrary['solrScope']);
                         await AsyncStorage.setItem('@pathUrl', patronsLibrary['baseUrl']);
                          selectedLocationId = patronsLibrary['locationId'];
                          selectedBaseUrl = patronsLibrary['baseUrl'];
                    }
               });
          } else {
               logDebugMessage('No home location set for user or autoPickUserHomeLocation is disabled, setting library and location to: ' + patronsLibrary['name']);
               LIBRARY.url = patronsLibrary['baseUrl'];
               LIBRARY.id = patronsLibrary['libraryId'];
               updateSelectedLibrary(patronsLibrary);
               await SecureStore.setItemAsync('library', patronsLibrary['libraryId']);
               await AsyncStorage.setItem('@libraryId', patronsLibrary['libraryId']);
               await SecureStore.setItemAsync('libraryName', patronsLibrary['name']);
               await SecureStore.setItemAsync('locationId', patronsLibrary['locationId']);
               await AsyncStorage.setItem('@locationId', patronsLibrary['locationId']);
               await SecureStore.setItemAsync('solrScope', patronsLibrary['solrScope']);

               await AsyncStorage.setItem('@solrScope', patronsLibrary['solrScope']);
               await AsyncStorage.setItem('@pathUrl', patronsLibrary['baseUrl']);
               selectedLocationId = patronsLibrary['locationId'];
               selectedBaseUrl = patronsLibrary['baseUrl'];
          }

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
