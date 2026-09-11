import React from "react";
import { Box } from '@/components/ui/box';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import {getTermFromDictionary} from '@/src/translations/TranslationService';
import { useActiveLanguage } from '@/src/hooks/useLanguageData';

/**
 * Profile_Identity component that displays the identity information of a user profile, including first name and last name. It uses the active language for translations.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
const Profile_ContactInformation = (props) => {
    const language = useActiveLanguage();
  return (
    <Box className="py-5">
      <Text bold>{getTermFromDictionary(language, 'patron_primary_phone')}</Text>
      <Text>{props.phone}</Text>
      <Text bold className="mt-2">
          {getTermFromDictionary(language, 'patron_email')}
      </Text>
      <Text>{props.email}</Text>
    </Box>
  );
};

export default Profile_ContactInformation;
