import { ThemedMaterialIcons as MaterialIcons } from '@/src/components/themed/ThemedMaterialIcons';
import _ from 'lodash';
import React from 'react';
import { ThemedScrollView as ScrollView } from '@/src/components/themed/ThemedScrollView';
import Stars from 'react-native-stars';
import { LoadingSpinner } from '@/src/components/loadingSpinner';
import { addAppliedFilter, removeAppliedFilter } from '@/src/util/api/searchHelper';
import { useTheme } from '@/src/themes/theme';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { VStack } from '@/components/ui/vstack';

/**
 * Facet_Rating component that renders a list of rating options (from 1 to 5 stars and Unrated) for a given facet category. It manages the selected rating state, updates the applied filters, and triggers an update to the parent component when a rating is selected or deselected.
 * @param param0
 * @param param0.data
 * @param param0.category
 * @param param0.updater
 * @returns {React.JSX.Element}
 * @constructor
 */
export const Facet_Rating = ({ data, category, updater }) => {
     const [isLoading, setIsLoading] = React.useState(true);
     const [value, setValue] = React.useState('');
     const [stars] = React.useState([
          {
               label: 'fiveStar',
               value: '5' },
          {
               label: 'fourStar',
               value: '4' },
          {
               label: 'threeStar',
               value: '3' },
          {
               label: 'twoStar',
               value: '2' },
          {
               label: 'oneStar',
               value: '1' },
          {
               label: 'Unrated',
               value: '0' },
     ]);
     const { brand } = useTheme();
     const starColor = '#eab308';

     React.useEffect(() => {
          setIsLoading(false);
          let initialValue = '';
          if (_.find(data, ['isApplied', true])) {
               const appliedFilterObj = _.find(data, ['isApplied', true]);
               initialValue = appliedFilterObj['value'];
          }
          setValue(initialValue);
     }, [data]);

     const getRatingCount = (star) => {
          let results = 0;
          if (_.find(data, ['value', star])) {
               results = _.find(data, ['value', star]);
               results = results['count'];
          }
          return results;
     };

     const updateSearch = (star) => {
          if (star === value) {
               removeAppliedFilter(category, star);
               setValue('');
          } else {
               addAppliedFilter(category, star, false);
               setValue(star);
          }
          updater(category, star);
     };

     if (isLoading) {
          return <LoadingSpinner />;
     }

     return (
          <ScrollView>
               <VStack space="sm">
                    {stars.map((star, index) => (
                        <Pressable key={index} onPress={() => updateSearch(star.label)} className="p-[2px] py-2">
                             <HStack space="sm" className="justify-start items-center">
                                   {value === star.label ?
                                       <MaterialIcons name="radio-button-checked" size={20} color={brand.primary[600]} /> :
                                       <MaterialIcons name="radio-button-unchecked" size={20} color={brand.primary[200]} />
                                   }
                                   <Stars
                                        default={star.value}
                                        count={5}
                                        starSize={50}
                                        disabled
                                       fullStar={<MaterialIcons name="star" size={20} color={starColor} />}
                                       emptyStar={<MaterialIcons name="star-border" size={20} color={starColor} />}
                                   />
                                   <Text
                                       className="ml-2"
                                   >
                                       ({getRatingCount(star.label)})
                                   </Text>
                              </HStack>
                         </Pressable>
                    ))}
               </VStack>
          </ScrollView>
     );
};
