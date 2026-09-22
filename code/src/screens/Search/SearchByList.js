import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isArray, size } from '../../helpers/helpers';
import { Box, FlatList, Center, Heading } from '@gluestack-ui/themed';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loadError } from '../../components/loadError';

// custom components and helper files
import { LoadingSpinner } from '../../components/loadingSpinner';
import { SystemMessagesContext } from '../../context/initialContext';
import { DisplayResult } from './DisplayResult';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { DisplaySystemMessage } from '../../components/Notifications';
import { fetchSearchResultsForList } from '../../util/api/search';
import { logDebugMessage, logErrorMessage } from '../../util/logging';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { useTheme } from '../../themes/theme';
import { useLibrary } from '../../hooks/useLibrarySystemData';

const blurhash = 'MHPZ}tt7*0WC5S-;ayWBofj[K5RjM{ofM_';

export const SearchResultsForList = () => {
     const id = useRoute().params?.id;

     const navigation = useNavigation();
     const prevRoute = useRoute().params?.prevRoute ?? 'HomeScreen';
     const screenTitle = useRoute().params?.title ?? '';
     const [page, setPage] = React.useState(1);
     const library = useLibrary();
     const language = useActiveLanguage();
     const { systemMessages, updateSystemMessages } = React.useContext(SystemMessagesContext);
     const { theme, textColor, colorMode } = useTheme();
     const queryClient = useQueryClient();
     const url = library.baseUrl;

     let isUserList = false;
     if (screenTitle.includes('Your List')) {
          isUserList = true;
     }

     const systemMessagesForScreen = [];

     React.useEffect(() => {
          if (isArray(systemMessages)) {
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
          if (isArray(systemMessages)) {
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
                    {size(systemMessagesForScreen) > 0 ? <Box p="$2">{showSystemMessage()}</Box> : null}
                    <Center flex={1}>
                         <Heading pt="$5" color={textColor}>{getTermFromDictionary(language, 'no_results')}</Heading>
                    </Center>
               </>
          );
     };

     return (
          <SafeAreaView style={{ flex: 1 }}>
               {size(systemMessagesForScreen) > 0 ? <Box p="$2">{showSystemMessage()}</Box> : null}
               {status === 'loading' || isFetching ? (
                    <LoadingSpinner />
               ) : status === 'error' ? (
                    loadError('Error', '')
               ) : (
                    <Box flex={1}>
                         <FlatList data={data.items} ListEmptyComponent={NoResults} renderItem={({ item }) => <DisplayResult data={item} />} keyExtractor={(item, index) => index.toString()} />
                    </Box>
               )}
          </SafeAreaView>
     );
};
