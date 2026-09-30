import React from 'react';
import { FlatList } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useLibrary } from '../../hooks/useLibrarySystemData';
import { loadingSpinner } from '../../components/loadingSpinner';
import { getManifestation, getRelatedRecord } from '../../util/api/item';
import { loadError } from '../../components/loadError';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { useTheme } from '../../themes/theme';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { ScreenContainer } from '@/src/components/ScreenContainer';

/**
 * WhereIsIt component that displays the availability and location of a specific item or manifestation. It fetches data from the API based on the provided parameters and renders a list of available copies, locations, and call numbers or holds.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const WhereIsIt = () => {
     const route = useRoute();
     const { id, format, prevRoute, type, recordId, source } = route.params;
     const language = useActiveLanguage();
     const library = useLibrary();
     const {  } = useTheme();
     const [isLoading, setLoading] = React.useState(false);

     const { status, data, error, isFetching } = useQuery({
          queryKey: ['manifestations', id, format, recordId, type, language, library.baseUrl],
          queryFn: async () => {
              if(!recordId) {
                  return await getManifestation(id, format, language, library.baseUrl);
              } else {
                  return await getRelatedRecord(id, recordId, format, library.baseUrl);
              }
          } });

	 return (
          <ScreenContainer className="py-5">
               {isLoading || status === 'loading' || isFetching ? (
                    loadingSpinner()
               ) : status === 'error' ? (
                    loadError('Error', '')
               ) : (
                    <Box>
                         <HStack space="md" className="justify-between pb-2">
                              <Text bold size="xs" className="w-[30%]">
                                   {getTermFromDictionary(language, 'available_copies')}
                              </Text>
                              <Text bold size="xs" className="w-[30%]">
                                   {getTermFromDictionary(language, 'location')}
                              </Text>
							 {source === 'overdrive' ? (
								 <Text bold size="xs" className="w-[30%]">
									 {getTermFromDictionary(language, 'holds')}
								 </Text>
							 ) : (
                             <Text bold size="xs" className="w-[30%]">
                                   {getTermFromDictionary(language, 'call_num')}
                              </Text>
							 )}
                         </HStack>
                         <FlatList data={Object.keys(data.manifestation)} renderItem={({ item }) => <Details manifestation={data.manifestation[item]} source={source} />} />
                    </Box>
               )}
          </ScreenContainer>
     );
};

/**
 * Details component that renders the details of a specific manifestation, including available copies, shelf location, and either call number or number of holds based on the source. It uses the text color from the current theme context.
 * @param data
 * @returns {React.JSX.Element}
 * @constructor
 */
const Details = (data) => {
     const {  } = useTheme();
     const manifestation = data.manifestation;
     const source = data.source;
     return (
          <HStack space="md" className="justify-between">
               <Text size="xs" className="w-[30%]">
                    {manifestation.availableCopies} of {manifestation.totalCopies}
               </Text>
               <Text size="xs" className="w-[30%]">
                    {manifestation.shelfLocation}
               </Text>
			  {source === 'overdrive' ? (
				  <Text size="xs" className="w-[30%]">
					  {manifestation.numHolds}
				  </Text>
			  ) : (
               <Text size="xs" className="w-[30%]">
                    {manifestation.callNumber}
               </Text>
			  )}
          </HStack>
     );
};
