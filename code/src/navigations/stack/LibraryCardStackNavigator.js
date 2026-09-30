import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { MyAlternateLibraryCard } from '../../screens/MyAccount/MyLibraryCard/MyAlternateLibraryCard';
import { MyLibraryCard } from '../../screens/MyAccount/MyLibraryCard/MyLibraryCard';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import TitleWithLogo from '../../components/TitleWithLogo'

const Stack = createNativeStackNavigator();

/**
 * LibraryCardStackNavigator component that sets up a stack navigator for library card screens, including the main library card and an alternate library card screen.
 * @returns {React.JSX.Element}
 * @constructor
 */
const LibraryCardStackNavigator = () => {
     const language = useActiveLanguage();
     return (
          <Stack.Navigator
               initialRouteName={'LibraryCard'}
               screenOptions={{
                    headerShown: true,
                    headerBackButtonDisplayMode: 'minimal',
                    gestureEnabled: false,
               }}>
               <Stack.Screen
                    name="LibraryCard"
                    component={MyLibraryCard}
                    options={{
                         header: () => {
                              const title = getTermFromDictionary(language, 'library_card');
                              return <TitleWithLogo title={title} hideBack={true} />;
                         },
                         gestureEnabled: false,
                    }}
               />
               <Stack.Screen
                    name="MyAlternateLibraryCard"
                    component={MyAlternateLibraryCard}
                    options={{
                         header: () => {
                              const title = getTermFromDictionary(language, 'alternate_library_card');
                              return <TitleWithLogo title={title} hideBack={false} />;
                         },
                         gestureEnabled: false,
                    }}
               />
          </Stack.Navigator>
     );
};

export default LibraryCardStackNavigator;
