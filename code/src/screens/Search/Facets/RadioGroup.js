import { MaterialIcons } from '@expo/vector-icons';
import { filter, isEmpty, isObject } from '../../../helpers/helpers';
import { HStack, Icon, Pressable, Text, VStack } from '@gluestack-ui/themed';
import React from 'react';

import { SearchGlobal } from '../../../util/globals';
import { logDebugMessage } from '../../../util/logging';
import { addAppliedFilter, removeAppliedFilter } from '../../../util/api/searchHelper';
import { useTheme } from '../../../themes/theme';


export const Facet_RadioGroup = ({ title, data, category, updater, applied }) => {
     const [isLoading, setIsLoading] = React.useState(true);
     const [value, setValue] = React.useState('');
     const [pending] = React.useState(SearchGlobal.pendingFilters);
     const {theme, textColor, colorMode } = useTheme();

     React.useEffect(() => {
          const facets = data;
          if (isObject(facets)) {
               const facet = filter(facets, 'isApplied');
               if (!isEmpty(facet)) {
                    setValue(facet[0]['value'] ?? '');
               }
          }
          setIsLoading(false);
     }, [data]);

     React.useEffect(() => {
          if (value !== applied) {
               logDebugMessage('prevValue', value);
               logDebugMessage('applied', applied);
          }
     }, [applied, value]);

     const updateValue = (payload) => {
          if (category !== 'sort_by') {
               logDebugMessage('payload > ', payload);
               logDebugMessage('value > ', value);
               if (payload === value) {
                    logDebugMessage('new is same as old. removing.');
                    removeAppliedFilter(category, payload);
                    setValue('');
               } else {
                    logDebugMessage('new value. adding.');
                    addAppliedFilter(category, payload, false);
                    setValue(payload);
               }
               logDebugMessage('current state value: ' + value);
          } else {
               logDebugMessage('sort payload > ', payload);
               logDebugMessage('sort value > ', value);
               if (payload === value) {
                    setValue('relevance');
               } else {
                    setValue(payload);
                    SearchGlobal.sortMethod = payload;
               }
               addAppliedFilter(category, payload, false);
          }
          updater(category, payload);
     };

     logDebugMessage(data);

     if (category === 'sort_by') {
          return (
               <VStack space="sm">
                    {data.map((facet, index) => (
                         <Pressable key={index}
                                    onPress={() => updateValue(facet.value)}
                                    p="$0.5"
                                    py="$2">
                              {value === facet.value ? (
                                   <HStack space="sm" justifyContent="flex-start" alignItems="center">
                                        <Icon as={MaterialIcons} name="radio-button-checked" size="lg" color={theme.tokens.colors.primary['600']} />
                                        <Text color={textColor} ml="$2">
                                             {facet.display}
                                        </Text>
                                   </HStack>
                              ) : (
                                   <HStack space="sm" justifyContent="flex-start" alignItems="center">
                                        <Icon as={MaterialIcons} name="radio-button-unchecked" size="lg" color={theme.tokens.colors.primary['200']} />
                                        <Text color={textColor} ml="$2">
                                             {facet.display}
                                        </Text>
                                   </HStack>
                              )}
                         </Pressable>
                    ))}
               </VStack>
          );
     }

     return (
          <VStack space="sm">
               {data.map((facet, index) => (
                    <Pressable key={index} onPress={() => updateValue(facet.value)} p="$0.5" py="$2">
                         {value === facet.value ? (
                              <HStack space="sm" justifyContent="flex-start" alignItems="center">
                                   <Icon as={MaterialIcons} name="radio-button-checked" size="lg" color={theme.tokens.colors.primary['600']} />
                                   <Text color={textColor} ml="$2">
                                        {facet.display} ({facet.count})
                                   </Text>
                              </HStack>
                         ) : (
                              <HStack space="sm" justifyContent="flex-start" alignItems="center">
                                   <Icon as={MaterialIcons} name="radio-button-unchecked" size="lg" color={theme.tokens.colors.primary['200']} />
                                   <Text color={textColor} ml="$2">
                                        {facet.display} ({facet.count})
                                   </Text>
                              </HStack>
                         )}
                    </Pressable>
               ))}
          </VStack>
     );
};
