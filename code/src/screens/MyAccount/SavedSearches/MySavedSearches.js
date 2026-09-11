import React from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { FlatList } from 'react-native';
import { ThemedBadge as Badge, ThemedBadgeText as BadgeText } from '@/src/components/themed/ThemedBadge';
import { Box } from '@/components/ui/box';
import { Center } from '@/components/ui/center';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { VStack } from '@/components/ui/vstack';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { loadingSpinner } from '@/src/components/loadingSpinner';
import { SystemMessagesContext } from '@/src/context/initialContext';
import { useSavedSearches, useUpdateSavedSearches } from '@/src/hooks/useUserData';
import { fetchSavedSearches } from '@/src/util/api/list';
import { loadError } from '@/src/components/loadError';
import { getTermFromDictionary } from '@/src/translations/TranslationService';
import { navigateStack } from '@/src/helpers/RootNavigator';
import { DisplaySystemMessage } from '@/src/components/Notifications';
import { logDebugMessage, logErrorMessage, getErrorMessage } from '@/src/util/logging';
import { useActiveLanguage } from '@/src/hooks/useLanguageData';
import { useTheme } from '@/src/themes/theme';
import { useLibrary } from '@/src/hooks/useLibrarySystemData';

/**
 * MySavedSearches component that displays a list of saved searches for the user. It fetches the saved searches from the API and renders them in a FlatList. It also handles system messages, loading states, and error states.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const MySavedSearches = () => {
     const navigation = useNavigation();
     const [isFetching, setIsFetching] = React.useState(false);
     const [fetchError, setFetchError] = React.useState(null);
     const { data: savedSearches } = useSavedSearches();
     const updateSavedSearches = useUpdateSavedSearches();
     const library = useLibrary();
     const language = useActiveLanguage();

     const { systemMessages, updateSystemMessages } = React.useContext(SystemMessagesContext);

     React.useLayoutEffect(() => {
          navigation.setOptions({
               headerLeft: () => <Box /> });
     }, [navigation]);

     useFocusEffect(
          React.useCallback(() => {
               const loadSavedSearchesIfNeeded = async () => {
                    if (Array.isArray(savedSearches) && savedSearches.length > 0) {
                         return;
                    }
                    setIsFetching(true);
                    setFetchError(null);
                    try {
                         const data = await fetchSavedSearches(library.baseUrl);
                         if (data.ok) {
                              await updateSavedSearches(data.data.result?.searches ?? []);
                         } else {
                              logDebugMessage('Error fetching saved searches for user');
                              logDebugMessage(data);
                              getErrorMessage(data.code, data.problem);
                         }
                    } catch (error) {
                         logDebugMessage('Error fetching saved searches for user');
                         logErrorMessage(error);
                         setFetchError(error);
                    } finally {
                         setIsFetching(false);
                    }
               };

               loadSavedSearchesIfNeeded();
          }, [savedSearches, library.baseUrl, updateSavedSearches])
     );

     const Empty = () => {
          return (
               <Center className="mt-5 mb-5">
                   <Text bold size="lg">
                         {getTermFromDictionary(language, 'saved_searches_empty')}
                    </Text>
               </Center>
          );
     };

     const showSystemMessage = () => {
          if (Array.isArray(systemMessages)) {
               return systemMessages.map((obj, index) => {
                    if (obj.showOn === '0' || obj.showOn === '1') {
                         return <DisplaySystemMessage key={obj.id || index} style={obj.style} message={obj.message} dismissable={obj.dismissable} id={obj.id} all={systemMessages} url={library.baseUrl} updateSystemMessages={updateSystemMessages} />;
                    }
               });
          }
          return null;
     };

     return (
          <ScreenContainer>
               <Box>
                    {showSystemMessage()}
                    {isFetching && (!savedSearches || savedSearches.length === 0) ? (
                         loadingSpinner()
                    ) : fetchError ? (
                         loadError('Error', '')
                    ) : (
                         <>
                              <FlatList data={savedSearches} ListEmptyComponent={Empty} renderItem={({ item }) => <Item data={item} />} keyExtractor={(item, index) => index.toString()} contentContainerStyle={{ paddingBottom: 30 }} />
                         </>
                    )}
               </Box>
          </ScreenContainer>
     );
};

/**
 * Item component that renders a single saved search item. It displays the title, creation date, and a badge if there are new results. When pressed, it navigates to the MySavedSearch screen with the item's details.
 * @param data
 * @returns {React.JSX.Element}
 * @constructor
 */
const Item = (data) => {
     const language = useActiveLanguage();
     const item = data.data;
     const { neutrals } = useTheme();
     const borderColor = neutrals.border;

     let hasNewResults = 0;
     if (item?.hasNewResults !== undefined) {
          hasNewResults = item.hasNewResults;
     }

     const openSavedSearch = () => {
          navigateStack('AccountScreenTab', 'MySavedSearch', {
               id: item.id,
               details: item,
               title: item.title });
     };

     return (
          <Pressable
               onPress={() => {
                    openSavedSearch();
               }}
               className="px-1 py-2"
               style={{ borderBottomWidth: 1, borderColor }}>
               <HStack space="md" className="justify-start">
                    <VStack space="sm">{/*<Image source={{uri: item.cover}} alt={item.title} size="lg" resizeMode="contain" />*/}</VStack>
                    <VStack space="sm" className="justify-between max-w-[80%]">
                         <Box>
                              <Text bold size="md">
                                   {item.title}{' '}
                                   {hasNewResults === 1 ? (
                                        <Badge colorScheme="warning" className="mb-[-2px]">
                                             <BadgeText colorScheme="warning">{getTermFromDictionary(language, 'flag_updated')}</BadgeText>
                                        </Badge>
                                   ) : null}
                              </Text>
                              <Text size="xs" italic>
                                   Created on {item.created}
                              </Text>
                         </Box>
                    </VStack>
               </HStack>
          </Pressable>
     );
};
