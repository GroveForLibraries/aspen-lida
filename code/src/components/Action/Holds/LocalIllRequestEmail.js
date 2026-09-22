import {Button, ButtonText} from '@gluestack-ui/themed';
import React from 'react';
import {navigate} from '../../../helpers/RootNavigator';


import { useTheme } from '../../../themes/theme';

export const StartLocalIllRequestEmail = (props) => {
     const { theme } = useTheme();
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
               bgColor={theme.tokens.colors.primary['500']}
               variant="solid"
               minWidth="100%"
               maxWidth="100%"
               onPress={openLocalIllRequestEmail}>
               <ButtonText color={theme.tokens.colors.primary['500-text']} textAlign="center">
                    {props.title}
               </ButtonText>
          </Button>
     );
};
