import { Badge, BadgeText, Box, Center, FlatList, Pressable, Text, HStack, VStack } from '@gluestack-ui/themed';
import React from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

// custom components and helper files
import { loadingSpinner } from '../../../components/loadingSpinner';
import { SystemMessagesContext } from '../../../context/initialContext';
import { useSavedSearches, useUpdateSavedSearches } from '../../../hooks/useUserData';
import { fetchSavedSearches } from '../../../util/api/list';
import { loadError } from '../../../components/loadError';
import { getTermFromDictionary } from '../../../translations/TranslationService';
import { navigateStack } from '../../../helpers/RootNavigator';
import { DisplaySystemMessage } from '../../../components/Notifications';
import { logDebugMessage, logErrorMessage, getErrorMessage } from '../../../util/logging';
import { useActiveLanguage } from '../../../hooks/useLanguageData';
import { useTheme } from '../../../themes/theme';
import { useLibrary } from '../../../hooks/useLibrarySystemData';

export const MySavedSearches = () => {
     const navigation = useNavigation();
     const [isFetching, setIsFetching] = React.useState(false);
     const [fetchError, setFetchError] = React.useState(null);
     const hasFetchedSavedSearchesRef = React.useRef(false);
     const isFetchingSavedSearchesRef = React.useRef(false);
     const { data: savedSearches } = useSavedSearches();
     const updateSavedSearches = useUpdateSavedSearches();
     const library = useLibrary();
     const language = useActiveLanguage();
     const { textColor } = useTheme();

     const { systemMessages, updateSystemMessages } = React.useContext(SystemMessagesContext);

     React.useLayoutEffect(() => {
          navigation.setOptions({
               headerLeft: () => <Box /> });
     }, [navigation]);

     useFocusEffect(
          React.useCallback(() => {
               const loadSavedSearchesIfNeeded = async () => {
                    if (hasFetchedSavedSearchesRef.current || isFetchingSavedSearchesRef.current) {
                         return;
                    }

                    if (Array.isArray(savedSearches) && savedSearches.length > 0) {
                         hasFetchedSavedSearchesRef.current = true;
                          return;
                    }

                    isFetchingSavedSearchesRef.current = true;
                     setIsFetching(true);
                     setFetchError(null);
                     try {
                          const data = await fetchSavedSearches(library.baseUrl);
                          if (data.ok) {
                               await updateSavedSearches(data.data.result?.searches ?? []);
                               hasFetchedSavedSearchesRef.current = true;
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
                          isFetchingSavedSearchesRef.current = false;
                          setIsFetching(false);
                     }
                };

                loadSavedSearchesIfNeeded();
           }, [savedSearches, library.baseUrl, updateSavedSearches])
      );

     const Empty = () => {
          return (
               <Center mt={5} mb={5}>
                    <Text bold fontSize="$lg" color={textColor}>
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
          <Box style={{ flex: 1 }}>
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
          </Box>
     );
};

const Item = (data) => {
     const language = useActiveLanguage();
     const item = data.data;
     const { textColor, colorMode } = useTheme();

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
               borderBottomWidth="$1"
               borderColor={colorMode === 'light' ? "$coolGray200" : "$warmGray600"}
               px="$1"
               py="$2">
               <HStack space="md" justifyContent="flex-start">
                    <VStack space="sm">{/*<Image source={{uri: item.cover}} alt={item.title} size="lg" resizeMode="contain" />*/}</VStack>
                    <VStack space="sm" justifyContent="space-between" maxW="80%">
                         <Box>
                              <Text bold fontSize="$md" color={textColor}>
                                   {item.title}{' '}
                                   {hasNewResults === 1 ? (
                                        <Badge mb="-0.5" colorScheme="warning">
                                             <BadgeText>{getTermFromDictionary(language, 'flag_updated')}</BadgeText>
                                        </Badge>
                                   ) : null}
                              </Text>
                              <Text fontSize="$xs" italic color={textColor}>
                                   Created on {item.created}
                              </Text>
                         </Box>
                    </VStack>
               </HStack>
          </Pressable>
     );
};
