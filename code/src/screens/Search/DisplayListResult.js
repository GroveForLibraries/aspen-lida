import { ThemedMaterialIcons as MaterialIcons } from '@/src/components/themed/ThemedMaterialIcons';
import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { getCleanTitle } from '../../helpers/item';
import { navigateStack } from '../../helpers/RootNavigator';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { removeTitlesFromList } from '../../util/api/list';
import AddToList from './AddToList';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { useTheme } from '../../themes/theme';
import { useLibrary } from '../../hooks/useLibrarySystemData';
import { ThemedBadge as Badge, ThemedBadgeText as BadgeText } from '../../components/themed/ThemedBadge';
import { Box } from '@/components/ui/box';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { VStack } from '@/components/ui/vstack';

const blurhash = 'MHPZ}tt7*0WC5S-;ayWBofj[K5RjM{ofM_';

/**
 * DisplayListResult component that displays an individual list result with its image, title, author, formats, and language. It handles user interaction to navigate to the list result details or remove the item from the user's list.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
export const DisplayListResult = (props) => {
     const item = props.data;
     const isUserList = props.isUserList;
     const listId = props.listId;
     const language = useActiveLanguage();
     const library = useLibrary();
     const queryClient = useQueryClient();

     const { neutralPairs, neutrals } = useTheme();

     let recordType = 'grouped_work';
     if (item.recordtype) {
          recordType = item.recordtype;
     }
     const imageUrl = library.baseUrl + '/bookcover.php?id=' + item.id + '&size=medium&type=' + recordType;
     const handlePressItem = () => {
          if (item) {
               if (recordType === 'list') {
                    navigateStack('BrowseTab', 'ListResults', {
                         id: item.id,
                         title: item.title_display,
                         url: library.baseUrl,
                         prevRoute: 'SearchByList' });
               } else {
                    navigateStack('BrowseTab', 'ListResultItem', {
                         id: item.id,
                         title: getCleanTitle(item.title_display),
                         url: library.baseUrl,
                         libraryContext: library,
                         prevRoute: 'SearchByList' });
               }
          }
     };

     return (
          <Pressable className="pl-4 pr-5 py-2" style={{ borderBottomWidth: 1, borderColor: neutrals.border }} onPress={handlePressItem}>
               <HStack space="md">
                    <VStack className="w-25">
                         <Box className="h-[150px]">
                              <Image
                                   alt={item.title_display}
                                   source={imageUrl}
                                   className="rounded-lg"
                                   style={{ width: '100%', height: '100%' }}
                                   placeholder={blurhash}
                                   transition={1000}
                                   contentFit="cover"
                              />
                         </Box>
                         {item.language ? (
                              <Center>
                                   <Badge
                                        size="sm"
                                        style={{ backgroundColor: neutrals.surfaceMuted }}>
                                        <BadgeText style={{ color: neutrals.iconMuted, fontSize: 10, textAlign: 'center' }}>
                                            {item.language}
                                       </BadgeText>
                                   </Badge>
                              </Center>
                         ) : null}
                         {isUserList ? (
                              <Button
                                   onPress={() => {
                                        removeTitlesFromList(listId, item.id, library.baseUrl).then(async () => {
                                             queryClient.invalidateQueries({ queryKey: ['list', listId] });
                                             queryClient.invalidateQueries({ queryKey: ['searchResultsForList', library.baseUrl, 1, listId, language] });
                                        });
                                   }}
                                   colorScheme="danger"
                                   size="sm"
                                   variant="ghost">
                                   <MaterialIcons name="delete" size={18} color={neutralPairs.danger} className="mr-1" />
                                   <ButtonText>{getTermFromDictionary(language, 'delete')}</ButtonText>
                              </Button>
                         ) : (
                              <AddToList itemId={item.id} btnStyle="sm" />
                         )}
                    </VStack>
                    <VStack className="w-[65%] pt-1">
                         <Text bold className="pb-1" style={{ lineHeight: 17 }} size="sm">
                              {item.title_display}
                         </Text>
                         {item.author_display ? (
                              <Text style={{ lineHeight: 15 }} size="xs">
                                   {getTermFromDictionary(language, 'by')} {item.author_display}
                              </Text>
                         ) : null}
                         {item.format ? (
                              <HStack space="xs" className="mt-4 flex-row flex-wrap">
                                   {item.format.map((format, i) => {
                                        return (
                                             <Badge key={i} colorScheme="secondary" variant="outline">
                                                  <BadgeText colorScheme="secondary" style={{ fontSize: 10, lineHeight: 14 }}>
                                                       {format}
                                                  </BadgeText>
                                             </Badge>
                                        );
                                   })}
                              </HStack>
                         ) : null}
                    </VStack>
               </HStack>
          </Pressable>
     );
};
