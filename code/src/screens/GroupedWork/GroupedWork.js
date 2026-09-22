import { SearchIcon } from 'lucide-react-native';

import {
     Button,
     ButtonGroup,
     ButtonIcon,
     ButtonText,
     Box,
     Center,
     HStack,
     Text,
     SafeAreaView,
     ScrollView
} from '@gluestack-ui/themed';
import { useRoute } from '@react-navigation/native';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';

import React from 'react';

// custom components and helper files
import {loadError} from '../../components/loadError';
import { LoadingSpinner } from '../../components/loadingSpinner';
import { DisplaySystemMessage } from '../../components/Notifications';
import { GroupedWorkContext, SystemMessagesContext } from '../../context/initialContext';
import { useLibrary } from '../../hooks/useLibrarySystemData';
import { useUserState, useAccounts, useCards, useLocations, useSublocations, useUpdateAccounts, useUpdateCards, useUpdateLocations, useUpdateSublocations, useUpdatePickupLocationPrefs } from '../../hooks/useUserData';
import { startSearch } from '../../helpers/RootNavigator';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { getFirstRecord, getVariations } from '../../util/api/item';
import { getLinkedAccounts, passUserToDiscovery } from '../../util/api/user';
import { formatLinkedAccounts } from '../../util/api/userHelper';
import { getGroupedWork } from '../../util/api/work';
import { decodeHTML, isEmpty } from '../../helpers/helpers';
import { getPickupLocations, getPickupSublocations } from '../../util/api/user';
import { formatPickupLocations } from '../../util/api/userHelper';
import AddToList from '../Search/AddToList';
import Variations from './Variations';

import { logDebugMessage, getErrorMessage } from '../../util/logging.js';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { useTheme } from '../../themes/theme';

const blurhash = 'MHPZ}tt7*0WC5S-;ayWBofj[K5RjM{ofM_';

export const GroupedWorkScreen = () => {
     const route = useRoute();
     const queryClient = useQueryClient();
     const id = route.params.id;
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const preferredPickupLocationIsValid = userState?.preferredPickupLocationIsValid ?? true;
     const preferredPickupLocationWarning = userState?.preferredPickupLocationWarning ?? '';
     const { data: locations } = useLocations();
     const { data: sublocations } = useSublocations();
     const { data: accounts } = useAccounts();
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
     const { theme, colorMode } = useTheme();
     const safeSystemMessages = Array.isArray(systemMessages) ? systemMessages : [];

     const { status, data, error, isFetching } = useQuery(['groupedWork', id, userLanguage, library.baseUrl], () => getGroupedWork(route.params.id, userLanguage, library.baseUrl));

     React.useEffect(() => {
          let isSubscribed = true;
          if (data !== undefined && !isEmpty(data)) {
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
          if (safeSystemMessages.length > 0) {
               return safeSystemMessages.map((obj, index, collection) => {
                    if (obj.showOn === '0') {
                         return <DisplaySystemMessage key={obj.id || index} style={obj.style} message={obj.message} dismissable={obj.dismissable} id={obj.id} all={safeSystemMessages} url={library.baseUrl} updateSystemMessages={updateSystemMessages} queryClient={queryClient} />;
                    }
               });
          }
          return null;
     };

     return (
          <SafeAreaView style={{ flex: 1 }}>
               {status === 'loading' || isFetching ? (
                    <LoadingSpinner message="Fetching data..." />
               ) : status === 'error' ? (
                    loadError(error, '')
               ) : (
                    <ScrollView>
                         <Box sx={{ '@base': { height: 150 }, '@lg': { height: 200 } }} width="$full" bgColor={colorMode === 'light' ? "$warmGray200" : "$coolGray900"} zIndex={-1} position="absolute" left={0} top={0} />
                         {safeSystemMessages.length > 0 ? <Box p="$2">{showSystemMessage()}</Box> : null}
                         <DisplayGroupedWork data={data.results} initialFormat={data.format} updateFormat={data.format} />
                    </ScrollView>
               )}
          </SafeAreaView>
     );
};

const DisplayGroupedWork = (payload) => {
     const groupedWork = payload.data;
     const route = useRoute();
     const id = route.params.id;
     const { format } = React.useContext(GroupedWorkContext);
     const library = useLibrary();
     const language = useActiveLanguage();
     const { colorMode } = useTheme();

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
          <Box p="$5" width="$full">
               <Center mt="$5" width="100%">
                    <Image alt={groupedWork.title} source={groupedWork.cover} style={{ width: 180, height: 250, borderRadius: 4 }} placeholder={blurhash} transition={1000} contentFit="cover" />
                    <Title title={groupedWork.title} />
                    <Author author={groupedWork.author} />
               </Center>
               <Language language={groupedWork.language} />
               <Formats formats={groupedWork.formats} />
               <Variations format={format} data={groupedWork} />
               <AddToList itemId={groupedWork.id} btnStyle="lg" />
               <Description description={groupedWork.description} />
               <BibliographicInformationLink groupedWorkId={groupedWork.id} />
          </Box>
     );
};

const Title = ({ title }) => {
     const { textColor } = useTheme();
     if (title) {
          return (
               <>
                    <Text color={textColor} sx={{ '@base': { fontSize: 16, lineHeight: 19 }, '@lg': { fontSize: 24, lineHeight: 27 } }} bold pt="$5" alignText="center">
                         {title}
                    </Text>
               </>
          );
     } else {
          return null;
     }
};

const Author = ({ author }) => {
     const library = useLibrary();
     const { theme, colorMode } = useTheme();
     if (author) {
          return (
               <Button size="sm" variant="link" onPress={() => startSearch(author, 'SearchResults', library.baseUrl)}>
                    <ButtonIcon as={SearchIcon} color={colorMode === 'light' ? "$coolGray700" : "$warmGray100"} size="xs" mr="$1" />
                    <ButtonText fontWeight="$normal" color={colorMode === 'light' ? "$coolGray700" : "$warmGray100"}>
                         {author}
                    </ButtonText>
               </Button>
          );
     }
     return null;
};

const Format = (data) => {
     const format = data.data;
     const key = data.format;
     const isSelected = data.isSelected;
     const updateFormat = data.updateFormat;
     const btnStyle = isSelected === key ? 'solid' : 'outline';
     const { theme, colorMode } = useTheme();

     return (
          <Button size="sm" bg={btnStyle === 'outline' ? 'transparent' : theme['tokens']['colors']['secondary']['400']} borderColor={colorMode === 'light' ? "$coolGray700" : "$warmGray100"} mb="$1" mr="$1" variant={btnStyle} onPress={() => updateFormat(key)}>
               <ButtonText color={btnStyle === 'outline' ? (colorMode === 'light' ? "$coolGray700" : "$warmGray100") : theme['tokens']['colors']['secondary']['400-text']}>{format.label}</ButtonText>
          </Button>
     );
};

const Description = ({ description }) => {
     const { theme, textColor } = useTheme();
     if (description) {
          return (
               <Text mt="$5" mb="$5" sx={{ '@base': { fontSize: 14, lineHeight: 21 }, '@lg': { fontSize: 20, lineHeight: 27 } }} color={textColor}>
                    {decodeHTML(description)}
               </Text>
          );
     } else {
          return null;
     }
};

const Language = ({ language }) => {
     const user_language = useActiveLanguage();
     const { theme, textColor } = useTheme();
     if (language) {
          return (
               <HStack mt="$3" mb="$1">
                    <Text sx={{ '@base': { fontSize: 12, lineHeight: 15 }, '@lg': { fontSize: 18, lineHeight: 21 } }} bold color={textColor}>
                         {getTermFromDictionary(user_language, 'language')}:
                    </Text>
                    <Text sx={{ '@base': { fontSize: 12, lineHeight: 15 }, '@lg': { fontSize: 18, lineHeight: 21 } }} ml="$1" color={textColor}>
                         {' '}
                         {language}
                    </Text>
               </HStack>
          );
     } else {
          return null;
     }
};

const Formats = ({ formats }) => {
     const language = useActiveLanguage();
     const { format, updateFormat } = React.useContext(GroupedWorkContext);
     const { theme, textColor } = useTheme();
     if (formats) {
          return (
               <>
                    <Text sx={{ '@base': { fontSize: 12, lineHeight: 15 }, '@lg': { fontSize: 18, lineHeight: 21 } }} bold mt="$3" mb="$1" color={textColor}>
                         {getTermFromDictionary(language, 'format')}:
                    </Text>
                    <ButtonGroup flexDirection="row" flexWrap="wrap">
                         {Object.entries(formats)
                              .map(([item, formatData], index) => {
                              if (!formatData || !formatData.label || formatData.label.trim() === '' || item.trim() === '') {
                                   return null;
                              }
                              return <Format key={index} format={item} data={formatData} isSelected={format} updateFormat={updateFormat} />;
                         })
                              .filter(Boolean)}
                    </ButtonGroup>
               </>
          );
     } else {
          return null;
     }
};

const BibliographicInformationLink = ({ groupedWorkId }) => {
     const language = useActiveLanguage();
     const { theme, colorMode } = useTheme();
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const library = useLibrary();
     const backgroundColor = colorMode === 'light' ? "$warmGray200" : "$coolGray900";
     const textColor = colorMode === 'light' ? "$warmGray800" : "$coolGray200";

     let showMoreInfoBtn = false;
     if(library?.showMoreInfoBtn) {
          showMoreInfoBtn = library.showMoreInfoBtn;
     }

     if (groupedWorkId && showMoreInfoBtn) {
          return (
          <Button onPress={async () => await passUserToDiscovery(library.baseUrl, 'GroupedWork', user.id, backgroundColor, textColor, groupedWorkId)} bgColor={theme['tokens']['colors']['secondary']['500']}>
               <ButtonText color={theme['tokens']['colors']['secondary']['500-text']}>
                    {getTermFromDictionary(language, 'more_information')}
               </ButtonText>
          </Button>
          );
     } else {
          return null;
     }
};
