import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import _ from 'lodash';
import React from 'react';
import { loadError } from '../../components/loadError';
import { LoadingSpinner } from '../../components/loadingSpinner';
import { SystemMessagesContext } from '../../context/initialContext';
import { DisplayResult } from './DisplayResult';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { DisplaySystemMessage } from '../../components/Notifications';
import { fetchSearchResultsForList } from '../../util/api/search';
import { logDebugMessage, logErrorMessage } from '../../util/logging';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { useLibrary } from '../../hooks/useLibrarySystemData';
import { Box } from '@/components/ui/box';
import { Center } from '@/components/ui/center';
import { FlatList } from '@/components/ui/flat-list';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { ScreenContainer } from '@/src/components/ScreenContainer';

const blurhash = 'MHPZ}tt7*0WC5S-;ayWBofj[K5RjM{ofM_';

/**
 * SearchResultsForList component that displays search results for a specific list. It fetches data from the API based on the provided list ID and page number, and renders a list of results. It also handles system messages and error states.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const SearchResultsForList = () => {
     const id = useRoute().params?.id;

     const navigation = useNavigation();
     const prevRoute = useRoute().params?.prevRoute ?? 'HomeScreen';
     const screenTitle = useRoute().params?.title ?? '';
     const [page, setPage] = React.useState(1);
     const library = useLibrary();
     const language = useActiveLanguage();
     const { systemMessages, updateSystemMessages } = React.useContext(SystemMessagesContext);
     const queryClient = useQueryClient();
     const url = library.baseUrl;

     let isUserList = false;
     if (screenTitle.includes('Your List')) {
          isUserList = true;
     }

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

     const { status, data, error, isFetching } = useQuery({
          queryKey: ['searchResultsForList', url, page, id, language],
          queryFn: () => fetchSearchResultsForList(id, page, url, language),
          keepPreviousData: true,
          staleTime: 1000,
          onError: (error) => {
               logDebugMessage('Error searching by list');
               logErrorMessage(error);
          } });

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
                    <LoadingSpinner />
               ) : status === 'error' ? (
                    loadError('Error', '')
               ) : (
                   <Box className="flex-1">
                         <FlatList data={data.items} ListEmptyComponent={NoResults} renderItem={({ item }) => <DisplayResult data={item} />} keyExtractor={(item, index) => index.toString()} />
                    </Box>
               )}
          </ScreenContainer>
     );
};
