import React from 'react';
import { ThemedCheckbox as Checkbox, ThemedCheckboxIcon as CheckboxIcon, ThemedCheckboxIndicator as CheckboxIndicator, ThemedCheckboxLabel as CheckboxLabel } from '../../../components/themed/ThemedCheckbox';
import { HStack } from '@/components/ui/hstack';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { logDebugMessage } from '@/src/util/logging';

/**
 * Facet_Checkbox component that renders a checkbox for a given facet option. It handles the checked state and updates the parent component when the checkbox is toggled.
 * @param param0
 * @param param0.data
 * @param param0.category
 * @param param0.values
 * @param param0.updateCheckboxFacet
 * @returns {React.JSX.Element}
 * @constructor
 */
export const Facet_Checkbox = ({ data, category, values = [], updateCheckboxFacet }) => {
     const isChecked = values.includes(data.value);
     const handleChange = (newValue) => {
          logDebugMessage("Clicked on " + data.value + " isChecked is " + isChecked + " newValue is " + newValue);
          updateCheckboxFacet(category, data.value, newValue);
     };

     return (
          <HStack className="items-center px-3 py-4">
               <Checkbox
                    value={data.value}
                    accessibilityLabel={data.display}
                    isChecked={isChecked}
                    onChange={(value) => {
                         handleChange(value);
                    }}>
                    <CheckboxIndicator>
                         {isChecked ? <CheckboxIcon /> : null}
                    </CheckboxIndicator>
                    <CheckboxLabel className="pl-2">
                         <Text>
                              {data.display}
                              {data.count ? ` (${data.count})` : ''}
                         </Text>
                    </CheckboxLabel>
               </Checkbox>
          </HStack>
     );
};
