import { MaterialIcons } from '@expo/vector-icons';
import { map } from '../../../helpers/helpers';
import { useNavigation } from '@react-navigation/native';
import { Box, HStack, Icon, Pressable, Text, VStack } from '@gluestack-ui/themed';
import React from 'react';
import { ScrollView } from 'react-native';

import { SearchContext } from '../../../context/initialContext';
import {logDebugMessage} from "../../../util/logging";
import { useTheme } from '../../../themes/theme';

// custom components and helper files

export const SearchIndexScreen = () => {
     const navigation = useNavigation();
     const {theme, textColor, colorMode } = useTheme();
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
          <VStack pt="$5" flex={1}>
               <ScrollView>
                    <Box px="$5">
                         {map(indexes, function (obj, index, array) {
                              return (
                                   <Pressable p="$0.5" py="$2" onPress={() => updateIndex(index)}>
                                        {currentIndex === index ? (
                                             <HStack space="sm" justifyContent="flex-start" alignItems="center">
                                                  <Icon as={MaterialIcons} name="radio-button-checked" size="lg" color={theme.tokens.colors.primary['600']} />
                                                  <Text color={textColor} ml="$2">
                                                       {obj}
                                                  </Text>
                                             </HStack>
                                        ) : (
                                             <HStack space="sm" justifyContent="flex-start" alignItems="center">
                                                  <Icon as={MaterialIcons} name="radio-button-unchecked" size="lg" color={theme.tokens.colors.primary['200']}  />
                                                  <Text color={textColor} ml="$2">
                                                       {obj}
                                                  </Text>
                                             </HStack>
                                        )}
                                   </Pressable>
                              );
                         })}
                    </Box>
               </ScrollView>
          </VStack>
     );
};
