import { useRoute } from '@react-navigation/native';
import { Image } from 'expo-image';
import _ from 'lodash';
import React from 'react';
import { getCleanTitle } from '../../helpers/item';
import { navigate } from '../../helpers/RootNavigator';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { getFormats } from '../../util/api/searchHelper';
import AddToList from './AddToList';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { useTheme } from '../../themes/theme';
import { useLibrary } from '../../hooks/useLibrarySystemData';
import { ThemedBadge as Badge, ThemedBadgeText as BadgeText } from '../../components/themed/ThemedBadge';
import { Box } from '@/components/ui/box';
import { Center } from '@/components/ui/center';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { VStack } from '@/components/ui/vstack';

const blurhash = 'MHPZ}tt7*0WC5S-;ayWBofj[K5RjM{ofM_';

/**
 * DisplayGroupedWorkResult component that displays an individual grouped work result with its image, title, author, formats, and language. It handles user interaction to navigate to the grouped work details.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
export const DisplayGroupedWorkResult = (props) => {
     const item = props.data;
     let params = useRoute();
     const library = useLibrary();
     const language = useActiveLanguage();
     const { neutrals } = useTheme();

     let formats = item?.itemList ?? [];
     const id = item.key ?? item.id;

     let title;
     if (item.title) {
          title = item.title;
     } else if (item.title_display) {
          title = item.title_display;
     }

     let author;
     if (item.author) {
          author = item.author;
     } else if (item.author_display) {
          author = item.author_display;
     }

     if (_.isEmpty(formats)) {
          if (item.format) {
               formats = item.format;
          }
     }

     if (params.name === 'SearchBySavedSearch') {
          formats = getFormats(formats);
     }

     const handlePressItem = () => {
          navigate('GroupedWorkScreen', {
               id: id,
               title: getCleanTitle(title),
               url: library.baseUrl });
     };

     function getFormat(n) {
          if (_.isArray(n) || _.isObject(n)) {
               return (
                    <Badge key={n.key} colorScheme="secondary" variant="outline">
                         <BadgeText colorScheme="secondary" className="text-xs">
                              {n.name}
                         </BadgeText>
                    </Badge>
               );
          }

          return (
               <Badge key={n} colorScheme="secondary" variant="outline">
                    <BadgeText colorScheme="secondary" className="text-xs">
                         {n}
                    </BadgeText>
               </Badge>
          );
     }

     const key = 'medium_' + id;

     let url = library.baseUrl + '/bookcover.php?id=' + id + '&size=medium';

     return (
          <Pressable className="pl-4 pr-5 py-2" style={{ borderBottomWidth: 1, borderColor: neutrals.border }} onPress={handlePressItem}>
               <HStack space="md">
                    <VStack className="w-25">
                         <Box className="h-[150px]">
                              <Image
                                   alt={item.title}
                                   source={url}
                                   className="rounded-lg"
                                   style={{ width: '100%', height: '100%' }}
                                   placeholder={blurhash}
                                   transition={1000}
                                   contentFit="cover"
                              />
                         </Box>
                         {item.language ? (
                              <Center className="mt-1">
                                   <Badge
                                        size="sm"
                                        style={{ backgroundColor: neutrals.surfaceMuted }}>
                                        <BadgeText style={{ color: neutrals.iconMuted, fontSize: 12, textAlign: 'center' }}>
                                            {item.language}
                                       </BadgeText>
                                   </Badge>
                              </Center>
                         ) : null}
                         <AddToList itemId={id} btnStyle="sm" />
                    </VStack>
                    <VStack className="w-[65%] pt-1">
                         {title ? (
                              <Text bold className="pb-1" size="sm">
                                   {title}
                              </Text>
                         ) : null}
                         {author ? (
                              <Text size="xs">
                                   {getTermFromDictionary(language, 'by')} {author}
                              </Text>
                         ) : null}
                         <HStack space="xs" className="mt-4 flex-row flex-wrap">
                              {_.map(formats, getFormat)}
                         </HStack>
                    </VStack>
               </HStack>
          </Pressable>
     );
};
