import { Badge, BadgeText, Box, HStack, Pressable, Text, VStack } from '@gluestack-ui/themed';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';

import React from 'react';
import { popToast } from '../../components/feedback';

// custom components and helper files

import { getCleanTitle } from '../../helpers/item';
import { navigate } from '../../helpers/RootNavigator';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { decodeHTML, getEventDateDisplayData } from '../../helpers/helpers';
import AddToList from './AddToList';
import { logDebugMessage, logErrorMessage } from '../../util/logging';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { useTheme } from '../../themes/theme';
import { useLibrary } from '../../hooks/useLibrarySystemData';

const blurhash = 'MHPZ}tt7*0WC5S-;ayWBofj[K5RjM{ofM_';

export const DisplayEventResult = (props) => {
     const item = props.data;
     const library = useLibrary();
     const language = useActiveLanguage();
     const { theme, textColor, colorMode } = useTheme();

     const backgroundColor = colorMode === 'light' ? "$warmGray200" : "$coolGray900";

     const id = item.key ?? item.id;
     const keyParts = item.key.split('_');

     let url = item.image ?? library.baseUrl + '/bookcover.php?id=' + item.key + '&size=medium&type=' + keyParts[0] + '_event';

     let registrationRequired = false;
     if (item.registration_required !== undefined) {
          registrationRequired = item.registration_required;
     }

     const startTime = item.start_date.date;
     const endTime = item.end_date.date;
     const { displayDay, displayStartTime, displayEndTime } = getEventDateDisplayData(startTime, endTime);

     let locationData = item?.location ?? [];
     let roomData = item?.room ?? null;

     const handlePressItem = () => {
          let eventSource = item.source;
          if (item.source === 'lc') {
               eventSource = 'library_calendar';
          }
          if (item.source === 'libcal' || item.source === 'springshare_libcal') {
               eventSource = 'springshare';
          }

          if (item.source === 'assabet') {
               eventSource = 'assabet';
          }

          if (item.source === 'aspenEvent') {
               eventSource = 'aspenEvent';
          }

          if (item.bypass) {
               openURL(item.url);
          } else {
               navigate('EventScreen', {
                    id: id,
                    title: getCleanTitle(item.title),
                    url: library.baseUrl,
                    source: eventSource });
          }
     };

     const openURL = async (url) => {
          const browserParams = {
               enableDefaultShareMenuItem: false,
               presentationStyle: 'automatic',
               showTitle: false,
               toolbarColor: backgroundColor,
               controlsColor: textColor,
               secondaryToolbarColor: backgroundColor };
          await WebBrowser.openBrowserAsync(url, browserParams)
               .then((res) => {
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
          <Pressable borderBottomWidth="$1" borderColor={colorMode === 'light' ? "$warmGray400" : "$warmGray600"} pl="$4" pr="$5" py="$2" onPress={handlePressItem}>
               <HStack space="md">
                    <VStack sx={{ '@base': { width: 100 }, '@lg': { width: 180 } }}>
                         <Box sx={{ '@base': { height: 150 }, '@lg': { height: 250 } }}>
                              <Image
                                   alt={item.title}
                                   source={url}
                                   style={{
                                        width: '100%',
                                        height: '100%',
                                        borderRadius: "$sm" }}
                                   placeholder={blurhash}
                                   transition={1000}
                                   contentFit="cover"
                              />
                         </Box>
                         {item.canAddToList ? <AddToList source="Events" itemId={item.key} btnStyle="sm" /> : null}
                    </VStack>
                    <VStack w="65%" pt="$1">
                         <Text color={textColor} bold sx={{ '@base': { fontSize: 14, lineHeight: 17, paddingBottom: 4 }, '@lg': { fontSize: 22, lineHeight: 25, paddingBottom: 4 } }}>
                              {decodeHTML(item.title)}
                         </Text>
                         {item.start_date && item.end_date ? (
                              <>
                                   <Text color={textColor} sx={{ '@base': { fontSize: 12, lineHeight: 15 }, '@lg': { fontSize: 18, lineHeight: 21 } }}>
                                        {displayDay}
                                   </Text>
                                   <Text color={textColor} sx={{ '@base': { fontSize: 12, lineHeight: 15 }, '@lg': { fontSize: 18, lineHeight: 21 } }}>
                                        {displayStartTime} - {displayEndTime}
                                   </Text>
                              </>
                         ) : null}
                         {locationData.name ? (
                              <Text color={textColor} sx={{ '@base': { fontSize: 12, lineHeight: 15 }, '@lg': { fontSize: 18, lineHeight: 21 } }}>
                                   {locationData.name}
                              </Text>
                         ) : null}
                         {registrationRequired ? (
                              <HStack mt="$4" direction="row" space="xs" flexWrap="wrap">
                                   <Badge key={0} borderRadius="$sm" borderColor={theme['tokens']['colors']['secondary']['400']} variant="outline" bg="transparent">
                                        <BadgeText textTransform="none" color={theme['tokens']['colors']['secondary']['400']} sx={{ '@base': { fontSize: 10, lineHeight: 14 }, '@lg': { fontSize: 16, lineHeight: 20 } }}>
                                             {getTermFromDictionary(language, 'registration_required')}
                                        </BadgeText>
                                   </Badge>
                              </HStack>
                         ) : null}
                    </VStack>
               </HStack>
          </Pressable>
     );
};
