import React from 'react';
import {isEmpty, isUndefined} from 'lodash';
import { Center } from '@/components/ui/center';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { HStack } from '@/components/ui/hstack';
import { Spinner } from '@/components/ui/spinner';
import { VStack } from '@/components/ui/vstack';
import { logDebugMessage } from '../util/logging.js';
import { useTheme } from '../themes/theme';
/*
TODO: Translate the accessibility labels
*/

/**
 * Displays a loading spinner with an optional message.
 * @param message
 * @returns {React.JSX.Element}
 */
export function loadingSpinner(message = '') {
     return <LoadingSpinner message={message} />;
}

/**
 * LoadingSpinner component for displaying a loading spinner with an optional message.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
export const LoadingSpinner = (props) => {
     const { brand } = useTheme();
     if (!isUndefined(props) && !isEmpty(props) && !isUndefined(props.message) && !isEmpty(props.message)) {
          logDebugMessage("Showing loading spinner with message: " + props.message);
          return (
               <Center className="flex-1 px-3">
                    <VStack space="md" className="items-center">
                         <Spinner size="large" color={brand.primary[500]} accessibilityLabel="Loading..." />
                         <Heading size="md">
                              {props.message}
                         </Heading>
                    </VStack>
               </Center>
          );
     }

     return (
          <Center className="flex-1">
               <HStack>
                    <Spinner color={brand.primary[500]} size="large" accessibilityLabel="Loading..." />
               </HStack>
          </Center>
     );
};
