import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../themed/ThemedButton';
import React from 'react';
import {navigate} from '@/src/helpers/RootNavigator';
import { useTheme } from '@/src/themes/theme';

/**
 * StartLocalIllRequestEmail component for displaying a button that navigates to the "Create Local ILL Request Email" screen.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
export const StartLocalIllRequestEmail = (props) => {
     const {  } = useTheme();
     //logDebugMessage("Props for StartLocalIllRequest");
     //logDebugMessage(props);
     const openLocalIllRequestEmail = () => {
          if (typeof props.onBeforeNavigate === 'function') {
               props.onBeforeNavigate();
          }
          navigate('CreateLocalIllRequestEmail', {
               id: props.record,
               workTitle: props.workTitle,
               workAuthor: props.workAuthor,
               volumeName: props.volumeName ?? null,
               recordId: props.recordId
          });
     };

     return (
          <Button
               size="md"
               variant="solid"
               colorScheme="primary" className="min-w-full max-w-full"
               onPress={openLocalIllRequestEmail}>
               <ButtonText className="text-center">
                    {props.title}
               </ButtonText>
          </Button>
     );
};
