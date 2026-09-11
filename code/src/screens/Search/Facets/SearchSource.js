import { ThemedMaterialIcons as MaterialIcons } from '@/src/components/themed/ThemedMaterialIcons';
import _ from 'lodash';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { ThemedScrollView as ScrollView } from '@/src/components/themed/ThemedScrollView';
import { SearchContext } from '@/src/context/initialContext';
import { getSearchIndexes } from '@/src/util/api/search';
import { SearchGlobal } from '@/src/util/globals';
import {logDebugMessage} from '@/src/util/logging';
import { useActiveLanguage } from '@/src/hooks/useLanguageData';
import { useTheme } from '@/src/themes/theme';
import { useLibrary } from '@/src/hooks/useLibrarySystemData';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { ScreenContainer } from '@/src/components/ScreenContainer';

/**
 * SearchSourceScreen component that displays a list of search sources for the user to select from. It manages the current source state and updates the search results when a new source is selected.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const SearchSourceScreen = () => {
     const navigation = useNavigation();
     const library = useLibrary();
     const language = useActiveLanguage();
     const { currentSource, sources, updateCurrentSource, updateIndexes, updateCurrentIndex } = React.useContext(SearchContext);
     const { brand } = useTheme();
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
          <ScreenContainer className="pt-5">
               <ScrollView>
                    <Box>
                         {_.map(sources, function (source, index, array) {
                              if (index === 'events' || index === 'local') {
                                   return (
                                       <Pressable key={index} className="p-[2px] py-2" onPress={() => updateSource(index)}>
                                             {currentSource === index ? (
                                                 <HStack space="sm" className="justify-start items-center">
                                                      <MaterialIcons name="radio-button-checked" size={20} color={brand.primary[600]} />
                                                      <Text className="ml-2">
                                                            {source.name}
                                                       </Text>
                                                  </HStack>
                                             ) : (
                                                 <HStack space="sm" className="justify-start items-center">
                                                      <MaterialIcons name="radio-button-unchecked" size={20} color={brand.primary[200]} />
                                                      <Text className="ml-2">
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
          </ScreenContainer>
     );
};
