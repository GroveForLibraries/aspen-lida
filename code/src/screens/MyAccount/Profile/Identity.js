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
const Profile_Identity = (props) => {
    const language = useActiveLanguage();
  return (
    <Box className="pb-5">
      <Text bold>{getTermFromDictionary(language, 'patron_full_name')}</Text>
      <Text>{props.firstName} {props.lastName}</Text>
    </Box>
  );
};

export default Profile_Identity;
