import { Button, ButtonText } from '@gluestack-ui/themed';
import React from 'react';


// custom components and helper files
import { navigate, navigateStack } from '../../helpers/RootNavigator';
import { useTheme } from '../../themes/theme';

export const OnHoldForYou = (props) => {
     const { theme } = useTheme();
     const handleNavigation = () => {
          if (typeof props.onBeforeNavigate === 'function') {
               props.onBeforeNavigate();
          }
          if (props.prevRoute === 'DiscoveryScreen' || props.prevRoute === 'SearchResults' || props.prevRoute === 'HomeScreen') {
               navigateStack('AccountScreenTab', 'MyHolds', {});
          } else {
               navigate('MyHolds', {});
          }
     };

     return (
          <Button minWidth="100%" maxWidth="100%" mb="$1" size="md" bgColor={theme.tokens.colors.primary['500']} variant="solid" onPress={handleNavigation}>
               <ButtonText textAlign="center" p="$0" color={theme.tokens.colors.primary['500-text']}>
                    {props.title}
               </ButtonText>
          </Button>
     );
};
