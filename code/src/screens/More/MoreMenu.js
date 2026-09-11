import { ThemedMaterialIcons as MaterialIcons } from '@/src/components/themed/ThemedMaterialIcons';
import * as WebBrowser from 'expo-web-browser';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import _ from 'lodash';
import moment from 'moment';
import React from 'react';
import { popToast } from '../../components/feedback';
import { AuthContext } from '../../context/AuthContext';
import { useLibraryLocation, useAvailableLocations } from '../../hooks/useLibraryBranchData';
import { useAppSettings, useLibrary, useLibraryMenu, useUpdateMenu } from '../../hooks/useLibrarySystemData';
import { navigate } from '../../helpers/RootNavigator';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { deleteAspenUser } from '../../util/api/user';
import { getLibraryLinks } from '../../util/api/system';
import { GLOBALS } from '../../util/globals';
import { logDebugMessage, logErrorMessage, logInfoMessage } from '../../util/logging';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { useTheme } from '../../themes/theme';
import { ThemedAccordion as Accordion, ThemedAccordionContent as AccordionContent, ThemedAccordionHeader as AccordionHeader, ThemedAccordionItem as AccordionItem, ThemedAccordionTrigger as AccordionTrigger } from '@/src/components/themed/ThemedAccordion';
import { Box } from '@/components/ui/box';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { ThemedDivider as Divider } from '@/src/components/themed/ThemedDivider';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { HStack } from '@/components/ui/hstack';
import { ThemedModal as Modal, ThemedModalBackdrop as ModalBackdrop, ThemedModalBody as ModalBody, ThemedModalCloseButton as ModalCloseButton, ThemedModalContent as ModalContent, ThemedModalFooter as ModalFooter, ThemedModalHeader as ModalHeader } from '@/src/components/themed/ThemedModal';
import { Pressable } from '@/components/ui/pressable';
import { ThemedScrollView as ScrollView } from '@/src/components/themed/ThemedScrollView';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { VStack } from '@/components/ui/vstack';
import { ThemedCloseIcon as CloseIcon } from '../../components/themed/ThemedFormControls';
import { screenContentContainerStyle } from '@/src/components/ScreenContainer';

/**
 * MoreMenu component that displays a scrollable menu with library information, settings, and additional links. It fetches library menu links from the API and allows users to delete their account if self-registration is enabled. The component also handles modals for delete confirmation and results.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const MoreMenu = () => {
     const language = useActiveLanguage();
     const library = useLibrary();
     const menu = useLibraryMenu();
     const updateMenu = useUpdateMenu();
     const { brand, textColor, neutrals } = useTheme();

     const { signOut } = React.useContext(AuthContext);
     const hasMenuItems = _.size(menu);
     const navigation = useNavigation();
     const [showDeleteConfirmationModal, setShowDeleteConfirmationModal] = React.useState(false);
     const [showDeleteResultsModal, setShowDeleteResultsModal] = React.useState(false);
     const [deleteResults, setDeleteResults] = React.useState('');
     const [deleting, setDeleting] = React.useState(false);

     useFocusEffect(
          React.useCallback(() => {
               if (!library.baseUrl) return;
               let cancelled = false;

               (async () => {
                    try {
                         const data = await getLibraryLinks(library.baseUrl);
                         if (cancelled) return;
                         if (data?.ok) {
                              const links = data.data.result?.items ?? [];
                              await updateMenu(links);
                              logDebugMessage('MoreMenu: refreshed library menu links');
                         } else {
                              logDebugMessage('MoreMenu: library menu refresh returned non-ok response');
                         }
                    } catch (error) {
                         if (!cancelled) {
                              logErrorMessage('MoreMenu: failed to refresh library menu links');
                              logErrorMessage(error);
                         }
                    }
               })();

               return () => {
                    cancelled = true;
               };
          }, [library.baseUrl, updateMenu])
     );

     React.useLayoutEffect(() => {
          navigation.setOptions({
               headerLeft: null });
     }, [navigation]);

     const initiateDeleteAspenUser = async () => {
          setDeleting(true);
          await deleteAspenUser(library.baseUrl).then((results) => {
               setDeleteResults(results);
          })

     }

     const toggleDeleteConfirmationModal = () => {
          setShowDeleteConfirmationModal(!showDeleteConfirmationModal);
     };

     const toggleDeleteResultsModal = () => {
          setShowDeleteResultsModal(!showDeleteResultsModal);
     };

     return (
          <ScrollView safeArea>
               <Box className="px-2">
                    <VStack space="md" className="my-2 mx-1">
                         <MyLibrary />
                         <Divider />

                         <VStack space="md">
                              {hasMenuItems > 0 ? Object.keys(menu).map((item) => <MenuLink key={item} links={menu[item]} />) : null}
                              {hasMenuItems > 0 ? <Divider /> : null}
                              <VStack space="md">
                                   <ViewAllLocations />
                                   <Settings />
                                   <PrivacyPolicy />
                                   {library.catalogRegistrationCapabilities?.enableSelfRegistration === '1' && library.catalogRegistrationCapabilities.enableSelfRegistrationInApp === '1' ? (
                                        <Pressable className="px-2 py-3" onPress={toggleDeleteConfirmationModal}>
                                             <HStack space="sm" className="items-center">
                                                  <MaterialIcons name="chevron-right" size={20} color={neutrals.actionableIndicator} />
                                                  <Text className="font-medium">
                                                       {getTermFromDictionary(language, 'delete_account')}
                                                  </Text>
                                             </HStack>
                                        </Pressable>
                                   ) : null}
                              </VStack>
                         </VStack>
                    </VStack>
                    <Modal isOpen={showDeleteConfirmationModal} onClose={toggleDeleteConfirmationModal}>
                         <ModalBackdrop />
                         <ModalContent>
                              <ModalHeader>
                                   <Heading>
                                        {getTermFromDictionary(language, 'delete_account')}
                                   </Heading>
                                   <ModalCloseButton onPress={toggleDeleteConfirmationModal}>
                                        <CloseIcon />
                                   </ModalCloseButton>
                              </ModalHeader>
                              <ModalBody>
                                   <Text>{getTermFromDictionary(language, 'confirm_delete_account_message')}</Text>
                              </ModalBody>
                              <ModalFooter>
                                   <ButtonGroup>
                                        <Button colorScheme="primary" variant="outline" onPress={toggleDeleteConfirmationModal}>
                                             <ButtonText>{getTermFromDictionary(language, 'cancel')}</ButtonText>
                                        </Button>
                                        <Button
                                             colorScheme="primary"
                                             isLoading={deleting}
                                             isLoadingText={getTermFromDictionary(language, 'deleting', true)}
                                             onPress={async () => {
                                                  await initiateDeleteAspenUser().then(() => {
                                                       setShowDeleteConfirmationModal(false);
                                                       setShowDeleteResultsModal(true);
                                                  });
                                             }}>
                                            <ButtonText>{getTermFromDictionary(language, 'confirm_delete_account')}</ButtonText>
                                        </Button>
                                   </ButtonGroup>
                              </ModalFooter>
                         </ModalContent>
                    </Modal>
                    <Modal isOpen={showDeleteResultsModal}>
                         <ModalBackdrop />
                         <ModalContent>
                              <ModalHeader>
                                   <Heading>
                                        {getTermFromDictionary(language, 'delete_account')}
                                   </Heading>
                                   <ModalCloseButton onPress={signOut}>
                                        <CloseIcon />
                                   </ModalCloseButton>
                              </ModalHeader>
                              <ModalBody>{deleteResults?.message ? <Text>{deleteResults.message}</Text> : <Text>{getTermFromDictionary(language, 'error_deleting_account')}</Text>}</ModalBody>
                              <ModalFooter>
                                   {deleteResults.success === true ? (
                                       <Button colorScheme="primary" onPress={signOut}>
                                            <ButtonText>{getTermFromDictionary(language, 'button_ok')}</ButtonText>
                                        </Button>
                                   ) : (
                                       <Button colorScheme="primary" variant="primary" onPress={toggleDeleteResultsModal}>
                                            <ButtonText>{getTermFromDictionary(language, 'button_ok')}</ButtonText>
                                        </Button>
                                   )}
                              </ModalFooter>
                         </ModalContent>
                    </Modal>
               </Box>
          </ScrollView>
     );
};

/**
 * MyLibrary component that displays the user's library information, including the library name, location, and hours of operation. It uses hooks to fetch library data and theme information.
 * @returns {React.JSX.Element}
 * @constructor
 */
const MyLibrary = () => {
     const library = useLibrary();
     const location = useLibraryLocation();
     const language = useActiveLanguage();

     const { brand } = useTheme();

     let hoursLabel = '';
     if (location?.hours) {
          const day = moment().day();
          if (_.find(location.hours, _.matchesProperty('day', day))) {
               let todaysHours = _.filter(location.hours, { day: day });
               if (todaysHours[0]) {
                    todaysHours = todaysHours[0];
                    if (todaysHours.isClosed) {
                         hoursLabel = getTermFromDictionary(language, 'location_closed');
                    } else {
                         const closingText = todaysHours.close;
                         const time1 = closingText.split(':');
                         const openingText = todaysHours.open;
                         const time2 = openingText.split(':');
                         const closeTime = moment().set({ hour: time1[0], minute: time1[1] });
                         const openTime = moment().set({ hour: time2[0], minute: time2[1] });
                         const nowTime = moment();
                         const stillOpen = moment(nowTime).isBefore(closeTime);
                         const stillClosed = moment(openTime).isBefore(nowTime);
                         if (!stillOpen) {
                              hoursLabel = getTermFromDictionary(language, 'location_closed');
                         }
                         if (!stillClosed) {
                              let openingTime = moment(openTime).format('h:mm A');
                              hoursLabel = 'Closed until ' + openingTime;
                         } else {
                              let closingTime = moment(closeTime).format('h:mm A');
                              hoursLabel = 'Open until ' + closingTime;
                         }
                    }
               }
          }
     }

     return (
          <Box style={{ backgroundColor: brand.primary[500], borderRadius: 16 }} className="m-2 p-6">
               <Pressable className="flex-row items-center justify-between" onPress={() => navigate('MyLibrary')}>
                    <VStack>
                        <Text bold size="md" style={{ color: brand.primary['500-text'] }}>
                              {library.displayName}
                         </Text>
                         {library.displayName !== location?.displayName ? (
                             <Text bold style={{ color: brand.primary['500-text'] }}>
                                   {location?.displayName}
                              </Text>
                         ) : null}
                        {hoursLabel ? <Text style={{ color: brand.primary['500-text'] }}>{hoursLabel}</Text> : null}
                    </VStack>
                    <MaterialIcons name="chevron-right" size={20} color={brand.primary['500-text']} />
               </Pressable>
          </Box>
     );
};

/**
 *  ViewAllLocations component that displays a button to view all available library locations if there are multiple locations. It uses hooks to fetch available locations and theme information.
 * @returns {React.JSX.Element|null}
 * @constructor
 */
const ViewAllLocations = () => {
     const language = useActiveLanguage();
     const locations = useAvailableLocations();
     const { textColor, neutrals } = useTheme();

     if (_.size(locations) > 1) {
          return (
               <Pressable className="py-3" onPress={() => navigate('AllLocations')}>
                    <HStack space="sm" className="items-center">
                         <MaterialIcons name="chevron-right" size={20} color={neutrals.actionableIndicator} />
                         <Text className="font-medium">{getTermFromDictionary(language, 'view_all_locations')}</Text>
                    </HStack>
               </Pressable>
          );
     }

     return null;
};

/**
 * Settings component that displays a button to navigate to the user's preferences/settings page. It uses hooks to fetch the active language and theme information.
 * @returns {React.JSX.Element}
 * @constructor
 */
const Settings = () => {
     const language = useActiveLanguage();
     const { textColor, neutrals } = useTheme();

     return (
          <Pressable className="py-3" onPress={() => navigate('MyPreferences')}>
               <HStack space="sm" className="items-center">
                    <MaterialIcons name="chevron-right" size={20} color={neutrals.actionableIndicator} />
                    <Text className="font-medium">{getTermFromDictionary(language, 'preferences')}</Text>
               </HStack>
          </Pressable>
     );
};

/**
 * PrivacyPolicy component that displays a button to open the library's privacy policy in a web browser. It uses hooks to fetch the active language, app settings, and theme information. The component handles opening the URL in a web browser and manages potential errors.
 * @returns {React.JSX.Element}
 * @constructor
 */
const PrivacyPolicy = () => {
     const language = useActiveLanguage();
     const appSettings = useAppSettings();

     const { textColor, neutrals } = useTheme();
     const backgroundColor = neutrals.surface;

     const browserParams = {
          enableDefaultShareMenuItem: false,
          presentationStyle: 'automatic',
          showTitle: false,
          toolbarColor: backgroundColor,
          controlsColor: textColor,
          secondaryToolbarColor: backgroundColor };

     const openURL = async () => {
          const url = appendQuery(appSettings.settings.privacyPolicy ?? GLOBALS.privacyPolicy, 'minimalInterface=true');
          logInfoMessage(url);
          await WebBrowser.openBrowserAsync(url, browserParams)
               .then((res) => {
                    logDebugMessage(res);
                    if (res.type === 'cancel' || res.type === 'dismiss') {
                         logDebugMessage('User closed window.');
                         WebBrowser.dismissBrowser();
                         WebBrowser.coolDownAsync();
                    }
               })
               .catch(async (err) => {
                    if (err.message === 'Another WebBrowser is already being presented.') {
                         try {
                              WebBrowser.dismissBrowser();
                              WebBrowser.coolDownAsync();
                              await WebBrowser.openBrowserAsync(url, browserParams)
                                   .then((response) => {
                                        logDebugMessage(response);
                                        if (response.type === 'cancel') {
                                             logDebugMessage('User closed window.');
                                        }
                                   })
                                   .catch(async (error) => {
                                        logDebugMessage('Unable to close previous browser session.');
                                        logErrorMessage(error);
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
     };

     return (
          <Pressable className="py-3" onPress={() => openURL()}>
               <HStack space="sm" className="items-center">
                    <MaterialIcons name="chevron-right" size={20} color={neutrals.actionableIndicator} />
                    <Text className="font-medium">{getTermFromDictionary(language, 'privacy_policy')}</Text>
               </HStack>
          </Pressable>
     );
};

/**
 * MenuLink component that displays a menu link with optional sub-links. It uses hooks to fetch library data and theme information. The component handles opening the URL in a web browser and manages potential errors. If there are multiple links under the same category, it displays them in an accordion-style list.
 * @param payload
 * @returns {React.JSX.Element}
 * @constructor
 */
const MenuLink = (payload) => {
     const library = useLibrary();
     const categories = payload.links;
     let hasMultiple = false;
     if (_.size(categories) > 1) {
          hasMultiple = true;
     }
     let categoryLabel = _.sample(categories);
     categoryLabel = categoryLabel.category;

     const { textColor, neutralPairs, neutrals } = useTheme();
     const backgroundColor = neutrals.surface;

     const [expanded, setExpanded] = React.useState(false);

     function isValidHttpUrl(str) {
         return str.startsWith('http://') || str.startsWith('https://');
     }

     const openURL = async (url) => {
          const browserParams = {
               enableDefaultShareMenuItem: false,
               presentationStyle: 'automatic',
               showTitle: false,
               toolbarColor: backgroundColor,
               controlsColor: textColor,
               secondaryToolbarColor: backgroundColor };

          let formattedUrl = url;
          if (!isValidHttpUrl(url)) {
               /* Assume the URL is a relative one to Aspen Discovery */
               logDebugMessage('URL not valid!');
               formattedUrl = _.trimEnd(library.baseUrl, '/') + '/' + _.trimStart(url, '/');
          }
          if (formattedUrl.includes(library.baseUrl)) {
               /* If Aspen Discovery, append minimalInterface to clean up the UI */
               formattedUrl = appendQuery(formattedUrl, 'minimalInterface=true');
          }

          await WebBrowser.openBrowserAsync(formattedUrl, browserParams)
               .then(async (res) => {
                    logInfoMessage(res);
                    if (res.type === 'cancel' || res.type === 'dismiss') {
                         logDebugMessage('User closed window.');
                         WebBrowser.dismissBrowser();
                         WebBrowser.coolDownAsync();
                    }
               })
               .catch(async (err) => {
                    if (err.message === 'Another WebBrowser is already being presented.') {
                         try {
                              WebBrowser.dismissBrowser();
                              WebBrowser.coolDownAsync();
                              await WebBrowser.openBrowserAsync(formattedUrl, browserParams)
                                   .then(async (response) => {
                                        logDebugMessage(response);
                                        if (response.type === 'cancel' || response.type === 'dismiss') {
                                             logDebugMessage('User closed window.');
                                             WebBrowser.dismissBrowser();
                                             WebBrowser.coolDownAsync();
                                        }
                                   })
                                   .catch(async () => {
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
     };

     if (hasMultiple) {
          return (
               <>
                    <Accordion
                         type="single"
                         isCollapsible={true}
                         value={expanded ? ["category-panel"] : []}
                         onValueChange={(values) => {
                              setExpanded(values.includes("category-panel"));
                         }}
                         style={{ backgroundColor: 'transparent' }}
                    >
                         <AccordionItem value="category-panel" style={{ borderBottomWidth: 0 }}>
                              <AccordionHeader>
                                   <AccordionTrigger className="px-2 py-3">
                                        {/* gluestack-ui allows passing a function to dynamically check states like isExpanded */}
                                        {({ isExpanded }) => (
                                             <HStack space="sm" className="items-center">
                                                  <Icon
                                                       as={MaterialIcons}
                                                       name={isExpanded ? 'expand-more' : 'chevron-right'}
                                                       size="lg"
                                                       style={{ color: neutrals.actionableIndicator }}
                                                  />
                                                  <VStack className="w-full">
                                                       <Text className="font-medium">
                                                            {categoryLabel}
                                                       </Text>
                                                  </VStack>
                                             </HStack>
                                        )}
                                   </AccordionTrigger>
                              </AccordionHeader>

                              <AccordionContent className="p-0 pt-1">
                                   {_.map(categories, function (item, index) {
                                        return (
                                             <Pressable
                                                  key={index}
                                                  onPress={() => openURL(item.url)}
                                                  style={{ backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: neutralPairs.border.light }}
                                                  className="py-2"
                                             >
                                                  <HStack space="sm" className="items-center ml-4">
                                                       <Icon
                                                            as={MaterialIcons}
                                                            name="chevron-right"
                                                            size="lg"
                                                            style={{ color: neutrals.actionableIndicator }}
                                                       />
                                                       <VStack className="w-full">
                                                            <Text className="font-medium">
                                                                 {item.linkText}
                                                            </Text>
                                                       </VStack>
                                                  </HStack>
                                             </Pressable>
                                        );
                                   })}
                              </AccordionContent>
                         </AccordionItem>
                    </Accordion>
               </>
          );
     }

     return (
          <>
               {_.map(categories, function (item, index) {
                    return (
                         <Pressable key={index} className="px-2 py-3 rounded-lg" onPress={() => openURL(item.url)}>
                             <HStack space="sm" className="items-center">
                                  <MaterialIcons name="chevron-right" size={20} color={neutrals.actionableIndicator} />
                                  <VStack className="w-full">
                                       <Text className="font-medium">{item.linkText}</Text>
                                   </VStack>
                              </HStack>
                         </Pressable>
                    );
               })}
          </>
     );
};

function appendQuery(url, query) {
     let newQuery = _.trim(query, '?&');

     if (newQuery) {
          let glue = url.includes('?') === false ? '?' : '&';
          return url + glue + newQuery;
     }

     return url;
}
