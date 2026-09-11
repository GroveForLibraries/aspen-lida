import React from 'react';
import { HStack } from '@/components/ui/hstack';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { LanguageSwitcher } from '@/src/translations/TranslationService';
import { ScreenContainer } from '@/src/components/ScreenContainer';

/**
 * Settings_LanguageScreen component that renders the language settings screen, allowing users to switch between different languages using the LanguageSwitcher component.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const Settings_LanguageScreen = () => {
     return (
          <ScreenContainer className="py-5">
               <HStack justifyContent="space-between" alignItems="center">
                    <Text bold>Language</Text>
                    <LanguageSwitcher />
               </HStack>
          </ScreenContainer>
     );
};
