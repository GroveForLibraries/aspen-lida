import { ThemedMaterialIcons as MaterialIcons } from '@/src/components/themed/ThemedMaterialIcons';
import _ from 'lodash';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { ThemedScrollView as ScrollView } from '@/src/components/themed/ThemedScrollView';
import { SearchContext } from '@/src/context/initialContext';
import {logDebugMessage} from '@/src/util/logging';
import { useTheme } from '@/src/themes/theme';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { ScreenContainer } from '@/src/components/ScreenContainer';

/**
 * SearchIndexScreen component that displays a list of search indexes for the user to select from. It manages the current index state and updates the search results when a new index is selected.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const SearchIndexScreen = () => {
     const navigation = useNavigation();
     const { brand } = useTheme();
     const { currentIndex, indexes, updateCurrentSource, updateIndexes, updateCurrentIndex } = React.useContext(SearchContext);

     logDebugMessage('currentIndex: ' + currentIndex);

     const search = async () => {
          // Dismiss modal so existing SearchResults screen refreshes with updated context/global state.
          navigation.getParent()?.goBack();
     };

     const updateIndex = async (index) => {
          updateCurrentIndex(index);
          await search();
     };

     return (
          <ScreenContainer className="pt-5">
               <ScrollView>
                    <Box>
                         {_.map(indexes, function (obj, index, array) {
                              return (
                                   <Pressable key={index} className="p-[2px] py-2" onPress={() => updateIndex(index)}>
                                        {currentIndex === index ? (
                                            <HStack space="sm" className="justify-start items-center">
                                                 <MaterialIcons name="radio-button-checked" size={20} color={brand.primary[600]} />
                                                 <Text className="ml-2">
                                                       {obj}
                                                  </Text>
                                             </HStack>
                                        ) : (
                                            <HStack space="sm" className="justify-start items-center">
                                                 <MaterialIcons name="radio-button-unchecked" size={20} color={brand.primary[200]} />
                                                 <Text className="ml-2">
                                                       {obj}
                                                  </Text>
                                             </HStack>
                                        )}
                                   </Pressable>
                              );
                         })}
                    </Box>
               </ScrollView>
          </ScreenContainer>
     );
};
