import { useNavigation } from '@react-navigation/native';

import { Box, Button, ButtonText, Center, FlatList, FormControl, Input, InputField, Text } from '@gluestack-ui/themed';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLibrary } from '../../hooks/useLibrarySystemData';
import { navigate } from '../../helpers/RootNavigator';
import { getTermFromDictionary } from '../../translations/TranslationService';

import { formatDiscoveryVersion, sortBy } from '../../helpers/helpers';
import { getDefaultFacets } from '../../util/api/search';
import { useActiveLanguage } from '../../hooks/useLanguageData';

export const SearchHome = () => {
     const navigation = useNavigation();
     const [searchTerm, setSearchTerm] = React.useState('');
     const language = useActiveLanguage();
     const library = useLibrary();
     const discoveryVersion = formatDiscoveryVersion(library.discoveryVersion) ?? '22.10.00';
     const quickSearches = Array.isArray(library.quickSearches) ? library.quickSearches : Object.values(library.quickSearches ?? {});

     React.useLayoutEffect(() => {
          navigation.setOptions({
               headerLeft: () => <Box />,
          });
     }, [navigation]);

     React.useEffect(() => {
          async function preloadDefaultFacets() {
               if (discoveryVersion >= '22.11.00') {
                    await getDefaultFacets(library.baseUrl, 5, language);
               }
          }

          preloadDefaultFacets();
     }, []);

     const clearText = () => {
          setSearchTerm('');
     };

     const search = async () => {
          navigate('SearchResults', { term: searchTerm, type: 'catalog', prevRoute: 'SearchHome' });
          clearText();
     };

     return (
          <SafeAreaView>
               <Box safeArea={5}>
                    <FormControl>
                         <Input variant="filled" autoCapitalize="none" onChangeText={(term) => setSearchTerm(term)} status="info" placeholder={getTermFromDictionary(language, 'search')} clearButtonMode="always" onSubmitEditing={search} value={searchTerm} size="xl" />
                    </FormControl>
                    {quickSearches.length > 0 ? (
                         <Box>
                              <Center>
                                   <Text mt={8} mb={2} fontSize="xl" bold>
                                        {getTermFromDictionary(language, 'quick_searches')}
                                   </Text>
                              </Center>
                               <FlatList data={sortBy(quickSearches, ['weight', 'label'])} keyExtractor={(item, index) => index.toString()} renderItem={({ item }) => <QuickSearch data={item} />} />
                         </Box>
                    ) : null}
               </Box>
          </SafeAreaView>
     );
};

const QuickSearch = (data) => {
     const quickSearch = data.data;
     return (
          <Button
               mb={3}
               onPress={() =>
                    navigate('SearchResults', {
                         term: quickSearch.searchTerm,
                    })
               }>
               {quickSearch.label}
          </Button>
     );
};
