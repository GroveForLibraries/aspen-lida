import { MaterialIcons } from '@expo/vector-icons';
import { map } from '../../../helpers/helpers';
import { useNavigation } from '@react-navigation/native';
import { Box, HStack, Icon, Pressable, Text, VStack } from '@gluestack-ui/themed';
import React from 'react';
import { ScrollView } from 'react-native';

import { SearchContext } from '../../../context/initialContext';
import { getSearchIndexes } from '../../../util/api/search';
import { SearchGlobal } from '../../../util/globals';
import {logDebugMessage} from "../../../util/logging";
import { useActiveLanguage } from '../../../hooks/useLanguageData';
import { useTheme } from '../../../themes/theme';
import { useLibrary } from '../../../hooks/useLibrarySystemData';

// custom components and helper files

export const SearchSourceScreen = () => {
     const navigation = useNavigation();
     const library = useLibrary();
     const language = useActiveLanguage();
     const { currentSource, sources, updateCurrentSource, updateIndexes, updateCurrentIndex } = React.useContext(SearchContext);
     const { textColor, theme } = useTheme();
     logDebugMessage('currentSource: ' + currentSource);

     const search = async () => {
          // Dismiss modal so existing SearchResults screen refreshes with updated context/global state.
          navigation.getParent()?.goBack();
     };

     const updateSource = async (source) => {
          SearchGlobal.sortMethod = 'relevance';
          SearchGlobal.appliedFilters = [];
          SearchGlobal.sortList = [];
          SearchGlobal.availableFacets = [];
          SearchGlobal.defaultFacets = [];
          SearchGlobal.pendingFilters = [];
          SearchGlobal.appendedParams = '';
          updateCurrentSource(source);
          if (source === 'events') {
               updateCurrentIndex('EventsKeyword');
          } else {
               updateCurrentIndex('Keyword');
          }
          await search();
          await getSearchIndexes(library.baseUrl, language, source).then((indexes) => {
               updateIndexes(indexes);
          });
     };

     return (
          <VStack pt="$5" flex={1}>
               <ScrollView>
                    <Box px="$5">
                         {map(sources, function (source, index, array) {
                              if (index === 'events' || index === 'local') {
                                   return (
                                        <Pressable p="$0.5" py="$2" onPress={() => updateSource(index)}>
                                             {currentSource === index ? (
                                                  <HStack space="sm" justifyContent="flex-start" alignItems="center">
                                                       <Icon as={MaterialIcons} name="radio-button-checked" size="lg" color={theme.tokens.colors.primary['600']} />
                                                       <Text color={textColor} ml="$2">
                                                            {source.name}
                                                       </Text>
                                                  </HStack>
                                             ) : (
                                                  <HStack space="sm" justifyContent="flex-start" alignItems="center">
                                                       <Icon as={MaterialIcons} name="radio-button-unchecked" size="lg" color={theme.tokens.colors.primary['200']} />
                                                       <Text color={textColor} ml="$2">
                                                            {source.name}
                                                       </Text>
                                                  </HStack>
                                             )}
                                        </Pressable>
                                   );
                              }
                         })}
                    </Box>
               </ScrollView>
          </VStack>
     );
};
