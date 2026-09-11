import React from 'react';
import { Center, Heading, HStack, VStack, Spinner } from '@gluestack-ui/themed';

import { logDebugMessage } from '../util/logging.js';
import { useTheme } from '../themes/theme';
/*
TODO: Translate the accessibility labels
*/

export function loadingSpinner(message = '') {
     return <LoadingSpinner message={message} />;
}

export const LoadingSpinner = (props) => {
     const { theme, textColor } = useTheme();
     const message = props?.message;

     if (message !== undefined && message !== null && message !== '') {
          logDebugMessage("Showing loading spinner with message: " + message);
          return (
               <Center flex={1} px="$3">
                    <VStack space="md" alignItems="center">
                         <Spinner size="large" color={theme.tokens?.colors.primary['500']} accessibilityLabel="Loading..." />
                         <Heading size="md" color={textColor}>
                              {message}
                         </Heading>
                    </VStack>
               </Center>
          );
     }

     return (
          <Center flex={1}>
               <HStack>
                    <Spinner color={theme.tokens?.colors.primary['500']} size="large" accessibilityLabel="Loading..." />
               </HStack>
          </Center>
     );
};
