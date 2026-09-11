import { useRoute } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import _ from 'lodash';
import React from 'react';
import { loadError } from '../../components/loadError';
import { loadingSpinner } from '../../components/loadingSpinner';
import { DisplaySystemMessage } from '../../components/Notifications';
import { SystemMessagesContext } from '../../context/initialContext';
import { useLibrary } from '../../hooks/useLibrarySystemData';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { fetchSearchResultsForBrowseCategory } from '../../util/api/search';
import { DisplayResult } from './DisplayResult';
import { logDebugMessage, logErrorMessage } from '../../util/logging';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { useTheme } from '../../themes/theme';
import { Box } from '@/components/ui/box';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { FlatList } from '@/components/ui/flat-list';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { ThemedScrollView as ScrollView } from '@/src/components/themed/ThemedScrollView';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { ScreenContainer } from '@/src/components/ScreenContainer';

const blurhash = 'MHPZ}tt7*0WC5S-;ayWBofj[K5RjM{ofM_';

/**
 * SearchResultsForBrowseCategory component that displays search results for a specific browse category. It fetches data from the API based on the provided category and page number, and renders a list of results with pagination controls. It also handles system messages and error states.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const SearchResultsForBrowseCategory = () => {
     const queryClient = useQueryClient();
     const [page, setPage] = React.useState(1);
     const library = useLibrary();
     const language = useActiveLanguage();
     const { neutrals } = useTheme();
     const { systemMessages, updateSystemMessages } = React.useContext(SystemMessagesContext);

     const category = useRoute().params.id ?? '';
     const [paginationLabel, setPaginationLabel] = React.useState('Page 1 of 1');

     const { status, data, error, isFetching, isPreviousData } = useQuery({
          queryKey: ['searchResultsForBrowseCategory', category, page, 25, library.baseUrl, language],
          queryFn: () => fetchSearchResultsForBrowseCategory(category, page, 25, library.baseUrl, language),
          keepPreviousData: true,
          staleTime: 1000,
          onSuccess: (data) => {
               if (data.totalPages) {
                    let tmp = getTermFromDictionary(language, 'page_of_page');
                    tmp = tmp.replace('%1%', page);
                    tmp = tmp.replace('%2%', data.totalPages);
                    setPaginationLabel(tmp);
               }
          },
          onError: (error) => {
               logDebugMessage("Error searching by browse category");
               logErrorMessage(error);
          }
     });

     const systemMessagesForScreen = [];

     React.useEffect(() => {
          if (_.isArray(systemMessages)) {
               systemMessages.map((obj, index, collection) => {
                    if (obj.showOn === '0') {
                         systemMessagesForScreen.push(obj);
                    }
               });
          }
     }, [systemMessages]);

     const Paging = () => {
          if (data.totalPages > 1) {
               return (
                    <Box className="px-4 py-2" style={{ borderTopWidth: 1, borderColor: neutrals.border, flexWrap: 'nowrap', alignItems: 'center' }}>
                         <ScrollView horizontal>
                              <ButtonGroup>
                                   <Button onPress={() => setPage(page - 1)} isDisabled={page === 1} size="sm" colorScheme="primary">
                                        <ButtonText>{getTermFromDictionary(language, 'previous')}</ButtonText>
                                   </Button>
                                   <Button
                                        colorScheme="primary"
                                        onPress={() => {
                                             if (!isPreviousData && data.hasMore) {
                                                  setPage(page + 1);
                                             }
                                        }}
                                        isDisabled={isPreviousData || !data.hasMore}
                                        size="sm">
                                       <ButtonText>{getTermFromDictionary(language, 'next')}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </ScrollView>
                         <Text className="mt-2" size="2xs">
                              {paginationLabel}
                         </Text>
                    </Box>
               );
          }

          return null;
     };

     const showSystemMessage = () => {
          if (_.isArray(systemMessages)) {
               return systemMessages.map((obj, index, collection) => {
                    if (obj.showOn === '0') {
                         return <DisplaySystemMessage key={obj.id || index} style={obj.style} message={obj.message} dismissable={obj.dismissable} id={obj.id} all={systemMessages} url={library.baseUrl} updateSystemMessages={updateSystemMessages} queryClient={queryClient} />;
                    }
               });
          }
          return null;
     };

     const NoResults = () => {
          return (
               <>
                    {_.size(systemMessagesForScreen) > 0 ? <Box className="p-2">{showSystemMessage()}</Box> : null}
                    <Center className="flex-1">
                        <Heading className="pt-5">{getTermFromDictionary(language, 'no_results')}</Heading>
                    </Center>
               </>
          );
     };

     return (
          <ScreenContainer safeArea style={{ flex: 1 }}>
               {_.size(systemMessagesForScreen) > 0 ? <Box className="p-2">{showSystemMessage()}</Box> : null}
               {status === 'loading' || isFetching ? (
                    // TODO(translation): Replace hardcoded loading message with TranslationService-backed key.
                    loadingSpinner('Fetching results...')
               ) : status === 'error' ? (
                    // TODO(translation): Replace hardcoded error title with TranslationService-backed key.
                    loadError('Error', '')
               ) : (
                    <Box className="flex-1">
                         <FlatList data={data.results} ListFooterComponent={Paging} ListEmptyComponent={NoResults} renderItem={({ item }) => <DisplayResult data={item} />} keyExtractor={(item, index) => index.toString()} />
                    </Box>
               )}
          </ScreenContainer>
     );
};
