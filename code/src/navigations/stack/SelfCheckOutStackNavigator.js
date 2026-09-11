import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { useAccounts } from '../../hooks/useUserData';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { StartCheckOutSession } from '../../screens/SCO/StartCheckOutSession';
import { SelfCheckOut } from '../../screens/SCO/SelfCheckOut';
import _ from 'lodash';
import SelfCheckScanner from '../../screens/SCO/SelfCheckScanner';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import TitleWithLogo from '../../components/TitleWithLogo'
import { useTheme } from '../../themes/theme';
import { ModalHeader } from '../../components/Headers/ModalHeader';

const Stack = createNativeStackNavigator();

/**
 * SelfCheckOutStackNavigator component that sets up a stack navigator for self-checkout screens, including starting a checkout session, the main self-checkout screen, and a scanner modal.
 * @returns {React.JSX.Element}
 * @constructor
 */
const SelfCheckOutStackNavigator = () => {
     const language = useActiveLanguage();
     const { data: accounts } = useAccounts();
     useTheme();

     let defaultRoute = 'SelfCheckOut';
     if (_.size(accounts) >= 1) {
          defaultRoute = 'StartCheckOutSession';
     }
     return (
          <Stack.Navigator
               initialRouteName={defaultRoute}
               screenOptions={({ navigation, route }) => ({
                    headerShown: true,
                    headerBackButtonDisplayMode: false,
                    gestureEnabled: false,
               })}>
               <Stack.Screen
                    name="StartCheckOutSession"
                    component={StartCheckOutSession}
                    options={{
                         header: () => {
                              const title = getTermFromDictionary(language, 'nav_discover');
                              return <TitleWithLogo title={title} />;
                         },
                    }}
                    initialParams={{ startNew: true }}
               />
               <Stack.Screen
                    name="SelfCheckOut"
                    component={SelfCheckOut}
                    options={({ navigation }) => ({
                         header: () => {
                              const title = getTermFromDictionary(language, 'self_checkout');
                              return <TitleWithLogo title={title} hideBack={true} />;
                         },
                    })}
                    initialParams={{ startNew: true }}
               />
               <Stack.Screen
                    name="SelfCheckOutScanner"
                    component={SelfCheckScanner}
                    options={({ navigation }) => ({
                         presentation: 'modal',
                         title: 'Scanner',
                         header: ({ navigation }) => (
                              <ModalHeader
                                   title={getTermFromDictionary(language, 'scanner')}
                                   onBack={() => navigation.goBack()}
                                   onClose={() => {
                                        const parent = navigation.getParent();
                                        if (parent?.canGoBack()) parent.goBack();
                                        else if (navigation.canGoBack()) navigation.goBack();
                                   }}
                                   showBack={false}
                                   showClose={true}
                              />
                         ),
                    })}
               />
          </Stack.Navigator>
     );
};

export default SelfCheckOutStackNavigator;
