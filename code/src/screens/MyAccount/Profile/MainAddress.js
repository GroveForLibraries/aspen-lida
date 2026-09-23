import React from "react";
import { Box } from '@/components/ui/box';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import {getTermFromDictionary} from '@/src/translations/TranslationService';
import { useActiveLanguage } from '@/src/hooks/useLanguageData';

/**
 * Profile_MainAddress component that displays the main address information of a user profile, including address, city, state, and zip code. It uses the active language for translations.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
const Profile_MainAddress = (props) => {
    const language = useActiveLanguage();
  return (
    <Box className="py-5">
      <Text bold>{getTermFromDictionary(language, 'patron_address')}</Text>
      <Text>{props.address}</Text>
      <Text bold className="mt-2">
          {getTermFromDictionary(language, 'patron_city')}
      </Text>
      <Text>{props.city}</Text>
      <Text bold className="mt-2">
          {getTermFromDictionary(language, 'patron_state')}
      </Text>
      <Text>{props.state}</Text>
      <Text bold className="mt-2">
          {getTermFromDictionary(language, 'patron_zip')}
      </Text>
      <Text>{props.zipCode}</Text>
    </Box>
  );
};

export default Profile_MainAddress;
