import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Pressable, Icon } from '@gluestack-ui/themed';
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';


import { useAccounts } from '../../hooks/useUserData';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { StartCheckOutSession } from '../../screens/SCO/StartCheckOutSession';
import { SelfCheckOut } from '../../screens/SCO/SelfCheckOut';
/*import { FinishCheckOutSession } from '../../screens/SCO/FinishSelfCheckoutSession';*/
import SelfCheckScanner from '../../screens/SCO/SelfCheckScanner';
import { useActiveLanguage } from '../../hooks/useLanguageData';

import TitleWithLogo from '../../components/TitleWithLogo'
import { useTheme } from '../../themes/theme';
import { ModalHeader } from '../../components/Headers/ModalHeader';

const Stack = createNativeStackNavigator();

const SelfCheckOutStackNavigator = () => {
     const language = useActiveLanguage();
     const { data: accounts } = useAccounts();
     const {textColor} = useTheme();
     const availableAccounts = Object.values(accounts ?? {});

     let defaultRoute = 'SelfCheckOut';
     if (availableAccounts.length >= 1) {
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
                         //title: getTermFromDictionary(language, 'self_checkout')
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
                         //title: getTermFromDictionary(language, 'self_checkout')
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
               {/*
               <Stack.Screen
                    name="FinishCheckOutSession"
                    component={FinishCheckOutSession}
                    options={{
                         header: () => {
                              const title = getTermFromDictionary(language, 'finish_checkout_session');
                              return <TitleWithLogo title={title} hideBack={true} />;
                         },
                         //title: getTermFromDictionary(language, 'finish_checkout_session')
                    }}
               />
               */}
          </Stack.Navigator>
     );
};

export default SelfCheckOutStackNavigator;
