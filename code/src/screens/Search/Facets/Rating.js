import { MaterialIcons } from '@expo/vector-icons';
import { find } from '../../../helpers/helpers';
import { HStack, Icon, Pressable, Text, VStack } from '@gluestack-ui/themed';
import React from 'react';
import { ScrollView } from 'react-native';
import Stars from 'react-native-stars';

// custom components and helper files
import { LoadingSpinner } from '../../../components/loadingSpinner';
import { addAppliedFilter, removeAppliedFilter } from '../../../util/api/searchHelper';
import { useTheme } from '../../../themes/theme';


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
     const {theme, textColor, colorMode } = useTheme();

     React.useEffect(() => {
          setIsLoading(false);
          let initialValue = '';
          if (find(data, ['isApplied', true])) {
               const appliedFilterObj = find(data, ['isApplied', true]);
               initialValue = appliedFilterObj['value'];
          }
          setValue(initialValue);
     }, [data]);

     const getRatingCount = (star) => {
          let results = 0;
          if (find(data, ['value', star])) {
               results = find(data, ['value', star]);
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
               <VStack space="$2">
                    {stars.map((star, index) => (
                         <Pressable key={index} onPress={() => updateSearch(star.label)} p="$0.5" py="$2">
                              <HStack space="sm" justifyContent="flex-start" alignItems="center">
                                   {value === star.label ?
                                        <Icon as={MaterialIcons} name="radio-button-checked" size="lg" color={theme.tokens.colors.primary['600']} /> :
                                        <Icon as={MaterialIcons} name="radio-button-unchecked" size="lg" color={theme.tokens.colors.primary['200']} />
                                   }
                                   <Stars
                                        default={star.value}
                                        count={5}
                                        starSize={50}
                                        disabled
                                        fullStar={<Icon as={MaterialIcons} name="star" size="lg" color={theme['tokens']['colors']['yellow']['500']} />}
                                        emptyStar={<Icon as={MaterialIcons} name="star-border" size="lg" color={theme['tokens']['colors']['yellow']['500']} />}
                                   />
                                   <Text
                                        color={textColor}
                                        ml="$2"
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
