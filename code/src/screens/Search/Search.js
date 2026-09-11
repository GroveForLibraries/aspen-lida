import { useNavigation } from '@react-navigation/native';
import _ from 'lodash';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLibrary } from '../../hooks/useLibrarySystemData';
import { navigate } from '../../helpers/RootNavigator';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { formatDiscoveryVersion } from '../../helpers/helpers';
import { getDefaultFacets } from '../../util/api/search';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { Box } from '@/components/ui/box';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { FlatList } from '@/components/ui/flat-list';
import { ThemedFormControl as FormControl, ThemedInput as Input, ThemedInputField as InputField } from '../../components/themed/ThemedFormControls';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';

/**
 * SearchHome component that displays the search input field and quick search options. It allows users to enter a search term and navigate to the search results page. It also preloads default facets based on the library's discovery version.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const SearchHome = () => {
     const navigation = useNavigation();
     const [searchTerm, setSearchTerm] = React.useState('');
     const language = useActiveLanguage();
     const library = useLibrary();
     const discoveryVersion = formatDiscoveryVersion(library.discoveryVersion) ?? '22.10.00';
     const quickSearchNum = _.size(library.quickSearches);

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
               <Box className="p-5">
                    <FormControl>
                         <Input size="xl">
                              <InputField autoCapitalize="none" onChangeText={(term) => setSearchTerm(term)} placeholder={getTermFromDictionary(language, 'search')} clearButtonMode="always" onSubmitEditing={search} value={searchTerm} />
                         </Input>
                    </FormControl>
                    {quickSearchNum > 0 ? (
                         <Box>
                              <Center>
                                   <Text bold className="mt-2 mb-[2px]" size="xl">
                                        {getTermFromDictionary(language, 'quick_searches')}
                                   </Text>
                              </Center>
                              <FlatList data={_.sortBy(library.quickSearches, ['weight', 'label'])} keyExtractor={(item, index) => index.toString()} renderItem={({ item }) => <QuickSearch data={item} />} />
                         </Box>
                    ) : null}
               </Box>
          </SafeAreaView>
     );
};

/**
 * QuickSearch component that renders a button for a quick search option. When pressed, it navigates to the search results page with the specified search term.
 * @param data
 * @returns {React.JSX.Element}
 * @constructor
 */
const QuickSearch = (data) => {
     const quickSearch = data.data;
     return (
          <Button
               className="mb-3"
               onPress={() =>
                    navigate('SearchResults', {
                         term: quickSearch.searchTerm,
                    })
               }>
               <ButtonText>{quickSearch.label}</ButtonText>
          </Button>
     );
};
