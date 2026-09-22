import { Badge, BadgeText, Box, Center, HStack, Pressable, Text, VStack } from '@gluestack-ui/themed';
import { useRoute } from '@react-navigation/native';
import { Image } from 'expo-image';
import { isArray, isEmpty, isObject, map } from '../../helpers/helpers';
import React from 'react';

// custom components and helper files

import { getCleanTitle } from '../../helpers/item';
import { navigate } from '../../helpers/RootNavigator';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { getFormats } from '../../util/api/searchHelper';
import AddToList from './AddToList';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { useTheme } from '../../themes/theme';
import { useLibrary } from '../../hooks/useLibrarySystemData';

const blurhash = 'MHPZ}tt7*0WC5S-;ayWBofj[K5RjM{ofM_';

export const DisplayGroupedWorkResult = (props) => {
     const item = props.data;
     let params = useRoute();
     const library = useLibrary();
     const language = useActiveLanguage();
     const { theme, textColor, colorMode } = useTheme();

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

     if (isEmpty(formats)) {
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
          if (isArray(n) || isObject(n)) {
               return (
                    <Badge key={n.key} borderRadius="$sm" borderColor={theme['tokens']['colors']['secondary']['400']} variant="outline" bg="transparent">
                         <BadgeText textTransform="none" color={theme['tokens']['colors']['secondary']['400']} fontSize="$xs">
                              {n.name}
                         </BadgeText>
                    </Badge>
               );
          }

          return (
               <Badge key={n} borderRadius="$sm" borderColor={theme['tokens']['colors']['secondary']['400']} variant="outline" bg="transparent">
                    <BadgeText textTransform="none" color={theme['tokens']['colors']['secondary']['400']} fontSize="$xs">
                         {n}
                    </BadgeText>
               </Badge>
          );
     }

     const key = 'medium_' + id;

     let url = library.baseUrl + '/bookcover.php?id=' + id + '&size=medium';

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
                         {item.language ? (
                              <Center
                                   mt="$1"
                                   sx={{
                                        bgColor: colorMode === 'light' ? "$warmGray200" : "$coolGray900" }}>
                                   <Badge
                                        size="$sm"
                                        sx={{
                                             bgColor: colorMode === 'light' ? "$warmGray200" : "$coolGray900" }}>
                                        <BadgeText textTransform="none" color={colorMode === 'light' ? "$coolGray600" : "$warmGray400"} fontSize="$xs" textAlign="center">
                                             {item.language}
                                        </BadgeText>
                                   </Badge>
                              </Center>
                         ) : null}
                         <AddToList itemId={id} btnStyle="sm" />
                    </VStack>
                    <VStack w="65%" pt="$1">
                         {title ? (
                              <Text color={textColor} bold fontSize="$sm" pb="$1">
                                   {title}
                              </Text>
                         ) : null}
                         {author ? (
                              <Text color={textColor} fontSize="$xs">
                                   {getTermFromDictionary(language, 'by')} {author}
                              </Text>
                         ) : null}
                         <HStack mt="$4" direction="row" space="xs" flexWrap="wrap">
                              {map(formats, getFormat)}
                         </HStack>
                    </VStack>
               </HStack>
          </Pressable>
     );
};
