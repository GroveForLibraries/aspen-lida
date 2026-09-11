import moment from 'moment';
import React from 'react';
import { ThemedBadge as Badge, ThemedBadgeText as BadgeText } from '../components/themed/ThemedBadge';
import { Box } from '@/components/ui/box';
import { ThemedActionsheetItemText as ActionsheetItemText } from '../components/themed/ThemedActionsheet';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { useUserState } from '../hooks/useUserData';
import { useLibrary } from '../hooks/useLibrarySystemData';
import { getTermFromDictionary, getTranslationWithValuesText } from '../translations/TranslationService';
import { useActiveLanguage } from '../hooks/useLanguageData';
import { useTheme } from '../themes/theme';

/**
 * isOverdue component for displaying an overdue badge if the item is overdue.
 * @param overdue
 * @returns {React.JSX.Element|null}
 */
export const isOverdue = (overdue) => {
     const language = useActiveLanguage();
     if (overdue) {
          return (
               <Badge colorScheme="error" className="mt-[-8px] self-start rounded">
                    <BadgeText colorScheme="error">
                         {getTermFromDictionary(language, 'checkout_overdue')}
                    </BadgeText>
               </Badge>
          );
     } else {
          return null;
     }
};

/**
 * getTitle component for displaying the title of an item, with formatting to remove any trailing slashes.
 * @param title
 * @returns {React.JSX.Element}
 */
export const getTitle = (title) => {
     const {} = useTheme();
     if (title) {
          let displayTitle = title;
          const countSlash = displayTitle.split('/').length - 1;
          if (countSlash > 0) {
               displayTitle = displayTitle.substring(0, displayTitle.lastIndexOf('/'));
          }
          return (
               <Text
                    bold
                    size="sm"
                    className="mb-1 pr-3 max-w-full">
                    {displayTitle}
               </Text>
          );
     } else {
          return (
               <Text
                    bold
                    size="sm"
                    className="mb-1 pr-3 max-w-full">
                    Title Not Available
               </Text>
          );
     }
};

/**
 * getCleanTitle function for returning a cleaned-up version of the title, removing any trailing slashes.
 * @param title
 * @returns {string}
 */
export function getCleanTitle(title) {
     if (title) {
          let displayTitle = title;
          const countSlash = displayTitle.split('/').length - 1;
          if (countSlash > 0) {
               displayTitle = displayTitle.substring(0, displayTitle.lastIndexOf('/'));
          }
          return displayTitle;
     }
     return 'Unknown';
}

/**
 * getCallNumber component for displaying the call number of an item, if available.
 * @param callNumber
 * @returns {React.JSX.Element|null}
 */
export const getCallNumber = (callNumber) => {
     const {} = useTheme();
     const language = useActiveLanguage();
     if (callNumber) {
          return (
               <Text size="xs">
                    <Text bold size="xs">
                         {getTermFromDictionary(language, 'call_number')}:
                    </Text>
                    {' '}{callNumber}
               </Text>
          );
     }
     return null;
}

/**
 * getVolume component for displaying the volume of an item, if available.
 * @param volume
 * @returns {React.JSX.Element|null}
 */
export const getVolume = (volume) => {
     const {} = useTheme();
     const language = useActiveLanguage();
     if (volume) {
          return (
               <Text size="xs">
                    <Text bold size="xs">
                         {getTermFromDictionary(language, 'volume')}:
                    </Text>
                    {' '}{volume}
               </Text>
          );
     }
     return null;
}

/**
 * getVolume component for displaying the volume of an item, if available.
 * @param author
 * @returns {React.JSX.Element|null}
 */
export const getAuthor = (author) => {
     const {} = useTheme();
     const language = useActiveLanguage();
     if (author) {
          let displayAuthor = author;
          const countComma = displayAuthor.split(',').length - 1;
          if (countComma > 1) {
               displayAuthor = displayAuthor.substring(0, displayAuthor.lastIndexOf(','));
          }

          return (
               <Text size="xs">
                    <Text bold size="xs">
                         {getTermFromDictionary(language, 'author')}:
                    </Text>
                    {' '}{displayAuthor}
               </Text>
          );
     }
     return null;
};

/**
 * getFormat component for displaying the format of an item, along with its source if available.
 * @param format
 * @param source
 * @returns {React.JSX.Element|null}
 */
export const getFormat = (format, source = null) => {
     const language = useActiveLanguage();
     const library = useLibrary();
     const {} = useTheme();
     if (format && format !== 'Unknown') {
          if (source) {
               if (source !== 'ils') {
                    if (source === 'interlibrary_loan') {
                         source = getTermFromDictionary(language, 'interlibrary_loan');
                    } else if (source === 'axis360') {
                         source = getTermFromDictionary(language, 'boundless');
                    } else if (source === 'cloudlibrary') {
                         source = getTermFromDictionary(language, 'cloud_library');
                    } else if (source === 'hoopla') {
                         source = getTermFromDictionary(language, 'hoopla');
                    } else if (source === 'overdrive') {
                         if (library.libbyReaderName) {
                              source = library.libbyReaderName;
                         } else {
                              source = getTermFromDictionary(language, 'libby');
                         }
                    } else if (source === 'palace_project') {
                         source = getTermFromDictionary(language, 'palace_project');
                    }
                    return (
                         <Text size="xs">
                              <Text bold size="xs">
                                   {getTermFromDictionary(language, 'format')}:
                              </Text>
                              {' '}{format !== '' ? format : 'Unknown'} - {source}
                         </Text>
                    );
               }
          }
          return (
               <Text size="xs">
                    <Text bold size="xs">
                         {getTermFromDictionary(language, 'format')}:
                    </Text>
                    {' '}{format}
               </Text>
          );
     } else {
          return null;
     }
};

/**
 * getBadge component for displaying a badge based on the status, frozen state, availability, source, and status message of an item.
 * @param status
 * @param frozen
 * @param available
 * @param source
 * @param statusMessage
 * @returns {React.JSX.Element|null}
 */
export const getBadge = (status, frozen, available, source, statusMessage) => {
     const language = useActiveLanguage();
     if (frozen) {
          if (statusMessage) {
               return (
                    <Badge colorScheme="warning" className="mt-[-2px] self-start rounded">
                         <BadgeText colorScheme="warning">
                              {statusMessage}
                         </BadgeText>
                    </Badge>
               );
          }
          return (
               <Badge colorScheme="warning" className="mt-[-2px] self-start rounded">
                    <BadgeText colorScheme="warning">
                         {status}
                    </BadgeText>
               </Badge>
          );
     } else if (available) {
          let message = getTermFromDictionary(language, 'overdrive_hold_ready');
          if (source === 'ils') {
               message = status;
          }
          return (
               <Badge colorScheme="success" className="mt-[-2px] self-start rounded">
                    <BadgeText colorScheme="success">
                         {message}
                    </BadgeText>
               </Badge>
          );
     } else {
          if (status) {
               return (
                    <Badge colorScheme="warning" className="mt-[-2px] self-start rounded">
                         <BadgeText colorScheme="warning">
                              {status}
                         </BadgeText>
                    </Badge>
               );
          }
     }
     return null;
};

/**
 * getType component for displaying the type of an item, with translations for specific types.
 * @param type
 * @returns {React.JSX.Element|null}
 */
export const getType = (type) => {
     const language = useActiveLanguage();
     const {} = useTheme();
     if (type && type !== 'ils') {
          if (type === 'interlibrary_loan') {
               type = getTermFromDictionary(language, 'interlibrary_loan');
          } else if (type === 'axis360') {
               type = getTermFromDictionary(language, 'axis360');
          } else if (type === 'cloudlibrary') {
               type = getTermFromDictionary(language, 'cloud_library');
          } else if (type === 'hoopla') {
               type = getTermFromDictionary(language, 'hoopla');
          } else if (type === 'overdrive') {
               type = getTermFromDictionary(language, 'overdrive');
          } else if (type === 'palace_project') {
               type = getTermFromDictionary(language, 'palace_project');
          }

          return (
               <Text size="xs">
                    <Text bold size="xs">
                         {getTermFromDictionary(language, 'hold_source')}:
                    </Text>
                    {' '}{type}
               </Text>
          );
     } else {
          return null;
     }
};

/**
 * getOnHoldFor component for displaying the user for whom an item is on hold, if available.
 * @param user
 * @returns {React.JSX.Element|null}
 */
export const getOnHoldFor = (user) => {
     const language = useActiveLanguage();
     const {} = useTheme();
     if (user) {
          return (
               <Text size="xs">
                    <Text bold size="xs">
                         {getTermFromDictionary(language, 'on_hold_for')}:
                    </Text>
                    {' '}{user}
               </Text>
          );
     }
     return null;
};

/**
 * getCheckedOutTo component for displaying the user to whom an item is checked out, if available and different from the current user.
 * @param props
 * @returns {React.JSX.Element|null}
 */
export const getCheckedOutTo = (props) => {
     const language = useActiveLanguage();
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const [checkedOutTo] = React.useState();
     const {} = useTheme();
     if (user.id !== checkedOutTo) {
          return (
               <Text size="xs">
                    <Text bold size="xs">
                         {getTermFromDictionary(language, 'checked_out_to')}:
                    </Text>
                    {' '}{props}
               </Text>
          );
     } else {
          return null;
     }
};

/**
 * getDueDate component for displaying the due date of an item, if available and not zero.
 * @param date
 * @returns {React.JSX.Element|null}
 */
export const getDueDate = (date) => {
     const language = useActiveLanguage();
     const {} = useTheme();
     if (date && date !== 0) {
          //offset is in minutes we multiply 60 to get seconds
          const timezoneOffset = new Date().getTimezoneOffset() * 60;
          const dueDate = moment.unix(date - timezoneOffset);
          const itemDueOn = moment(dueDate).format('MMM D, YYYY');
          return (
               <Text size="xs">
                    <Text bold size="xs">
                         {getTermFromDictionary(language, 'checkout_due')}:
                    </Text>
                    {' '}{itemDueOn}
               </Text>
          );
     }

     return null;
};

/**
 * getDateLastUsed component for displaying the last used date of an item, if available and not zero, or indicating if the item is currently checked out.
 * @param date
 * @param checkedOut
 * @returns {React.JSX.Element|null}
 */
export const getDateLastUsed = (date, checkedOut) => {
     const language = useActiveLanguage();
     const {} = useTheme();
     if (date && date !== 0) {
          const dateLastUsed = moment.unix(date);
          let itemLastUsedOn = moment(dateLastUsed).format('MMM D, YYYY');
          if (checkedOut) {
               itemLastUsedOn = getTermFromDictionary(language, 'in_use');
          }
          return (
               <Text size="xs">
                    <Text bold size="xs">
                         {getTermFromDictionary(language, 'last_used')}:
                    </Text>
                    {' '}{itemLastUsedOn}
               </Text>
          );
     }

     return null;
};

/**
 * willAutoRenew component for displaying the auto-renewal information of an item, if applicable.
 * @param props
 * @returns {React.JSX.Element|null}
 */
export const willAutoRenew = (props) => {
     const language = useActiveLanguage();
     const {} = useTheme();
     if (props.autoRenew === 1 || props.autoRenew === '1') {
          return (
               <Box style={{ marginTop: 1, padding: 2, backgroundColor: '#f5f5f5' }}>
                    <Text size="xs">
                         <Text bold size="xs">
                              {getTermFromDictionary(language, 'if_eligible_auto_renew')}:
                         </Text>
                         {' '}{props.renewalDate}
                    </Text>
               </Box>
          );
     } else {
          return null;
     }
};

/**
 * getPickupLocation component for displaying the pickup location of an item, if available and the source is 'ils'.
 * @param location
 * @param source
 * @returns {React.JSX.Element|null}
 */
export const getPickupLocation = (location, source) => {
     const language = useActiveLanguage();
     const {} = useTheme();
     if (location && source === 'ils') {
          return (
               <Text size="xs">
                    <Text bold size="xs">
                         {getTermFromDictionary(language, 'hold_pickup_at')}:
                    </Text>
                    {' '}{location}
               </Text>
          );
     } else {
          return null;
     }
};

/**
 * getOutOfHoldGroupMessage component for displaying a message when an item is out of the hold group, if available.
 * @param outOfHoldGroupMessage
 * @returns {React.JSX.Element|null}
 */
export const getOutOfHoldGroupMessage = (outOfHoldGroupMessage) => {
     const language = useActiveLanguage();
     const {} = useTheme();
     if (outOfHoldGroupMessage) {
          return (
               <Text size="xs">
                    <Text bold size="xs">
                         {getTermFromDictionary(language, 'interlibrary_loan')}:
                    </Text>
                    {' '}{outOfHoldGroupMessage}
               </Text>
          );
     } else {
          return null;
     }
}

/**
 * getPosition component for displaying the position of an item in the hold queue, if applicable.
 * @param position
 * @param available
 * @param length
 * @param holdPosition
 * @param usesHoldPosition
 * @param outOfHoldGroupMessage
 * @returns {React.JSX.Element|null}
 */
export const getPosition = (position, available, length, holdPosition, usesHoldPosition, outOfHoldGroupMessage) => {
     const language = useActiveLanguage();
     const {} = useTheme();
     if (!outOfHoldGroupMessage && position && !available && position !== 0 && position !== '0') {
          if (length && usesHoldPosition) {
               return (
                    <Text size="xs">
                         <Text bold size="xs">
                              {getTermFromDictionary(language, 'hold_position')}:
                         </Text>
                         {' '}{holdPosition}
                    </Text>
               );
          }
          return (
               <Text size="xs">
                    <Text bold size="xs">
                         {getTermFromDictionary(language, 'hold_position')}:
                    </Text>
                    {' '}{position}
               </Text>
          );
     } else {
          return null;
     }
};

/**
 * getExpirationDate component for displaying the expiration date of an item, if available.
 * @param expiration
 * @param available
 * @returns {React.JSX.Element|null}
 */
export const getExpirationDate = (expiration, available) => {
     const language = useActiveLanguage();
     const {} = useTheme();
     if (expiration && available) {
          const expirationDateUnix = moment.unix(expiration);
          let expirationDate = moment(expirationDateUnix).format('MMM D, YYYY');
          return (
               <Text size="xs">
                    <Text bold size="xs">
                         {getTermFromDictionary(language, 'hold_pickup_by')}:
                    </Text>
                    {' '}{expirationDate}
               </Text>
          );
     } else {
          return null;
     }
};

/**
 * getRenewalCount component for displaying the renewal count of an item, if available.
 * @param count
 * @param available
 * @returns {React.JSX.Element|null}
 */
export const getRenewalCount = (count, available = null) => {
     const language = useActiveLanguage();
     const {} = useTheme();
     if (available) {
          return (
               <Text size="xs">
                    <Text bold size="xs">
                         {getTermFromDictionary(language, 'checkout_renewed')}:
                    </Text>
                    {' '}{count} of {available} times
               </Text>
          );
     } else {
          return null;
     }
};

/**
 * getCollectionName component for displaying the collection name of an item, if the source is 'overdrive' and a collection name is provided.
 * @param source
 * @param collectionName
 * @returns {React.JSX.Element|null}
 */
export const getCollectionName = (source, collectionName = null) => {
	const language = useActiveLanguage();
     const {} = useTheme();
	if (source === 'overdrive' && collectionName) {
		return (
		     <Text size="xs">
                    <Text bold size="xs">
                         {getTermFromDictionary(language, 'collection')}:
                    </Text>
                    {' '}{collectionName}
               </Text>
		);
	} else {
		return null;
	}
}

/**
 * CheckoutAccessLabel component for displaying the access label for a checkout, based on its source and other properties.
 * @param param0
 * @param param0.checkout
 * @param param0.language
 * @param param0.baseUrl
 * @param param0.libbyReaderName
 * @param param0.color
 * @returns {React.JSX.Element}
 * @constructor
 */
export const CheckoutAccessLabel = ({ checkout, language, baseUrl, libbyReaderName, color }) => {
     const [label, setLabel] = React.useState('...'); // Fallback / temporary loading text

     React.useEffect(() => {
          let active = true;

          async function fetchLabel() {
               if (!checkout?.checkoutSource) return;

               let translationKey = 'checkout_access_online';
               let dynamicValue = checkout.checkoutSource === 'Axis360' ? 'Boundless' : checkout.checkoutSource;

               if (checkout.checkoutSource === 'OverDrive') {
                    dynamicValue = libbyReaderName;
                    if (checkout.overdriveRead === 1) {
                         translationKey = 'checkout_read_online';
                    } else if (checkout.overdriveListen === 1) {
                         translationKey = 'checkout_listen_online';
                    } else if (checkout.overdriveVideo === 1) {
                         translationKey = 'checkout_watch_online';
                    } else if (checkout.overdriveMagazine === 1) {
                         translationKey = 'checkout_read_online';
                    }
               }

               try {
                    const term = await getTranslationWithValuesText(translationKey, dynamicValue, language, baseUrl, true);
                    if (active) {
                         setLabel(term);
                    }
               } catch (error) {
                    console.error("Failed to fetch checkout translation:", error);
               }
          }

          fetchLabel();

          // Cleanup function to prevent setting state on unmounted components
          return () => {
               active = false;
          };
     }, [checkout, language, baseUrl, libbyReaderName]);

     return <ActionsheetItemText style={{ color }}>{label}</ActionsheetItemText>;
};
