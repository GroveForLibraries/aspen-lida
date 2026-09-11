import { ThemedMaterialIcons as MaterialIcons } from '@/src/components/themed/ThemedMaterialIcons';
import { useRoute } from '@react-navigation/native';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import _ from 'lodash';
import React from 'react';
import {loadError} from '../../components/loadError';
import { LoadingSpinner } from '../../components/loadingSpinner';
import { DisplaySystemMessage } from '../../components/Notifications';
import { GroupedWorkContext, SystemMessagesContext } from '../../context/initialContext';
import { useLibrary } from '../../hooks/useLibrarySystemData';
import { useUserState, useCards, useSublocations, useUpdateAccounts, useUpdateCards, useUpdateLocations, useUpdateSublocations, useUpdatePickupLocationPrefs } from '../../hooks/useUserData';
import { startSearch } from '../../helpers/RootNavigator';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { getFirstRecord, getVariations } from '../../util/api/item';
import { getLinkedAccounts, passUserToDiscovery } from '../../util/api/user';
import { formatLinkedAccounts } from '../../util/api/userHelper';
import { getGroupedWork } from '../../util/api/work';
import { decodeHTML } from '../../helpers/helpers';
import { getPickupLocations, getPickupSublocations } from '../../util/api/user';
import { formatPickupLocations } from '../../util/api/userHelper';
import AddToList from '../Search/AddToList';
import Variations from './Variations';
import { logDebugMessage, getErrorMessage } from '../../util/logging.js';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { useTheme } from '../../themes/theme';
import { Box } from '@/components/ui/box';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { HStack } from '@/components/ui/hstack';
import { ThemedScrollView as ScrollView } from '@/src/components/themed/ThemedScrollView';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { ScreenContainer } from '@/src/components/ScreenContainer';

const blurhash = 'MHPZ}tt7*0WC5S-;ayWBofj[K5RjM{ofM_';

/**
 * GroupedWorkScreen component that displays detailed information about a grouped work, including title, author, formats, variations, and description. It fetches data from the API based on the provided work ID and user language, and manages state for user accounts, pickup locations, and system messages.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const GroupedWorkScreen = () => {
     const route = useRoute();
     const queryClient = useQueryClient();
     const id = route.params.id;
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const { data: sublocations } = useSublocations();
     const { data: cards } = useCards();
     const updateLocations = useUpdateLocations();
     const updateSublocations = useUpdateSublocations();
     const updateAccounts = useUpdateAccounts();
     const updateCards = useUpdateCards();
     const updatePickupLocationPrefs = useUpdatePickupLocationPrefs();
     const { language, updateGroupedWork, updateFormat } = React.useContext(GroupedWorkContext);
     const library = useLibrary();
     const userLanguage = useActiveLanguage();
     const { systemMessages, updateSystemMessages } = React.useContext(SystemMessagesContext);
     const { neutrals } = useTheme();

     const { status, data, error, isFetching } = useQuery(['groupedWork', id, userLanguage, library.baseUrl], () => getGroupedWork(route.params.id, userLanguage, library.baseUrl));

     React.useEffect(() => {
          let isSubscribed = true;
          if (!_.isUndefined(data) && !_.isEmpty(data)) {
               const update = async () => {
                    if (isSubscribed) {
                         updateGroupedWork(data);
                         updateFormat(data.format);
                         await getLinkedAccounts(library.baseUrl, language).then(async (data) => {
                              if(data.ok) {
                                   const linkedAccounts = formatLinkedAccounts(user, cards ?? [], library.barcodeStyle, data.data.result.linkedAccounts);
                                   await updateAccounts(linkedAccounts.accounts);
                                   await updateCards(linkedAccounts.cards);
                              } else {
                                   logDebugMessage("Error fetching linked accounts in GroupedWork");
                                   logDebugMessage(data);
                                   getErrorMessage(data.code ?? 0, data.problem);
                              }
                         });
                         await getPickupLocations(library.baseUrl, id).then(async (result) => {
                              logDebugMessage('Updating pickup locations after getPickupLocations call');
                              if(result.ok) {
                                   const pickupLocations = formatPickupLocations(result.data.result);
                                   await updateLocations(pickupLocations.locations);
                                   logDebugMessage("Preferred pickup location is valid? " + pickupLocations.preferredPickupLocationIsValid);
                                   await updatePickupLocationPrefs(pickupLocations.preferredPickupLocationIsValid, pickupLocations.preferredPickupLocationWarning);
                                   logDebugMessage("Error fetching pickup locations in GroupedWork");
                                   logDebugMessage(data);
                                   getErrorMessage(data.code ?? 0, data.problem);
                              }
                         });
                         await getPickupSublocations(library.baseUrl).then(async (result) => {
                              if (sublocations !== result) {
                                   await updateSublocations(result);
                              }
                         });
                    }
               };
               update().catch(console.error);

               return () => (isSubscribed = false);
          }
     }, [data]);

     const showSystemMessage = () => {
          if (_.isArray(systemMessages)) {
              return systemMessages.map((obj, index) => {
                    if (obj.showOn === '0') {
                         return <DisplaySystemMessage key={obj.id || index} style={obj.style} message={obj.message} dismissable={obj.dismissable} id={obj.id} all={systemMessages} url={library.baseUrl} updateSystemMessages={updateSystemMessages} queryClient={queryClient} />;
                    }
                    return null;
               });
          }
          return null;
     };

     return (
          <ScreenContainer safeArea style={{ flex: 1 }}>
               {status === 'loading' || isFetching ? (
                    // TODO(translation): Replace hardcoded loading message with TranslationService-backed key.
                    <LoadingSpinner message="Fetching data..." />
               ) : status === 'error' ? (
                    loadError(error, '')
               ) : (
                    <ScrollView>
                         <Box style={{ height: 150, width: '100%', backgroundColor: neutrals.canvas, zIndex: -1, position: 'absolute', left: 0, top: 0 }} />
                         {_.size(systemMessages) > 0 ? <Box className="p-2">{showSystemMessage()}</Box> : null}
                         <DisplayGroupedWork data={data.results} initialFormat={data.format} updateFormat={data.format} />
                    </ScrollView>
               )}
          </ScreenContainer>
     );
};

/**
 * DisplayGroupedWork component that displays detailed information about a grouped work, including title, author, formats, variations, and description. It fetches additional data for each format and variation using React Query.
 * @param payload
 * @returns {React.JSX.Element}
 * @constructor
 */
const DisplayGroupedWork = (payload) => {
     const groupedWork = payload.data;
     const route = useRoute();
     const id = route.params.id;
     const { format } = React.useContext(GroupedWorkContext);
     const library = useLibrary();
     const language = useActiveLanguage();

     const formats = Object.keys(groupedWork.formats);

     useQueries({
          queries: formats.map((format) => {
               return {
                    queryKey: ['recordId', groupedWork.id, format, language, library.baseUrl],
                    queryFn: () => getFirstRecord(id, format, language, library.baseUrl, groupedWork.formats[format]) };
          }) });

     useQueries({
          queries: formats.map((format) => {
               return {
                    queryKey: ['variation', groupedWork.id, format, language, library.baseUrl],
                    queryFn: () => getVariations(id, format, language, library.baseUrl, groupedWork.formats[format]) };
          }) });

     const key = 'large_' + groupedWork.id;

     return (
          <Box className="py-[10px] w-full">
               <Center className="w-full">
                    <Image alt={groupedWork.title} source={groupedWork.cover} className="rounded" style={{ width: 180.0, height: 250.0 }} placeholder={blurhash} transition={1000} contentFit="cover" />
                    <Title title={groupedWork.title} />
                    <Author author={groupedWork.author} />
               </Center>
               <Box className="px-4">
                    <Language language={groupedWork.language} />
                    <Formats formats={groupedWork.formats} />
                    <Variations format={format} data={groupedWork} />
                    <AddToList itemId={groupedWork.id} btnStyle="lg" />
                    <Description description={groupedWork.description} />
                    <BibliographicInformationLink groupedWorkId={groupedWork.id} />
               </Box>
          </Box>
     );
};

/**
 * Title component that displays the title of a grouped work. It renders the title text in bold and centered if provided, otherwise returns null.
 * @param param0
 * @param param0.title
 * @returns {React.JSX.Element|null}
 * @constructor
 */
const Title = ({ title }) => {
     if (title) {
          return (
               <>
                    <Text bold className="pt-5" style={{ lineHeight: 19, textAlign: 'center' }} size="md">
                         {title}
                    </Text>
               </>
          );
     } else {
          return null;
     }
};

/**
 * Author component that displays the author of a grouped work. It renders a button that allows the user to search for other works by the same author when pressed.
 * @param param0
 * @param param0.author
 * @returns {React.JSX.Element|null}
 * @constructor
 */
const Author = ({ author }) => {
     const library = useLibrary();
     const { neutralPairs, colorMode } = useTheme();
     if (author) {
          return (
               <Button size="sm" variant="link" onPress={() => startSearch(author, 'SearchResults', library.baseUrl)}>
                    <MaterialIcons name="search" size={16} color={colorMode === 'light' ? neutralPairs.textMuted.light : neutralPairs.white} className="mr-1" />
                    <ButtonText style={{ fontWeight: '400', color: colorMode === 'light' ? neutralPairs.textMuted.light : neutralPairs.white }}>
                         {author}
                    </ButtonText>
               </Button>
          );
     }
     return null;
};

/**
 * Format component that renders a button for a specific format of a grouped work. It allows the user to select a format and updates the displayed information accordingly.
 * @param data
 * @returns {React.JSX.Element}
 * @constructor
 */
const Format = (data) => {
     const format = data.data;
     const key = data.format;
     const isSelected = data.isSelected;
     const updateFormat = data.updateFormat;
     const isSelectedFormat = isSelected === key;
     const btnStyle = isSelectedFormat ? 'solid' : 'outline';

     return (
          <Button
               size="sm"
               variant={btnStyle}
               colorScheme="secondary"
               onPress={() => updateFormat(key)}
               >
               <ButtonText>{format.label}</ButtonText>
          </Button>
     );
};

/**
 * Description component that displays the description of a grouped work. It renders the description text if provided, otherwise returns null.
 * @param param0
 * @param param0.description
 * @returns {React.JSX.Element|null}
 * @constructor
 */
const Description = ({ description }) => {
     if (description) {
          return (
               <Text className="mt-5 mb-5" style={{ lineHeight: 21 }} size="sm">
                    {decodeHTML(description)}
               </Text>
          );
     } else {
          return null;
     }
};

/**
 * Language component that displays the language of a grouped work. It renders a label and the language value if provided.
 * @param param0
 * @param param0.language
 * @returns {React.JSX.Element|null}
 * @constructor
 */
const Language = ({ language }) => {
     const user_language = useActiveLanguage();
     if (language) {
          return (
               <HStack className="mt-3 mb-1">
                    <Text bold style={{ lineHeight: 15 }} size="xs">
                         {getTermFromDictionary(user_language, 'language')}:
                    </Text>
                    <Text className="ml-1" style={{ lineHeight: 15 }} size="xs">
                         {' '}
                         {language}
                    </Text>
               </HStack>
          );
     } else {
          return null;
     }
};

/**
 * Formats component that displays a list of available formats for a grouped work. It renders a button for each format, allowing the user to select a format and update the displayed information accordingly.
 * @param param0
 * @param param0.formats
 * @returns {React.JSX.Element|null}
 * @constructor
 */
const Formats = ({ formats }) => {
     const language = useActiveLanguage();
     const { format, updateFormat } = React.useContext(GroupedWorkContext);
     if (formats) {
          return (
               <>
                    <Text bold className="mt-3 mb-1" style={{ lineHeight: 15 }} size="xs">
                         {getTermFromDictionary(language, 'format')}:
                    </Text>
                    <ButtonGroup className="flex-row flex-wrap">
                         {_.compact(_.map(_.keys(formats), function (item, index) {
                              const formatData = formats[item];
                              if (!formatData || !formatData.label || formatData.label.trim() === '' || item.trim() === '') {
                                   return null;
                              }
                              return <Format key={index} format={item} data={formatData} isSelected={format} updateFormat={updateFormat} />;
                         }))}
                    </ButtonGroup>
               </>
          );
     } else {
          return null;
     }
};

/**
 * BibliographicInformationLink component that renders a button linking to more bibliographic information for a grouped work. The button is displayed only if the library settings allow it and the grouped work ID is provided.
 * @param param0
 * @param param0.groupedWorkId
 * @returns {React.JSX.Element|null}
 * @constructor
 */
const BibliographicInformationLink = ({ groupedWorkId }) => {
     const language = useActiveLanguage();
     const { neutrals } = useTheme();
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const library = useLibrary();
     const backgroundColor = neutrals.surface;
     const textColor = neutrals.textMain;

     let showMoreInfoBtn = false;
     if(library?.showMoreInfoBtn) {
          showMoreInfoBtn = library.showMoreInfoBtn;
     }

     if (groupedWorkId && showMoreInfoBtn) {
          return (
          <Button onPress={async () => await passUserToDiscovery(library.baseUrl, 'GroupedWork', user.id, backgroundColor, textColor, groupedWorkId)} colorScheme="secondary">
              <ButtonText>
                    {getTermFromDictionary(language, 'more_information')}
               </ButtonText>
          </Button>
          );
     } else {
          return null;
     }
};
