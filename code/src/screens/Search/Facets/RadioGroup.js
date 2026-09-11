import { ThemedMaterialIcons as MaterialIcons } from '@/src/components/themed/ThemedMaterialIcons';
import _ from 'lodash';
import React from 'react';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { VStack } from '@/components/ui/vstack';
import { SearchGlobal } from '@/src/util/globals';
import { logDebugMessage } from '@/src/util/logging';
import { addAppliedFilter, removeAppliedFilter } from '@/src/util/api/searchHelper';
import { useTheme } from '@/src/themes/theme';

/**
 * Facet_RadioGroup component that renders a group of radio buttons for a given facet category. It manages the selected value state, updates the applied filters, and triggers an update to the parent component when a radio button is selected or deselected.
 * @param param0
 * @param param0.title
 * @param param0.data
 * @param param0.category
 * @param param0.updater
 * @param param0.applied
 * @returns {React.JSX.Element}
 * @constructor
 */
export const Facet_RadioGroup = ({ title, data, category, updater, applied }) => {
     const [value, setValue] = React.useState('');
     const { brand } = useTheme();

     React.useEffect(() => {
          const facets = data;
          if (_.isObject(facets)) {
               const facet = _.filter(facets, 'isApplied');
               if (!_.isEmpty(facet)) {
                    setValue(facet[0]['value'] ?? '');
               }
          }
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
                         <Pressable key={index} onPress={() => updateValue(facet.value)} className="py-2 px-[2px]">
                              {value === facet.value ? (
                                   <HStack space="sm" justifyContent="flex-start" alignItems="center">
                                        <MaterialIcons name="radio-button-checked" size={20} color={brand.primary[500]} />
                                        <Text className="ml-2">
                                             {facet.display}
                                        </Text>
                                   </HStack>
                              ) : (
                                   <HStack space="sm" justifyContent="flex-start" alignItems="center">
                                        <MaterialIcons name="radio-button-unchecked" size={20} color={brand.primary[500]} />
                                        <Text className="ml-2">
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
                    <Pressable key={index} onPress={() => updateValue(facet.value)} className="py-2 px-[2px]">
                         {value === facet.value ? (
                              <HStack space="sm" justifyContent="flex-start" alignItems="center">
                                   <MaterialIcons name="radio-button-checked" size={20} color={brand.primary[500]} />
                                   <Text className="ml-2">
                                        {facet.display} ({facet.count})
                                   </Text>
                              </HStack>
                         ) : (
                              <HStack space="sm" justifyContent="flex-start" alignItems="center">
                                   <MaterialIcons name="radio-button-unchecked" size={20} color={brand.primary[500]} />
                                   <Text className="ml-2">
                                        {facet.display} ({facet.count})
                                   </Text>
                              </HStack>
                         )}
                    </Pressable>
               ))}
          </VStack>
     );
};
