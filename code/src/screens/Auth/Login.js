import { ThemedMaterialIcons as MaterialIcons } from '@/src/components/themed/ThemedMaterialIcons';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import _ from 'lodash';
import React from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { navigate } from '../../helpers/RootNavigator';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { getLibraryInfo } from '../../util/api/system';
import { saveLibrary, saveLibraryUrl } from '../../util/db';
import { GLOBALS } from '../../util/globals';
import { fetchAllLibrariesFromGreenhouse, fetchNearbyLibrariesFromGreenhouse } from '../../util/api/greenhouse';
import { LIBRARY } from '../../util/globals';
import { ForgotBarcode } from './ForgotBarcode';
import { GetLoginForm } from './LoginForm';
import { ResetPassword } from './ResetPassword';
import { SelectYourLibrary } from './SelectYourLibrary';
import { SplashScreen } from './Splash';
import { useTheme, TOKENS } from '../../themes/theme';
import { APIErrorLog } from '../MyAccount/Settings/Logs/APIErrorLog';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { logDebugMessage, logInfoMessage, getErrorMessage } from '../../util/logging';
import { popAlert } from '../../components/feedback';
import { Box } from '@/components/ui/box';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { Image } from 'expo-image';
import { ThemedModal as Modal, ThemedModalBackdrop as ModalBackdrop, ThemedModalBody as ModalBody, ThemedModalContent as ModalContent, ThemedModalFooter as ModalFooter, ThemedModalHeader as ModalHeader } from '@/src/components/themed/ThemedModal';
import { Pressable } from '@/components/ui/pressable';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';

/**
 * LoginScreen component that handles the login process, including library selection, user authentication, and displaying relevant modals for forgotten credentials or API error logs.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const LoginScreen = () => {
     const [isLoading, setIsLoading] = React.useState(true);
     const [isThemeInitialized, setIsThemeInitialized] = React.useState(false);
     const insets = useSafeAreaInsets();
     const route = useRoute();
     const [permissionRequested, setPermissionRequested] = React.useState(false);
     const [shouldRequestPermissions, setShouldRequestPermissions] = React.useState(false);
     const [permissionStatus, setPermissionStatus] = React.useState(null);
     const [selectedLibrary, setSelectedLibrary] = React.useState(null);
     const [libraries, setLibraries] = React.useState([]);
     const [allLibraries, setAllLibraries] = React.useState([]);
     const [shouldShowSelectLibrary, setShowShouldSelectLibrary] = React.useState(true);
     const [usernameLabel, setUsernameLabel] = React.useState('Library Barcode');
     const [passwordLabel, setPasswordLabel] = React.useState('Password/PIN');
     const [showModal, setShowModal] = React.useState(false);
     const [query, setQuery] = React.useState('');
     const [allowBarcodeScanner, setAllowBarcodeScanner] = React.useState(false);
     const [allowCode39, setAllowCode39] = React.useState(false);
     const [enableForgotPasswordLink, setEnableForgotPasswordLink] = React.useState(false);
     const [enableForgotBarcode, setEnableForgotBarcode] = React.useState(false);
     const [forgotPasswordType, setForgotPasswordType] = React.useState(false);
     const [showForgotPasswordModal, setShowForgotPasswordModal] = React.useState(false);
     const [showForgotBarcodeModal, setShowForgotBarcodeModal] = React.useState(false);
     const [ils, setIls] = React.useState('koha');
     const [enableSelfRegistration, setEnableSelfRegistration] = React.useState(false);
     const [selfRegistrationURL, setSelfRegistrationURL] = React.useState("");
     const [showApiErrorButton, setShowApiErrorButton] = React.useState(false);
     const [showApiErrorModal, setShowApiErrorModal] = React.useState(false);
     const logoTapCountRef = React.useRef(0);
     const logoTapTimerRef = React.useRef(null);
     const { neutralPairs, brand, colorMode, textColor } = useTheme();
     const surfaceBg =
          colorMode === 'light'
               ? neutralPairs?.surface?.light ?? TOKENS.semanticTokens.light.surface
               : neutralPairs?.surface?.dark ?? TOKENS.semanticTokens.dark.surface;

     let isCommunity = true;
     if (!GLOBALS.slug.startsWith('aspen-lida') || GLOBALS.slug === 'aspen-lida-bws') {
          isCommunity = false;
     }

     const logoImage = Constants.expoConfig.extra.loginLogo;

      const handleThemeInitialized = React.useCallback(() => {
           setIsThemeInitialized((prev) => (prev ? prev : true));
      }, []);

      // TODO(translation): Move these hardcoded alert strings to TranslationService/getTermFromDictionary keys.
      // Show migration error message if session expired due to SQLite migration failure
      React.useEffect(() => {
           if (route.params?.migrationError) {
                popAlert('Session expired', 'Your session expired, please log in again.', 'error');
                logDebugMessage('Migration error detected, showing toast to user');
           }
      }, [route.params?.migrationError]);

      useFocusEffect(
           React.useCallback(() => {
                const bootstrapAsync = async () => {
                    await getPermissions('statusCheck').then(async (result) => {
                         if (result.success === false && result.status === 'undetermined' && GLOBALS.releaseChannel !== 'DEV' && Platform.OS === 'android') {
                              setShouldRequestPermissions(true);
                              setPermissionStatus(result.status);
                         }

                         if (result.status !== 'granted' && Platform.OS === 'ios') {
                              setPermissionRequested(true);
                              setPermissionStatus(result.status);
                              await getPermissions('request');
                         }
                    });

                    await fetchNearbyLibrariesFromGreenhouse().then((result) => {
                         if (result.success) {
                              setLibraries(result.libraries);
                              if (!result.shouldShowSelectLibrary) {
                                   setShowShouldSelectLibrary(result.shouldShowSelectLibrary);
                                   logInfoMessage('Automatically selecting library ' + result.libraries[0].displayName + ' based on geolocation');
                                   updateSelectedLibrary(result.libraries[0]);
                              }else{
                                   logInfoMessage('Found ' + result.libraries.length + ' libraries');
                                   setShowShouldSelectLibrary(true);
                              }
                         }
                    });
                     if (isCommunity) {
                          await fetchAllLibrariesFromGreenhouse().then((response) => {
                               if(response.success) {
                                    const libraries = _.sortBy(response.libraries ?? [], ['name', 'librarySystem']);
                                    setAllLibraries(libraries);
                               } else {
                                    setAllLibraries([]);
                                    logDebugMessage("Error loading libraries from Greenhouse");
                                    logDebugMessage(response);
                                    getErrorMessage(response.code ?? 0, response.problem)
                               }
                          });
                     }

                     setIsLoading(false);
                };
                bootstrapAsync();
          }, [isCommunity])
      );

     const onLogoTap = () => {
          const TAP_WINDOW_MS = 1500; // 5 taps must happen within this window

          logoTapCountRef.current += 1;

          if (logoTapTimerRef.current) {
               clearTimeout(logoTapTimerRef.current);
          }

          logoTapTimerRef.current = setTimeout(() => {
               logoTapCountRef.current = 0;
          }, TAP_WINDOW_MS);

          if (logoTapCountRef.current >= 5) {
               setShowApiErrorButton(true);
               logoTapCountRef.current = 0;
               clearTimeout(logoTapTimerRef.current);
               logoTapTimerRef.current = null;
          }
     };

     React.useEffect(() => {
          return () => {
               if (logoTapTimerRef.current) {
                    clearTimeout(logoTapTimerRef.current);
               }
          };
     }, []);

      const updateSelectedLibrary = async (data) => {
           if (data) {
                logDebugMessage('Selected new library on Login screen: ' + data.displayName + ' (' + data.libraryId + ')');
           }else{
                logDebugMessage("No data passed to updateSelectedLibrary");
           }
           setSelectedLibrary(data);
           LIBRARY.url = data.baseUrl; // Keep for backwards compatibility until all code migrated
           await saveLibraryUrl(data.baseUrl); // Save to SQLite
           await getLibraryInfo(data.baseUrl, data.libraryId).then(async (result) => {
                if (_.isObject(result)) {
                     const library = result.data.result?.library ?? [];
                     logDebugMessage("Saving library to SQLite on Login screen: " + library.displayName + ' (' + library.libraryId + ')');
                     await saveLibrary(library);
                     logInfoMessage('Base Url is now: ' + library.baseUrl + ', library is: ' + library.libraryId);
                    if (library.barcodeStyle) {
                         setAllowBarcodeScanner(true);
                         if (library.barcodeStyle === 'CODE39') {
                              setAllowCode39(true);
                         }
                         logInfoMessage("Enabling barcode scanner at login with style " + library.barcodeStyle);
                    } else {
                         logInfoMessage('Barcode scanning at login is not enabled since no barcode style is set in library system settings');
                         setAllowBarcodeScanner(false);
                    }

                    if (library.usernameLabel) {
                         logDebugMessage('Setting username label to ' + library.usernameLabel);
                         setUsernameLabel(library.usernameLabel);
                    }

                    if (library.passwordLabel) {
                         logDebugMessage('Setting password label to ' + library.passwordLabel);
                         setPasswordLabel(library.passwordLabel);
                    }

                    if (library.enableForgotPasswordLink) {
                         logInfoMessage('Forgot password enabled');
                         setEnableForgotPasswordLink(library.enableForgotPasswordLink);
                    }

                    if (library.enableForgotBarcode) {
                         logInfoMessage('Forgot barcode enabled');
                         setEnableForgotBarcode(library.enableForgotBarcode);
                    }

                    if (library.forgotPasswordType) {
                         logInfoMessage('Forgot password type set to ' + library.forgotPasswordType);
                         setForgotPasswordType(library.forgotPasswordType);
                    }

                    if (library.ils) {
                         logInfoMessage('Setting ILS to ' + library.ils);
                         setIls(library.ils);
                    }

                    if (library.catalogRegistrationCapabilities) {
                         if(String(library.catalogRegistrationCapabilities.enableSelfRegistration) === '1' && String(library.catalogRegistrationCapabilities.enableSelfRegistrationInApp) === '1') {
                              logInfoMessage('Enabling self registration');
                              setEnableSelfRegistration(1);
                         } else {
                              setEnableSelfRegistration(0);
                         }
                         //even if the url isn't set this will just be an empty string
                         setSelfRegistrationURL(library.catalogRegistrationCapabilities.selfRegistrationUrl);
                    }
               }
          });
          setShowModal(false);
     };

     const openSelfRegistration = () => {
          if(selfRegistrationURL)
          {
               WebBrowser.openBrowserAsync(selfRegistrationURL);
          }
          else
          {
               navigate('SelfRegistration', { libraryUrl: LIBRARY.url });
          }
     };

     const loginScreenContent = (
          <SafeAreaView style={{ flex: 1 }}>
               <Box className="px-5 flex-1 items-center justify-center">
                    <Pressable onPress={onLogoTap}>
                         <Image source={logoImage} style={{ width: 96, height: 96, borderRadius: 24 }} alt="" />
                    </Pressable>
                    {isCommunity || shouldShowSelectLibrary ? <SelectYourLibrary updateSelectedLibrary={updateSelectedLibrary} selectedLibrary={selectedLibrary} query={query} setQuery={setQuery} showModal={showModal} setShowModal={setShowModal} isCommunity={isCommunity} setShouldRequestPermissions={setShouldRequestPermissions} shouldRequestPermissions={shouldRequestPermissions} permissionRequested={permissionRequested} libraries={libraries} allLibraries={allLibraries} /> : null}
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} className="w-full">
                         {selectedLibrary ? <GetLoginForm selectedLibrary={selectedLibrary} usernameLabel={usernameLabel} passwordLabel={passwordLabel} allowBarcodeScanner={allowBarcodeScanner} allowCode39={allowCode39} updateSelectedLibrary={updateSelectedLibrary} /> : null}
                         <ButtonGroup space="sm" className="justify-center pt-5 flex-wrap">
                              {enableForgotPasswordLink === '1' || enableForgotPasswordLink === 1 ? <ResetPassword ils={ils} enableForgotPasswordLink={enableForgotPasswordLink} usernameLabel={usernameLabel} passwordLabel={passwordLabel} forgotPasswordType={forgotPasswordType} showForgotPasswordModal={showForgotPasswordModal} setShowForgotPasswordModal={setShowForgotPasswordModal} /> : null}
                              {enableForgotBarcode === '1' || enableForgotBarcode === 1 ? <ForgotBarcode usernameLabel={usernameLabel} showForgotBarcodeModal={showForgotBarcodeModal} setShowForgotBarcodeModal={setShowForgotBarcodeModal} /> : null}
                         </ButtonGroup>
                         {enableSelfRegistration ? (
                              <Button colorScheme="primary" className="mt-3" variant="link" onPress={openSelfRegistration}>
                                  <ButtonText>{getTermFromDictionary('en', 'register_for_a_library_card')}</ButtonText>
                              </Button>
                         ) : null}
                         {isCommunity && Platform.OS !== 'android' ? (
                              <Button colorScheme="tertiary" className="mt-5" size="xs" variant="link">
                                   <MaterialIcons name="near-me" size={18} color={brand.tertiary[500]} className="mr-1" />
                                   <ButtonText>{getTermFromDictionary('en', 'reset_geolocation')}</ButtonText>
                              </Button>
                         ) : null}
                         <Center>
                              <Text size="xs" className="mt-5">
                                   {GLOBALS.appVersion} {GLOBALS.appStage} b[{GLOBALS.appBuild}] p[{GLOBALS.appPatch}] c[{GLOBALS.releaseChannel ?? 'Development'}]
                              </Text>
                              {showApiErrorButton ? (
                                   // TODO(translation): Replace hardcoded label with TranslationService-backed key.
                                   <Button className="mt-4" size="xs" variant="outline" onPress={() => setShowApiErrorModal(true)}>
                                        <ButtonText>Open API Error Log</ButtonText>
                                   </Button>
                              ) : null}
                         </Center>
                    </KeyboardAvoidingView>
                    <Modal isOpen={showApiErrorModal} onClose={() => setShowApiErrorModal(false)}>
                         <ModalBackdrop />
                         <ModalContent className="rounded-xl" style={{ maxHeight: '75%', width: '95%', alignSelf: 'center', backgroundColor: surfaceBg }}>
                              <ModalHeader></ModalHeader>
                              <ModalBody className="px-4">
                                   <APIErrorLog neutralPairs={neutralPairs} colorMode={colorMode} textColor={textColor} />
                              </ModalBody>
                              <ModalFooter className="pt-2 px-4" style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
                                   // TODO(translation): Replace hardcoded label with TranslationService-backed key.
                                   <Button variant="outline" onPress={() => setShowApiErrorModal(false)}>
                                        <ButtonText>Close</ButtonText>
                                   </Button>
                              </ModalFooter>
                         </ModalContent>
                    </Modal>
               </Box>
          </SafeAreaView>
     );

     if (isLoading || !isThemeInitialized) {
          return <SplashScreen shouldInitializeTheme={true} onThemeInitialized={handleThemeInitialized} />;
     }

     logDebugMessage("Loading Login page colorMode = " + colorMode );
     return loginScreenContent;
};

async function getPermissions(kind = 'statusCheck') {
     if (kind === 'statusCheck') {
          const { status } = await Location.getForegroundPermissionsAsync();
          if (status !== 'granted') {
               await SecureStore.setItemAsync('latitude', '0');
               await SecureStore.setItemAsync('longitude', '0');
               return {
                    success: false,
                    status: status };
          }
     } else {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
               await SecureStore.setItemAsync('latitude', '0');
               await SecureStore.setItemAsync('longitude', '0');
               return {
                    success: false,
                    status: status };
          }

          let location = await Location.getLastKnownPositionAsync({});

          if (location != null) {
               const latitude = JSON.stringify(location.coords.latitude);
               const longitude = JSON.stringify(location.coords.longitude);
               await SecureStore.setItemAsync('latitude', latitude);
               await SecureStore.setItemAsync('longitude', longitude);
          } else {
               await SecureStore.setItemAsync('latitude', '0');
               await SecureStore.setItemAsync('longitude', '0');
          }
          return {
               success: true,
               status: 'granted' };
     }

     return {
          success: false };
}
