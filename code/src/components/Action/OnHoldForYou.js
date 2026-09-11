import React from 'react';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../themed/ThemedButton';
import { navigate, navigateStack } from '../../helpers/RootNavigator';
import { useTheme } from '../../themes/theme';

/**
 * OnHoldForYou component for displaying a button that navigates to the "My Holds" screen.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
export const OnHoldForYou = (props) => {
     const {  } = useTheme();
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
          <Button size="md" variant="solid" onPress={handleNavigation} colorScheme="primary" className="w-full mb-1">
               <ButtonText className="text-center">
                    {props.title}
               </ButtonText>
          </Button>
     );
};
