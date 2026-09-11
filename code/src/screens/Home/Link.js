import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { Dimensions } from 'react-native';
import { SearchContext } from '../../context/initialContext';
import { Image } from 'expo-image';
import { ThemedMaterialIcons as MaterialIcons } from '@/src/components/themed/ThemedMaterialIcons';
import { logDebugMessage, logErrorMessage } from '../../util/logging';
import * as WebBrowser from 'expo-web-browser';
import { popAlert } from '../../components/feedback';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { useLibrary } from '../../hooks/useLibrarySystemData';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { useTheme } from '../../themes/theme';
import { Box } from '@/components/ui/box';
import { Pressable } from '@/components/ui/pressable';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { VStack } from '@/components/ui/vstack';

/**
 * HomeScreenLinkGrid component that renders a grid of links on the home screen. It adjusts the number of columns based on the device width (tablet or phone) and ensures that if there is an odd number of links, the last link takes up the full width of its row.
 * @param param0
 * @param param0.links
 * @returns {React.JSX.Element}
 * @constructor
 */
const HomeScreenLinkGrid = ({links}) => {
     const { width } = Dimensions.get('window');
     const isTablet = width >= 768; // Consider tablet if width >= 768px
     const columnsPerRow = isTablet ? 4 : 2;
     const itemWidth = `${100 / columnsPerRow}%`;

     return (
          <Box className="flex-row flex-wrap">
               {links.map((item, index) => {
                    // Check if this is the last item and if it would be alone in its row
                    const isLastItem = index === links.length - 1;
                    const itemsInLastRow = links.length % columnsPerRow;
                    const isAloneInLastRow = isLastItem && itemsInLastRow === 1;

                    // Use 100% width if it's alone in the last row, otherwise use calculated width
                    const width = isAloneInLastRow ? "100%" : itemWidth;

                    return (
                         <Box
                             key={item.id || index}
                             style={{ width, alignItems: 'center' }}
                             className="mb-4 px-2"
                         >
                              <Link link={item} />
                         </Box>
                    );
               })}
          </Box>
     );
}

/**
 * Link component that renders an individual link with an icon and title. It handles both external links (opening in a web browser) and internal deep links (navigating to specific screens within the app).
 * @param param0
 * @param param0.link
 * @returns {React.JSX.Element}
 * @constructor
 */
const Link = ({link}) => {
     const { neutrals } = useTheme();
     const library = useLibrary();
     const language = useActiveLanguage();
     const { updateCurrentIndex } = React.useContext(SearchContext);

     const navigation = useNavigation();

     const iconColor = neutrals.iconMuted;

     const handleOpenLink = () => {
          // Open external link in web browser based on link.linkUrl
          try {
               if (link?.linkUrl) {
                    WebBrowser.openBrowserAsync(link.linkUrl).catch((err) => {
                         logErrorMessage('Failed to open browser: ' + err);
                    });
               }
          } catch (e) {
               logErrorMessage('Error opening link: ' + e);
               popAlert(getTermFromDictionary(language, 'error'), getTermFromDictionary(language, 'error_no_open_resource'), 'error');
          }
     }

     const handleOpenScreen = () => {
          // Navigate to internal screen based on link.deepLinkPath
          if (!link?.deepLinkPath) return;
          const segments = link.deepLinkPath.split('/');

          logDebugMessage("Navigating to");
          logDebugMessage(link);

          try {
               // Map deep link paths to actual navigation structure
               switch (segments[0]) {
                    case 'home':
                         navigation.navigate('BrowseTab', { screen: 'HomeScreen' });
                         break;
                    case 'user':
                         if (segments[1]) {
                              // Handle specific user screens like user/holds, user/checkouts, etc.
                              const userScreenMap = {
                                   'holds': 'MyHolds',
                                   'checkouts': 'MyCheckouts',
                                   'lists': 'MyLists',
                                   'saved_searches': 'MySavedSearches',
                                   'preferences': 'MyPreferences',
                                   'reading_history': 'MyReadingHistory',
                                   'linked_accounts': 'MyLinkedAccounts',
                                   'campaigns': 'MyCampaigns',
                                   'library_card': 'LibraryCard'
                              };

                              if (segments[1] === 'library_card') {
                                   navigation.navigate('LibraryCardTab', { screen: 'LibraryCard' });
                              } else if (userScreenMap[segments[1]]) {
                                   navigation.navigate('AccountScreenTab', { screen: userScreenMap[segments[1]] });
                              } else {
                                   // Default to user profile
                                   navigation.navigate('AccountScreenTab', { screen: 'MyProfile' });
                              }
                         } else {
                              // Navigate to user profile
                              navigation.navigate('AccountScreenTab', { screen: 'MyProfile' });
                         }
                         break;
                    case 'search':
                         if (segments[1]) {
                              const searchScreenMap = {
                                   browse_category: 'SearchByCategory',
                                   author: 'SearchByAuthor',
                                   list: 'SearchByList',
                                   grouped_work: 'GroupedWorkScreen',
                                   search: 'SearchResults' };

                              if (searchScreenMap[segments[1]]) {
                                   if(segments[1] === 'browse_category' || segments[1] === 'list' || segments[1] === 'grouped_work') {
                                        logDebugMessage(searchScreenMap[segments[1]]);
                                        navigation.navigate('BrowseTab', {
                                             screen: searchScreenMap[segments[1]],
                                             params: link.deepLinkId ? { id: link.deepLinkId, title: link.title } : {} });
                                   } else if(segments[1] === 'author') {
                                        updateCurrentIndex('Author');
                                        navigation.navigate('BrowseTab', {
                                             screen: 'SearchResults',
                                             params: link.deepLinkId ? { term: link.deepLinkId, title: link.deepLinkId } : {} });

                                   }
                              }
                         } else {
                              navigation.navigate('BrowseTab', { screen: 'SearchResults', params: link.deepLinkId ? { term: link.deepLinkId, title: link.deepLinkId } : {} });
                         }
                         break;
                    default:
                         // Fallback to home screen
                         navigation.navigate('BrowseTab', { screen: 'HomeScreen' });
                         break;
               }
          } catch (e) {
               logErrorMessage('Navigation error: ' + e.message);
               popAlert(getTermFromDictionary(language, 'error'), getTermFromDictionary(language, 'error_no_open_resource'), 'error');
          }
     }

     const imgSource = link?.typeOfIcon === 'uploadIcon' && link?.uploadIcon ? library.baseUrl + '/files/original/' + link.uploadIcon : null;

     return (
          <Pressable onPress={(link?.linkType !== 'deepLink') ? handleOpenLink : handleOpenScreen} style={{ alignItems: 'center', justifyContent: 'center', width: '100%', backgroundColor: neutrals.surface }} className="p-2 rounded-xl">
               <VStack className="items-center justify-center min-h-25">
                    {link?.typeOfIcon === 'uploadIcon' && imgSource ? (
                         <Image
                              source={{ uri: imgSource }}
                              style={{ width: 52.0, height: 52.0 }}
                              className="mb-2"
                              contentFit="contain"
                         />
                    ) : (
                         <MaterialIcons
                              name={link?.materialIcon?.replace(/_/g, '-') || 'link'}
                              size={52}
                              color={iconColor}
                              className="mb-2"
                         />
                    )}
                    <Box className="px-2">
                         <Text bold size="sm" className="text-center">{link?.title}</Text>
                    </Box>
               </VStack>
          </Pressable>
     );
}

export default HomeScreenLinkGrid;
