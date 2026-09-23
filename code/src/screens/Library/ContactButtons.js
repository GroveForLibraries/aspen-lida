import { ThemedMaterialIcons as MaterialIcons } from '@/src/components/themed/ThemedMaterialIcons';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { useColorModeValue, useTheme } from '../../themes/theme';
import React from 'react';
import { showLocation } from 'react-native-map-link';
import { popToast } from '../../components/feedback';
import { Box } from '@/components/ui/box';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { logDebugMessage, logErrorMessage } from '../../util/logging';
import { useActiveLanguage } from '../../hooks/useLanguageData';

/**
 * ContactButtons component that renders a set of buttons for contacting a library, including options to call, email, get directions, and visit the website. The buttons are displayed based on the availability of the corresponding contact information in the provided data.
 * @param data
 * @returns {React.JSX.Element|null}
 * @constructor
 */
const ContactButtons = (data) => {
     const location = data.data;
     const language = useActiveLanguage();
     const { neutralPairs, textColor } = useTheme();

     const backgroundColor = useColorModeValue(neutralPairs.surface.light, neutralPairs.surface.dark);
     const iconBorderColor = useColorModeValue(neutralPairs.icon.light, neutralPairs.surface.light);

     const callLibrary = () => {
          /* location.phone */
          const phoneNumber = `tel:${location.phone}`;
          Linking.openURL(phoneNumber);
     };

     const emailLibrary = () => {
          /* location.email */
          const emailAddress = `mailto:${location.email}`;
          Linking.openURL(emailAddress);
     };

     const visitWebsite = async () => {
          /* location.homeLink */

          const browserParams = {
               enableDefaultShareMenuItem: false,
               presentationStyle: 'automatic',
               showTitle: false,
               toolbarColor: backgroundColor,
               controlsColor: textColor,
               secondaryToolbarColor: backgroundColor };

          if (location.homeLink === '/') {
               await WebBrowser.openBrowserAsync(location.baseUrl, browserParams)
                    .then((res) => {
                         logDebugMessage(res);
                         if (res.type === 'cancel' || res.type === 'dismiss') {
                              logDebugMessage('User closed or dismissed window.');
                              WebBrowser.dismissBrowser();
                              WebBrowser.coolDownAsync();
                         }
                    })
                    .catch(async (err) => {
                         if (err.message === 'Another WebBrowser is already being presented.') {
                              try {
                                   WebBrowser.dismissBrowser();
                                   WebBrowser.coolDownAsync();
                                   await WebBrowser.openBrowserAsync(location.baseUrl, browserParams)
                                        .then((response) => {
                                             logDebugMessage(response);
                                             if (response.type === 'cancel') {
                                                  logDebugMessage('User closed window.');
                                             }
                                        })
                                        .catch(async (error) => {
                                             logDebugMessage('Unable to close previous browser session.');
                                        });
                              } catch (error) {
                                   logDebugMessage('Really borked.');
                                   logErrorMessage(error);
                              }
                         } else {
                              popToast(getTermFromDictionary('en', 'error_no_open_resource'), getTermFromDictionary('en', 'error_device_block_browser'), 'error');
                              logErrorMessage(err);
                         }
                    });
          } else {
               await WebBrowser.openBrowserAsync(location.homeLink, browserParams)
                    .then((res) => {
                         logDebugMessage(res);
                         if (res.type === 'cancel' || res.type === 'dismiss') {
                              logDebugMessage('User closed or dismissed window.');
                              WebBrowser.dismissBrowser();
                              WebBrowser.coolDownAsync();
                         }
                    })
                    .catch(async (err) => {
                         if (err.message === 'Another WebBrowser is already being presented.') {
                              try {
                                   WebBrowser.dismissBrowser();
                                   WebBrowser.coolDownAsync();
                                   await WebBrowser.openBrowserAsync(location.homeLink, browserParams)
                                        .then((response) => {
                                             logDebugMessage(response);
                                             if (response.type === 'cancel') {
                                                  logDebugMessage('User closed window.');
                                             }
                                        })
                                        .catch(async (error) => {
                                             logDebugMessage('Unable to close previous browser session.');
                                        });
                              } catch (error) {
                                   logDebugMessage('Really borked.');
                                   logErrorMessage(error);
                              }
                         } else {
                              popToast(getTermFromDictionary('en', 'error_no_open_resource'), getTermFromDictionary('en', 'error_device_block_browser'), 'error');
                              logErrorMessage(err);
                         }
                    });
          }
     };

     const getDirections = async () => {
          /* location.latitude & location.longitude */
          const sourceLatitude = await SecureStore.getItemAsync('latitude');
          const sourceLongitude = await SecureStore.getItemAsync('longitude');
          if (sourceLatitude && sourceLongitude && sourceLatitude !== '0' && sourceLongitude !== '0') {
               showLocation({
                    latitude: location.latitude,
                    longitude: location.longitude,
                    sourceLatitude,
                    sourceLongitude,
                    googleForceLatLon: true });
          } else {
               showLocation({
                    latitude: location.latitude,
                    longitude: location.longitude,
                    googleForceLatLon: true });
          }
     };

     if (location.phone || location.email || location.homeLink || location.latitude !== 0) {
          return (
               <Box className="mb-4">
                    <ButtonGroup size="sm" className="flex-wrap flex-row justify-between">
                         {location.phone ? (
                              <Button
                                   variant="outline"
                                   style={{
                                        width: '23%',
                                        borderColor: iconBorderColor,
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        paddingVertical: 10,
                                        paddingHorizontal: 2,
                                        height: 'auto',
                                   }}
                                   onPress={() => callLibrary()}>
                                   <Center>
                                        <MaterialIcons name="call" size={18} />
                                   </Center>
                                   <ButtonText style={{ color: textColor, textAlign: 'center', fontSize: 10 }}>{getTermFromDictionary(language, 'call_the_library')}</ButtonText>
                              </Button>
                         ) : null}
                         {location.email ? (
                              <Button
                                   variant="outline"
                                   style={{
                                        width: '23%',
                                        borderColor: iconBorderColor,
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        paddingVertical: 10,
                                        paddingHorizontal: 2,
                                        height: 'auto',
                                   }}
                                   onPress={() => emailLibrary()}>
                                   <Center>
                                        <MaterialIcons name="email" size={18} />
                                   </Center>
                                   <ButtonText style={{ color: textColor, textAlign: 'center', fontSize: 10 }}>{getTermFromDictionary(language, 'email_a_librarian')}</ButtonText>
                              </Button>
                         ) : null}
                         {location.latitude !== 0 ? (
                              <Button
                                   variant="outline"
                                   style={{
                                        width: '23%',
                                        borderColor: iconBorderColor,
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        paddingVertical: 10,
                                        paddingHorizontal: 2,
                                        height: 'auto',
                                   }}
                                   onPress={() => getDirections()}>
                                   <Center>
                                        <MaterialIcons name="map" size={18} />
                                   </Center>
                                   <ButtonText style={{ color: textColor, textAlign: 'center', fontSize: 10 }}>{getTermFromDictionary(language, 'get_directions')}</ButtonText>
                              </Button>
                         ) : null}
                         {location.homeLink ? (
                              <Button
                                   variant="outline"
                                   style={{
                                        width: '23%',
                                        borderColor: iconBorderColor,
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        paddingVertical: 10,
                                        paddingHorizontal: 2,
                                        height: 'auto',
                                   }}
                                   onPress={() => visitWebsite()}>
                                   <Center>
                                        <MaterialIcons name="home" size={18} />
                                   </Center>
                                   <ButtonText style={{ color: textColor, textAlign: 'center', fontSize: 10 }}>{getTermFromDictionary(language, 'visit_our_website')}</ButtonText>
                              </Button>
                         ) : null}
                    </ButtonGroup>
               </Box>
          );
     }

     return null;
};

export default ContactButtons;
