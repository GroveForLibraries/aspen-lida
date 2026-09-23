import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../themed/ThemedButton';
import React from 'react';
import {navigate} from '@/src/helpers/RootNavigator';
import { useTheme } from '@/src/themes/theme';

/**
 * StartLocalIllRequest component for displaying a button that navigates to the "Create Local ILL Request" screen.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
export const StartLocalIllRequest = (props) => {
     const openLocalIllRequest = () => {
          if (typeof props.onBeforeNavigate === 'function') {
               props.onBeforeNavigate();
          }
          navigate('CreateLocalIllRequest', {
               id: props.record,
               workTitle: props.workTitle,
               volumeId: props.volumeId ?? null,
               volumeName: props.volumeName ?? null
          });
     };
     const {  } = useTheme();

     return (
          <Button
               size="md"
               variant="solid"
               colorScheme="primary" className="min-w-full max-w-full"
               onPress={openLocalIllRequest}>
               <ButtonText className="text-center">
                    {props.title}
               </ButtonText>
          </Button>
     );
};
