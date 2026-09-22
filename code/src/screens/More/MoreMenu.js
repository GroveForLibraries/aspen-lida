import { Entypo, MaterialIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { formatTime, getTodaysHoursStatus, map, sample, size, trim, trimEnd, trimStart } from '../../helpers/helpers';
import {
     Accordion,
     AccordionItem,
     AccordionHeader,
     AccordionTrigger,
     AccordionContent,
     Box,
     Divider,
     HStack,
     Icon,
     Pressable,
     ScrollView,
     Heading,
     Button,
     Text,
     VStack,
     Modal,
     ModalBackdrop,
     ModalContent,
     ModalHeader,
     ModalFooter,
     ModalCloseButton, CloseIcon, ModalBody, ButtonText, ButtonGroup
} from '@gluestack-ui/themed';
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

export const MoreMenu = () => {
     const language = useActiveLanguage();
     const library = useLibrary();
     const menu = useLibraryMenu();
     const updateMenu = useUpdateMenu();
     const { textColor, theme, colorMode } = useTheme();

     const { signOut } = React.useContext(AuthContext);
     const hasMenuItems = size(menu);
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
          <ScrollView>
               <Box>
                    <VStack space="md" my="$2" mx="$1">
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
                                        <Pressable px="$2" py="$3" onPress={toggleDeleteConfirmationModal}>
                                             <HStack space="sm" alignItems="center">
                                                  <Icon as={MaterialIcons} name="chevron-right" size="lg" color={textColor} onPress={() => setShowDeleteConfirmationModal(true)} />
                                                  <Text color={textColor} fontWeight="$medium">
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
                         <ModalContent bgColor={colorMode === 'light' ? '$warmGray50' : '$coolGray700'}>
                              <ModalHeader>
                                   <Heading size="md" color={textColor}>
                                        {getTermFromDictionary(language, 'delete_account')}
                                   </Heading>
                                   <ModalCloseButton p="$3" onPress={toggleDeleteConfirmationModal}>
                                        <Icon as={CloseIcon} color={textColor} />
                                   </ModalCloseButton>
                              </ModalHeader>
                              <ModalBody>
                                   <Text color={textColor}>{getTermFromDictionary(language, 'confirm_delete_account_message')}</Text>
                              </ModalBody>
                              <ModalFooter>
                                   <ButtonGroup>
                                        <Button variant="outline" borderColor={theme.tokens.colors.primary['500']} onPress={toggleDeleteConfirmationModal}>
                                             <ButtonText color={theme.tokens.colors.primary['500']}>{getTermFromDictionary(language, 'cancel')}</ButtonText>
                                        </Button>
                                        <Button
                                             bgColor={theme.tokens.colors.primary['500']}
                                             isLoading={deleting}
                                             isLoadingText={getTermFromDictionary(language, 'deleting', true)}
                                             onPress={async () => {
                                                  await initiateDeleteAspenUser().then(() => {
                                                       setShowDeleteConfirmationModal(false);
                                                       setShowDeleteResultsModal(true);
                                                  });
                                             }}>
                                             <ButtonText color={theme.tokens.colors.primary['500-text']}>{getTermFromDictionary(language, 'confirm_delete_account')}</ButtonText>
                                        </Button>
                                   </ButtonGroup>
                              </ModalFooter>
                         </ModalContent>
                    </Modal>
                    <Modal isOpen={showDeleteResultsModal}>
                         <ModalBackdrop />
                         <ModalContent bgColor={colorMode === 'light' ? '$warmGray50' : '$coolGray700'}>
                              <ModalHeader>
                                   <Heading size="md" color={textColor}>
                                        {getTermFromDictionary(language, 'delete_account')}
                                   </Heading>
                                   <ModalCloseButton p="$3" onPress={signOut}>
                                        <Icon as={CloseIcon} color={textColor} />
                                   </ModalCloseButton>
                              </ModalHeader>
                              <ModalBody>{deleteResults?.message ? <Text color={textColor}>{deleteResults.message}</Text> : <Text color={textColor}>{getTermFromDictionary(language, 'error_deleting_account')}</Text>}</ModalBody>
                              <ModalFooter>
                                   {deleteResults.success === true ? (
                                        <Button bgColor={theme.tokens.colors.primary['500']} onPress={signOut}>
                                             <ButtonText color={theme.tokens.colors.primary['500-text']}>{getTermFromDictionary(language, 'button_ok')}</ButtonText>
                                        </Button>
                                   ) : (
                                        <Button bgColor={theme.tokens.colors.primary['500']} variant="primary" onPress={toggleDeleteResultsModal}>
                                             <ButtonText color={theme.tokens.colors.primary['500-text']}>{getTermFromDictionary(language, 'button_ok')}</ButtonText>
                                        </Button>
                                   )}
                              </ModalFooter>
                         </ModalContent>
                    </Modal>
               </Box>
          </ScrollView>
     );
};

const MyLibrary = () => {
     const library = useLibrary();
     const location = useLibraryLocation();
     const language = useActiveLanguage();

     const { textColor, theme, colorMode } = useTheme();

     let hoursLabel = '';
     if (location?.hours) {
          const hoursStatus = getTodaysHoursStatus(location.hours);
          if (hoursStatus.status === 'closed_until' && hoursStatus.openingTime) {
               hoursLabel = 'Closed until ' + formatTime(hoursStatus.openingTime);
          } else if (hoursStatus.status === 'open_until' && hoursStatus.closingTime) {
               hoursLabel = 'Open until ' + formatTime(hoursStatus.closingTime);
          } else {
               hoursLabel = getTermFromDictionary(language, 'location_closed');
          }
     }

     return (
          <Box m="$4" bgColor={theme['tokens']['colors']['primary']['400']} p="$6" borderRadius="$xl">
               <Pressable display="flex" flexDirection="row" onPress={() => navigate('MyLibrary')} space="sm" alignItems="center" justifyContent="space-between">
                    <VStack>
                         <Text bold fontSize="$md" color={theme['tokens']['colors']['primary']['400-text']}>
                              {library.displayName}
                         </Text>
                         {library.displayName !== location?.displayName ? (
                              <Text bold color={theme['tokens']['colors']['primary']['400-text']}>
                                   {location?.displayName}
                              </Text>
                         ) : null}
                         {hoursLabel ? <Text color={theme['tokens']['colors']['primary']['400-text']}>{hoursLabel}</Text> : null}
                    </VStack>
                    <Icon as={MaterialIcons} name="chevron-right" size="lg" color={theme['tokens']['colors']['primary']['400-text']} />
               </Pressable>
          </Box>
     );
};

const ViewAllLocations = () => {
     const language = useActiveLanguage();
     const locations = useAvailableLocations();
     const { textColor, theme, colorMode } = useTheme();

     if (size(locations) > 1) {
          return (
               <Pressable px="$2" py="$3" onPress={() => navigate('AllLocations')}>
                    <HStack space="sm" alignItems="center">
                         <Icon as={MaterialIcons} name="chevron-right" size="lg" color={textColor}/>
                         <Text fontWeight="$medium" color={textColor}>{getTermFromDictionary(language, 'view_all_locations')}</Text>
                    </HStack>
               </Pressable>
          );
     }

     return null;
};

const Settings = () => {
     const language = useActiveLanguage();
     const { textColor, theme, colorMode } = useTheme();

     return (
          <Pressable px="$2" py="$3" onPress={() => navigate('MyPreferences')}>
               <HStack space="sm" alignItems="center">
                    <Icon as={MaterialIcons} name="chevron-right" size="lg" color={textColor} />
                    <Text fontWeight="$medium" color={textColor}>{getTermFromDictionary(language, 'preferences')}</Text>
               </HStack>
          </Pressable>
     );
};

const DeleteAccount = () => {
     const language = useActiveLanguage();
     const { textColor, theme, colorMode } = useTheme();

     return (
         <Pressable px="$2" py="$3" onPress={() => navigate('MyPreferences')}>
              <HStack space="sm" alignItems="center">
                   <Icon as={MaterialIcons} name="chevron-right" size="lg" color={textColor}/>
                   <Text fontWeight="$medium" color={textColor}>{getTermFromDictionary(language, 'preferences')}</Text>
              </HStack>
         </Pressable>
     );
};

const PrivacyPolicy = () => {
     const language = useActiveLanguage();
     const appSettings = useAppSettings();

     const { textColor, theme, colorMode } = useTheme();
     const backgroundColor = colorMode === 'light' ? "$warmGray200" : "$coolGray900";

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
          <Pressable px="$2" py="$3" onPress={() => openURL()}>
               <HStack space="sm" alignItems="center">
                    <Icon as={MaterialIcons} name="chevron-right" size="lg" color={textColor} />
                    <Text fontWeight="$medium" color={textColor}>{getTermFromDictionary(language, 'privacy_policy')}</Text>
               </HStack>
          </Pressable>
     );
};

const MenuLink = (payload) => {
     const library = useLibrary();
     const categories = payload.links;
     let hasMultiple = false;
     if (size(categories) > 1) {
          hasMultiple = true;
     }
     let categoryLabel = sample(categories);
     categoryLabel = categoryLabel.category;

     const { textColor, theme, colorMode } = useTheme();
     const backgroundColor = colorMode === 'light' ? "$warmGray200" : "$coolGray900";

     const browserParams = {
          enableDefaultShareMenuItem: false,
          presentationStyle: 'automatic',
          showTitle: false,
          toolbarColor: backgroundColor,
          controlsColor: textColor,
          secondaryToolbarColor: backgroundColor };

     const [expanded, setExpanded] = React.useState(false);

     function isValidHttpUrl(str) {
          if (str.startsWith('http://') || str.startsWith('https://')) {
               return true;
          }
          return false;
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
               formattedUrl = trimEnd(library.baseUrl, '/') + '/' + trimStart(url, '/');
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
                                   <AccordionTrigger px="$2" py="$3">
                                        {/* gluestack-ui allows passing a function to dynamically check states like isExpanded */}
                                        {({ isExpanded }) => (
                                             <HStack space="sm" alignItems="center">
                                                  <Icon
                                                       as={isExpanded ? Entypo : MaterialIcons}
                                                       name={isExpanded ? 'chevron-small-down' : 'chevron-right'}
                                                       size="lg"
                                                       color={textColor}
                                                  />
                                                  <VStack width="$full">
                                                       <Text fontWeight="$medium" color={textColor}>
                                                            {categoryLabel}
                                                       </Text>
                                                  </VStack>
                                             </HStack>
                                        )}
                                   </AccordionTrigger>
                              </AccordionHeader>

                              <AccordionContent p="$0" pt="$1">
                                   {map(categories, function (item, index) {
                                        return (
                                             <Pressable
                                                  key={index}
                                                  onPress={() => openURL(item.url)}
                                                  style={{ backgroundColor: 'transparent' }}
                                                  borderBottomWidth={1}
                                                  borderBottomColor="$borderLight200" // Adjust to your theme border token if needed
                                                  py="$2"
                                             >
                                                  <HStack space="sm" alignItems="center" ml="$4">
                                                       <Icon
                                                            as={MaterialIcons}
                                                            name="chevron-right"
                                                            size="lg"
                                                            color={textColor}
                                                       />
                                                       <VStack width="$full">
                                                            <Text fontWeight="$medium" color={textColor}>
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
               {map(categories, function (item, index) {
                    return (
                         <Pressable key={index} px="$2" py="$3" borderRadius="$md" onPress={() => openURL(item.url)}>
                              <HStack space="sm" alignItems="center">
                                   <Icon as={MaterialIcons} name="chevron-right" size="lg" color={textColor} />
                                   <VStack width="$full">
                                        <Text fontWeight="$medium" color={textColor}>{item.linkText}</Text>
                                   </VStack>
                              </HStack>
                         </Pressable>
                    );
               })}
          </>
     );
};

function appendQuery(url, query) {
     let newQuery = trim(query, '?&');

     if (newQuery) {
          let glue = url.includes('?') === false ? '?' : '&';
          return url + glue + newQuery;
     }

     return url;
}
