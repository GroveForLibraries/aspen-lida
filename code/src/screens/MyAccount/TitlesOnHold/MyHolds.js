import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query';
import { find, isArray, isEmpty, isObject, set, size } from '../../../helpers/helpers';
import { Box, Button, ButtonText, Center, CheckboxGroup, ChevronDownIcon, FormControl, Heading, HStack, Icon, ScrollView, Select, SelectBackdrop, SelectDragIndicator, SelectDragIndicatorWrapper, SelectIcon, SelectInput, SelectTrigger, SelectItem, SelectContent, SelectPortal, SelectScrollView, Text, AlertIcon, InfoIcon, AlertText, Alert, VStack } from '@gluestack-ui/themed';
import React from 'react';
import { Platform, SectionList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// custom components and helper files
import { LoadingSpinner } from '../../../components/loadingSpinner';
import { DisplaySystemMessage } from '../../../components/Notifications';
import { HoldsContext, SystemMessagesContext } from '../../../context/initialContext';
import { useUserState, useLocations, useUpdateLocations, useUpdateSortSettings, useUpdateUserProfile } from '../../../hooks/useUserData';
import { getTermFromDictionary, getTranslationsWithValues } from '../../../translations/TranslationService';
import { getPatronHolds, refreshProfile, setSortPreferences } from '../../../util/api/user';
import { sortHolds, formatHolds, formatPickupLocations } from '../../../util/api/userHelper';
import { getPickupLocations } from '../../../util/api/user';
import { ManageAllHolds, ManageSelectedHolds, MyHold } from './MyHold';

import { logDebugMessage, logErrorMessage, getErrorMessage } from '../../../util/logging.js';
import { useActiveLanguage } from '../../../hooks/useLanguageData';
import { useTheme } from '../../../themes/theme';
import { useLibrary } from '../../../hooks/useLibrarySystemData';

export const MyHolds = () => {
     const isFetchingHolds = useIsFetching({ queryKey: ['holds'] });
     const queryClient = useQueryClient();
     const navigation = useNavigation();
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const userHoldPendingSortMethod = userState?.userHoldPendingSortMethod ?? 'sortTitle';
     const userHoldReadySortMethod = userState?.userHoldReadySortMethod ?? 'expire';
     const updateUserProfile = useUpdateUserProfile();
     const updateSortSettings = useUpdateSortSettings();
     const updateUserHoldPendingSortMethod = (v) => updateSortSettings({ userHoldPendingSortMethod: v });
     const updateUserHoldReadySortMethod = (v) => updateSortSettings({ userHoldReadySortMethod: v });
     const { data: locations } = useLocations();
     const updatePickupLocations = useUpdateLocations();
     const library = useLibrary();
     const { holds, updateHolds } = React.useContext(HoldsContext);
     const language = useActiveLanguage();
     const [holdSource, setHoldSource] = React.useState('all');
     const [isLoading, setLoading] = React.useState(false);
     const [values, setGroupValues] = React.useState([]);
     const [date, setNewDate] = React.useState();
     const [pickupLocations, setPickupLocations] = React.useState([]);
     const { systemMessages, updateSystemMessages } = React.useContext(SystemMessagesContext);
     const { theme, textColor, colorMode } = useTheme();
     const insets = useSafeAreaInsets();

     const [sortBy, setSortBy] = React.useState({
          title: 'Sort by Title',
          author: 'Sort by Author',
          format: 'Sort by Format',
          status: 'Sort by Status',
          date_placed: 'Sort by Date Placed',
          position: 'Sort by Position',
          pickup_location: 'Sort by Pickup Location',
          library_account: 'Sort by Library Account',
          expiration: 'Sort by Expiration Date' });

     const [filterByLibby, setFilterByLibby] = React.useState(false);
     const [filterByLibbyTitle, setFilterByLibbyTitle] = React.useState(false);

     const refreshAndSaveUserProfile = React.useCallback(async () => {
          const profileResponse = await refreshProfile(library.baseUrl);
          if (profileResponse?.ok && profileResponse?.data?.result?.profile) {
               await updateUserProfile(profileResponse.data.result.profile);
          }
     }, [library.baseUrl, updateUserProfile]);

     React.useLayoutEffect(() => {
          navigation.setOptions({
               headerLeft: () => <Box /> });
     }, [navigation]);

     useQuery(['holds', user.id, library.baseUrl, language, userHoldReadySortMethod, userHoldPendingSortMethod, 'all'], () => getPatronHolds(userHoldReadySortMethod, userHoldPendingSortMethod, 'all', library.baseUrl, true, language), {
          placeHolderData: holds,
          onSuccess: (data) => {
               if(data.ok) {
                    let holds = formatHolds(data.data.result.holds ?? []);
                    holds = sortHolds(holds, userHoldPendingSortMethod, userHoldReadySortMethod);
                    updateHolds(holds);
               } else {
                    logDebugMessage("Error fetching user holds");
                    logDebugMessage(data);
                    getErrorMessage(data.code ?? 0, data.problem);
               }
          },
          onSettle: (data) => setLoading(false),
          onError: (error) => {
               logDebugMessage("Error fetching user holds");
               logErrorMessage(error);
          }
     });

     const toggleReadySort = async (value) => {
          updateUserHoldReadySortMethod(value);
          const sortedHolds = sortHolds(holds, userHoldPendingSortMethod, value);
          setLoading(true);
          queryClient.setQueryData(['holds', library.baseUrl, language, userHoldReadySortMethod, userHoldPendingSortMethod, 'all'], sortedHolds);
          setLoading(false);
          await setSortPreferences('availableHoldSort', value, language, library.baseUrl)
          updateHolds(sortedHolds);
     };

     const togglePendingSort = async (value) => {
          updateUserHoldPendingSortMethod(value);
          const sortedHolds = sortHolds(holds, value, userHoldReadySortMethod);
          setLoading(true);
          queryClient.setQueryData(['holds', library.baseUrl, language, userHoldReadySortMethod, userHoldPendingSortMethod, 'all'], sortedHolds);
          setLoading(false);
          await setSortPreferences('unavailableHoldSort', value, language, library.baseUrl);
          updateHolds(sortedHolds);
     };

     const toggleHoldSource = async (value) => {
          setHoldSource(value);
          //setLoading(true);
          if (value !== null) {
               if (value === 'ils') {
                    navigation.setOptions({ title: getTermFromDictionary(language, 'titles_on_hold_for_ils') });
               } else if (value === 'overdrive') {
                    navigation.setOptions({ title: filterByLibbyTitle });
               } else if (value === 'hoopla') {
                    navigation.setOptions({ title: getTermFromDictionary(language, 'titles_on_hold_for_hoopla') });
               } else if (value === 'cloud_library') {
                    navigation.setOptions({ title: getTermFromDictionary(language, 'titles_on_hold_for_cloud_library') });
               } else if (value === 'axis360') {
                    navigation.setOptions({ title: getTermFromDictionary(language, 'titles_on_hold_for_boundless') });
               } else if (value === 'palace_project') {
                    navigation.setOptions({ title: getTermFromDictionary(language, 'titles_on_hold_for_palace_project') });
               } else {
                    navigation.setOptions({ title: getTermFromDictionary(language, 'titles_on_hold_for_all') });
               }
          }
         // setLoading(false);
     };

     useFocusEffect(
          React.useCallback(() => {
               const update = async () => {
                    await getPickupLocations(library.baseUrl).then((result) => {
                         if(result.ok) {
                              const pickupLocations = formatPickupLocations(result.data.result);
                              if (locations !== pickupLocations.locations) {
                                   updatePickupLocations(pickupLocations.locations);
                              }
                         }
                    });

                    let tmp = sortBy;
                    let term = '';

                    term = getTermFromDictionary(language, 'sort_by_title');

                    if (!term.includes('%1%')) {
                         tmp = set(tmp, 'title', term);
                         setSortBy(tmp);
                    }

                    term = getTermFromDictionary(language, 'sort_by_author');
                    if (!term.includes('%1%')) {
                         tmp = set(tmp, 'author', term);
                         setSortBy(tmp);
                    }

                    term = getTermFromDictionary(language, 'sort_by_format');
                    if (!term.includes('%1%')) {
                         tmp = set(tmp, 'format', term);
                         setSortBy(tmp);
                    }

                    term = getTermFromDictionary(language, 'sort_by_status');
                    if (!term.includes('%1%')) {
                         tmp = set(tmp, 'status', term);
                         setSortBy(tmp);
                    }

                    term = getTermFromDictionary(language, 'sort_by_date_placed');
                    if (!term.includes('%1%')) {
                         tmp = set(tmp, 'date_placed', term);
                         setSortBy(tmp);
                    }

                    term = getTermFromDictionary(language, 'sort_by_position');
                    if (!term.includes('%1%')) {
                         tmp = set(tmp, 'position', term);
                         setSortBy(tmp);
                    }

                    term = getTermFromDictionary(language, 'sort_by_pickup_location');
                    if (!term.includes('%1%')) {
                         tmp = set(tmp, 'pickup_location', term);
                         setSortBy(tmp);
                    }

                    term = getTermFromDictionary(language, 'sort_by_library_account');
                    if (!term.includes('%1%')) {
                         tmp = set(tmp, 'library_account', term);
                         setSortBy(tmp);
                    }

                    term = getTermFromDictionary(language, 'sort_by_expiration');
                    if (!term.includes('%1%')) {
                         tmp = set(tmp, 'expiration', term);
                         setSortBy(tmp);
                    }

                    let libbyTitle = getTermFromDictionary(language, 'titles_on_hold_for_libby');
                    let libbyFilterLabel = getTermFromDictionary(language, 'filter_by_libby');
                    if (library.libbyReaderName) {
                         term = await getTranslationsWithValues('titles_on_hold_for_libby', library.libbyReaderName, language, library.baseUrl);
                         if (term[0] && !term[0].includes('%1%')) {
                              libbyTitle = term[0];
                         }

                         term = await getTranslationsWithValues('filter_by_libby', library.libbyReaderName, language, library.baseUrl);
                         if (term[0] && !term[0].includes('%1%')) {
                              libbyFilterLabel = term[0];
                         }
                    }

                    setFilterByLibbyTitle(libbyTitle);
                    setFilterByLibby(libbyFilterLabel);

                    setLoading(false);
               };
               update().then(() => {
                    return () => update();
               });
          }, [language])
     );

     const handleDateChange = (date) => {
          setNewDate(date);
     };

     const saveGroupValue = (data) => {
          setGroupValues(data);
     };

     const clearGroupValue = () => {
          setGroupValues([]);
     };

     const resetGroup = async () => {
          setLoading(true);
          clearGroupValue();
          queryClient.invalidateQueries({ queryKey: ['holds', user.id, library.baseUrl, language, userHoldReadySortMethod, userHoldPendingSortMethod, 'all'] });
          await refreshAndSaveUserProfile();
          setLoading(false);
     };

     const refreshHolds = async () => {
          setLoading(true);
          updateHolds([]);
          queryClient.invalidateQueries({ queryKey: ['holds', user.id, library.baseUrl, language, userHoldReadySortMethod, userHoldPendingSortMethod, 'all'] });
          await refreshAndSaveUserProfile();
          setLoading(false);
     };

     const filteredSections = React.useMemo(() => {
          if (!Array.isArray(holds)) {
               return holds;
          }

          return holds.map((section) => ({
               ...section,
               data: holdSource === 'all' ? (section.data ?? []) : (section.data ?? []).filter((item) => item?.source === holdSource),
          }));
     }, [holds, holdSource]);

     const actionButtons = (section) => {
          let showSelectOptions = false;
          if (values.length >= 1) {
               showSelectOptions = true;
          }

          const pendingSortLabel = () => {
               switch (userHoldPendingSortMethod) {
                    case "author":
                         return sortBy.author;
                    case "format":
                         return sortBy.format;
                    case "status":
                         return sortBy.status;
                    case "placed":
                         return sortBy.date_placed;
                    case "position":
                         return sortBy.position;
                    case "location":
                         return sortBy.pickup_location;
                    case "libraryAccount":
                         return sortBy.library_account;
                    case "sortTitle":
                         return sortBy.title;
                    default:
                         return getTermFromDictionary(language, 'select_sort_method');
               }
          };

          let pendingSortLength = 8 * sortBy.title.length + 80;
          if (userHoldPendingSortMethod === 'author') {
               pendingSortLength = 8 * sortBy.author.length + 80;
          } else if (userHoldPendingSortMethod === 'format') {
               pendingSortLength = 8 * sortBy.format.length + 80;
          } else if (userHoldPendingSortMethod === 'status') {
               pendingSortLength = 8 * sortBy.status.length + 80;
          } else if (userHoldPendingSortMethod === 'placed') {
               pendingSortLength = 8 * sortBy.date_placed.length + 80;
          } else if (userHoldPendingSortMethod === 'position') {
               pendingSortLength = 8 * sortBy.position.length + 80;
          } else if (userHoldPendingSortMethod === 'location') {
               pendingSortLength = 8 * sortBy.pickup_location.length + 80;
          } else if (userHoldPendingSortMethod === 'libraryAccount') {
               pendingSortLength = 8 * sortBy.library_account.length + 80;
          } else if (userHoldPendingSortMethod === 'sortTitle') {
               pendingSortLength = 8 * sortBy.title.length + 80;
          }

          if (section === 'pending') {
               if (showSelectOptions) {
                    return (
                         <Box p="$2">
                              <ScrollView horizontal>
                                   <HStack space="sm">
                                        <FormControl w={pendingSortLength}>
                                             <Select
                                                  name="sortBy"
                                                  selectedValue={userHoldPendingSortMethod}
                                                  accessibilityLabel={getTermFromDictionary(language, 'select_sort_method')}
                                                  onValueChange={(itemValue) => togglePendingSort(itemValue)}>
                                                  <SelectTrigger variant="outline" size="sm">
                                                       <SelectInput py={0} color={textColor} value={pendingSortLabel()} />
                                                       <SelectIcon mr="$0">
                                                            <Icon color={textColor} as={ChevronDownIcon} />
                                                       </SelectIcon>
                                                  </SelectTrigger>
                                                  <SelectPortal>
                                                       <SelectBackdrop />
                                                       <SelectContent
                                                            bgColor={colorMode === 'light' ? "$warmGray50" : "$coolGray700"}
                                                            pb={Platform.OS === 'android' ? insets.bottom + 16 : '$4'}
                                                       >
                                                            <SelectDragIndicatorWrapper>
                                                                 <SelectDragIndicator />
                                                            </SelectDragIndicatorWrapper>
                                                            <SelectScrollView>
                                                                 <SelectItem label={sortBy.title} value="sortTitle" key="pending-manage-sortTitle" bgColor={userHoldPendingSortMethod == "sortTitle" ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: userHoldPendingSortMethod == "sortTitle" ? theme.tokens.colors.tertiary['500-text'] : textColor } }} />
                                                                 <SelectItem label={sortBy.author} value="author" key="pending-manage-author" bgColor={userHoldPendingSortMethod == "author" ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: userHoldPendingSortMethod == "author" ? theme.tokens.colors.tertiary['500-text'] : textColor } }} />
                                                                 <SelectItem label={sortBy.format} value="format" key="pending-manage-format" bgColor={userHoldPendingSortMethod == "format" ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: userHoldPendingSortMethod == "format" ? theme.tokens.colors.tertiary['500-text'] : textColor } }} />
                                                                 <SelectItem label={sortBy.status} value="status" key="pending-manage-status" bgColor={userHoldPendingSortMethod == "status" ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: userHoldPendingSortMethod == "status" ? theme.tokens.colors.tertiary['500-text'] : textColor } }} />
                                                                 <SelectItem label={sortBy.date_placed} value="placed" key="pending-manage-placed" bgColor={userHoldPendingSortMethod == "placed" ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: userHoldPendingSortMethod == "placed" ? theme.tokens.colors.tertiary['500-text'] : textColor } }} />
                                                                 <SelectItem label={sortBy.position} value="position" key="pending-manage-position" bgColor={userHoldPendingSortMethod == "position" ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: userHoldPendingSortMethod == "position" ? theme.tokens.colors.tertiary['500-text'] : textColor } }} />
                                                                 <SelectItem label={sortBy.pickup_location} value="location" key="pending-manage-location" bgColor={userHoldPendingSortMethod == "location" ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: userHoldPendingSortMethod == "location" ? theme.tokens.colors.tertiary['500-text'] : textColor } }} />
                                                                 <SelectItem label={sortBy.library_account} value="libraryAccount" key="pending-manage-libraryAccount" bgColor={userHoldPendingSortMethod == "libraryAccount" ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: userHoldPendingSortMethod == "libraryAccount" ? theme.tokens.colors.tertiary['500-text'] : textColor } }}/>
                                                            </SelectScrollView>
                                                       </SelectContent>
                                                  </SelectPortal>
                                             </Select>
                                        </FormControl>
                                        <ManageSelectedHolds language={language} selectedValues={values} onAllDateChange={handleDateChange} selectedReactivationDate={date} resetGroup={resetGroup} />
                                        <Button size="sm" variant="outline" mr="$1" onPress={() => clearGroupValue()} borderColor={colorMode === 'light' ? "$coolGray700" : "$warmGray100"}>
                                             <ButtonText color={colorMode === 'light' ? "$coolGray700" : "$warmGray100"}>{getTermFromDictionary(language, 'holds_clear_selections')}</ButtonText>
                                        </Button>
                                   </HStack>
                              </ScrollView>
                         </Box>
                    );
               }

               return (
                    <Box p="$2">
                         <ScrollView horizontal>
                              <HStack space="sm">
                                   <FormControl w={pendingSortLength}>
                                        <Select
                                             name="sortBy"
                                             selectedValue={userHoldPendingSortMethod}
                                             defaultValue={userHoldPendingSortMethod}
                                             accessibilityLabel={getTermFromDictionary(language, 'select_sort_method')}
                                             onValueChange={(itemValue) => togglePendingSort(itemValue)}>
                                             <SelectTrigger variant="outline" size="sm">
                                                  <SelectInput  py={0}color={textColor} value={pendingSortLabel()} />
                                                  <SelectIcon mr="$3">
                                                       <Icon color={textColor} as={ChevronDownIcon} />
                                                  </SelectIcon>
                                             </SelectTrigger>
                                             <SelectPortal>
                                                  <SelectBackdrop />
                                                  <SelectContent
                                                       bgColor={colorMode === 'light' ? "$warmGray50" : "$coolGray700"}
                                                       pb={Platform.OS === 'android' ? insets.bottom + 16 : '$4'}
                                                  >
                                                       <SelectDragIndicatorWrapper>
                                                            <SelectDragIndicator />
                                                       </SelectDragIndicatorWrapper>
                                                       <SelectScrollView>
                                                            <SelectItem label={sortBy.title} value="sortTitle" key="pending-select-sortTitle" bgColor={userHoldPendingSortMethod == "sortTitle" ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: userHoldPendingSortMethod == "sortTitle" ? theme.tokens.colors.tertiary['500-text'] : textColor } }} />
                                                            <SelectItem label={sortBy.author} value="author" key="pending-select-author" bgColor={userHoldPendingSortMethod == "author" ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: userHoldPendingSortMethod == "author" ? theme.tokens.colors.tertiary['500-text'] : textColor } }} />
                                                            <SelectItem label={sortBy.format} value="format" key="pending-select-format" bgColor={userHoldPendingSortMethod == "format" ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: userHoldPendingSortMethod == "format" ? theme.tokens.colors.tertiary['500-text'] : textColor } }} />
                                                            <SelectItem label={sortBy.status} value="status" key="pending-select-status" bgColor={userHoldPendingSortMethod == "status" ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: userHoldPendingSortMethod == "status" ? theme.tokens.colors.tertiary['500-text'] : textColor } }} />
                                                            <SelectItem label={sortBy.date_placed} value="placed" key="pending-select-placed" bgColor={userHoldPendingSortMethod == "placed" ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: userHoldPendingSortMethod == "placed" ? theme.tokens.colors.tertiary['500-text'] : textColor } }} />
                                                            <SelectItem label={sortBy.position} value="position" key="pending-select-position" bgColor={userHoldPendingSortMethod == "position" ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: userHoldPendingSortMethod == "position" ? theme.tokens.colors.tertiary['500-text'] : textColor } }} />
                                                            <SelectItem label={sortBy.pickup_location} value="location" key="pending-select-location" bgColor={userHoldPendingSortMethod == "location" ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: userHoldPendingSortMethod == "location" ? theme.tokens.colors.tertiary['500-text'] : textColor } }} />
                                                            <SelectItem label={sortBy.library_account} value="libraryAccount" key="pending-select-libraryAccount" bgColor={userHoldPendingSortMethod == "libraryAccount" ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: userHoldPendingSortMethod == "libraryAccount" ? theme.tokens.colors.tertiary['500-text'] : textColor } }}/>
                                                       </SelectScrollView>
                                                  </SelectContent>
                                             </SelectPortal>
                                        </Select>
                                   </FormControl>
                                   <ManageAllHolds language={language} data={holds} onDateChange={handleDateChange} selectedReactivationDate={date} resetGroup={resetGroup} />
                              </HStack>
                         </ScrollView>
                    </Box>
               );
          }

          const readySortLabel = () => {
               switch (userHoldReadySortMethod) {
                    case "author":
                         return sortBy.author;
                    case "format":
                         return sortBy.format;
                    case "status":
                         return sortBy.status;
                    case "placed":
                         return sortBy.date_placed;
                    case "position":
                         return sortBy.position;
                    case "location":
                         return sortBy.pickup_location;
                    case "libraryAccount":
                         return sortBy.library_account;
                    case "sortTitle":
                         return sortBy.title;
                    case "expire":
                         return sortBy.expiration;
                    default:
                         return getTermFromDictionary(language, 'select_sort_method');
               }
          };

          let readySortLength = 8 * sortBy.expiration.length + 80;
          if (userHoldReadySortMethod === 'author') {
               readySortLength = 8 * sortBy.author.length + 80;
          } else if (userHoldReadySortMethod === 'format') {
               readySortLength = 8 * sortBy.format.length + 80;
          } else if (userHoldReadySortMethod === 'status') {
               readySortLength = 8 * sortBy.status.length + 80;
          } else if (userHoldReadySortMethod === 'placed') {
               readySortLength = 8 * sortBy.date_placed.length + 80;
          } else if (userHoldReadySortMethod === 'position') {
               readySortLength = 8 * sortBy.position.length + 80;
          } else if (userHoldReadySortMethod === 'location') {
               readySortLength = 8 * sortBy.pickup_location.length + 80;
          } else if (userHoldReadySortMethod === 'libraryAccount') {
               readySortLength = 8 * sortBy.library_account.length + 80;
          } else if (userHoldReadySortMethod === 'sortTitle') {
               readySortLength = 8 * sortBy.title.length + 80;
          } else if (userHoldReadySortMethod === 'expire') {
               readySortLength = 8 * sortBy.expiration.length + 80;
          }

          if (section === 'ready') {
               return (
                    <Box p="$2">
                         <ScrollView horizontal>
                              <HStack space="sm">
                                   <FormControl w={readySortLength}>
                                        <Select
                                             name="sortBy"
                                             selectedValue={userHoldReadySortMethod}
                                             defaultValue={userHoldReadySortMethod}
                                             accessibilityLabel={getTermFromDictionary(language, 'select_sort_method')}
                                             onValueChange={(itemValue) => toggleReadySort(itemValue)}>
                                             <SelectTrigger variant="outline" size="sm">
                                                  <SelectInput py={0} color={textColor} value={readySortLabel()} />
                                                  <SelectIcon mr="$3">
                                                       <Icon color={textColor} as={ChevronDownIcon} />
                                                  </SelectIcon>
                                             </SelectTrigger>
                                             <SelectPortal>
                                                  <SelectBackdrop />
                                                  <SelectContent
                                                       bgColor={colorMode === 'light' ? "$warmGray50" : "$coolGray700"}
                                                       pb={Platform.OS === 'android' ? insets.bottom + 16 : '$4'}
                                                  >
                                                       <SelectDragIndicatorWrapper>
                                                            <SelectDragIndicator />
                                                       </SelectDragIndicatorWrapper>
                                                  <SelectItem label={sortBy.title} value="sortTitle" key="ready-sortTitle" bgColor={userHoldReadySortMethod == "sortTitle" ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: userHoldReadySortMethod == "sortTitle" ? theme.tokens.colors.tertiary['500-text'] : textColor } }} />
                                                  <SelectItem label={sortBy.author} value="author" key="ready-author" bgColor={userHoldReadySortMethod == "author" ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: userHoldReadySortMethod == "author" ? theme.tokens.colors.tertiary['500-text'] : textColor } }}/>
                                                  <SelectItem label={sortBy.format} value="format" key="ready-format" bgColor={userHoldReadySortMethod == "format" ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: userHoldReadySortMethod == "format" ? theme.tokens.colors.tertiary['500-text'] : textColor } }} />
                                                  <SelectItem label={sortBy.expiration} value="expire" key="ready-expire" bgColor={userHoldReadySortMethod == "expire" ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: userHoldReadySortMethod == "expire" ? theme.tokens.colors.tertiary['500-text'] : textColor } }}/>
                                                  <SelectItem label={sortBy.date_placed} value="placed" key="ready-placed" bgColor={userHoldReadySortMethod == "placed" ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: userHoldReadySortMethod == "placed" ? theme.tokens.colors.tertiary['500-text'] : textColor } }}/>
                                                  <SelectItem label={sortBy.pickup_location} value="location" key="ready-location" bgColor={userHoldReadySortMethod == "location" ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: userHoldReadySortMethod == "location" ? theme.tokens.colors.tertiary['500-text'] : textColor } }}/>
                                                  <SelectItem label={sortBy.library_account} value="libraryAccount" key="ready-libraryAccount" bgColor={userHoldReadySortMethod == "libraryAccount" ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: userHoldReadySortMethod == "libraryAccount" ? theme.tokens.colors.tertiary['500-text'] : textColor } }} />
                                                  </SelectContent>
                                             </SelectPortal>
                                        </Select>
                                   </FormControl>
                              </HStack>
                         </ScrollView>
                    </Box>
               );
          }

          const holdSourceLabel = () => {
               switch (holdSource) {
                   case "ils":
                         return getTermFromDictionary(language, 'filter_by_ils') + " (" + (user.numHoldsRequestedIls ?? 0) + ")";
                    case "overdrive":
                         return filterByLibby + " (" + (user.numHoldsOverDrive ?? 0) + ")";
                    case "hoopla":
                         return getTermFromDictionary(language, 'filter_by_hoopla') + " (" + (user.numHolds_Hoopla ?? 0) + ")";
                    case "cloud_library":
                         return getTermFromDictionary(language, 'filter_by_cloud_library') + " (" + (user.numHolds_cloudLibrary ?? 0) + ")";
                    case "axis360":
                         return getTermFromDictionary(language, 'filter_by_boundless') + " (" + (user.numHolds_axis360 ?? 0) + ")";
                    case "palace_project":
                         return getTermFromDictionary(language, 'filter_by_palace_project') + " (" + (user.numHolds_PalaceProject ?? 0) + ")";
                    default:
                         return getTermFromDictionary(language, 'filter_by_all') + " (" + (user.numHolds ?? 0) + ")";
               }
          };

          return (
               <Box p="$2" bgColor={colorMode === 'light' ? "$coolGray100" : "$coolGray700"} borderBottomWidth="$1" borderColor={colorMode === 'light' ? "$coolGray200" : "$warmGray600"} flexWrap="nowrap">
                    {showSystemMessage()}
                    <ScrollView horizontal>
                         <HStack space="sm">
                              <Button
                                   size="sm"
                                   borderColor={colorMode === 'light' ? "$coolGray700" : "$warmGray100"}
                                   variant="outline"
                                   onPress={() => {
                                        refreshHolds();
                                   }}>
                                   <ButtonText color={colorMode === 'light' ? "$coolGray700" : "$warmGray100"}>{getTermFromDictionary(language, 'holds_reload')}</ButtonText>
                              </Button>
                              <FormControl w={245}>
                                   <Select name="holdSource" selectedValue={holdSource} defaultValue={holdSource} initialLabel="Test" accessibilityLabel="Filter By Source" onValueChange={(itemValue) => toggleHoldSource(itemValue)}>
                                        <SelectTrigger variant="outline" size="sm">
                                             <SelectInput py={0} color={textColor} value={holdSourceLabel()}/>
                                             <SelectIcon mr="$3">
                                                  <Icon color={textColor} as={ChevronDownIcon} />
                                             </SelectIcon>
                                        </SelectTrigger>
                                        <SelectPortal>
                                             <SelectBackdrop />
                                             <SelectContent bgColor={colorMode === 'light' ? "$warmGray50" : "$coolGray700"} pb={Platform.OS === 'android' ? insets.bottom + 16 : '$4'}>
                                                  <SelectDragIndicatorWrapper>
                                                       <SelectDragIndicator />
                                                  </SelectDragIndicatorWrapper>
                                                  <SelectItem label={getTermFromDictionary(language, 'filter_by_all') + ' (' + (user.numHolds ?? 0) + ')'} value="all" key="source-all" bgColor={holdSource == 'all' ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: holdSource == 'all' ? theme.tokens.colors.tertiary['500-text'] : textColor } }} />
                                                  <SelectItem label={getTermFromDictionary(language, 'filter_by_ils') + ' (' + (user.numHoldsRequestedIls ?? 0) + ')'} value="ils" key="source-ils" bgColor={holdSource == 'ils' ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: holdSource == 'ils' ? theme.tokens.colors.tertiary['500-text'] : textColor } }} />
                                                  {user.isValidForOverdrive ? <SelectItem label={filterByLibby + ' (' + (user.numHoldsOverDrive ?? 0) + ')'} value="overdrive" key="source-overdrive" bgColor={holdSource == 'overdrive' ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: holdSource == 'overdrive' ? theme.tokens.colors.tertiary['500-text'] : textColor } }} /> : null}
                                                  {user.isValidForHoopla ? <SelectItem label={getTermFromDictionary(language, 'filter_by_hoopla') + ' (' + (user.numHolds_Hoopla ?? 0) + ')'} value="hoopla" key="source-hoopla" bgColor={holdSource == 'hoopla' ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: holdSource == 'hoopla' ? theme.tokens.colors.tertiary['500-text'] : textColor } }} /> : null}
                                                  {user.isValidForCloudLibrary ? <SelectItem label={getTermFromDictionary(language, 'filter_by_cloud_library') + ' (' + (user.numHolds_cloudLibrary ?? 0) + ')'} value="cloud_library" key="source-cloud_library" bgColor={holdSource == 'cloud_library' ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: holdSource == 'cloud_library' ? theme.tokens.colors.tertiary['500-text'] : textColor } }} /> : null}
                                                  {user.isValidForAxis360 ? <SelectItem label={getTermFromDictionary(language, 'filter_by_boundless') + ' (' + (user.numHolds_axis360 ?? 0) + ')'} value="axis360" key="source-axis360" bgColor={holdSource == 'axis360' ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: holdSource == 'axis360' ? theme.tokens.colors.tertiary['500-text'] : textColor } }} /> : null}
                                                  {user.isValidForPalaceProject ? <SelectItem label={getTermFromDictionary(language, 'filter_by_palace_project') + ' (' + (user.numHolds_PalaceProject ?? 0) + ')'} value="palace_project" key="source-palace_project" bgColor={holdSource == 'palace_project' ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: holdSource == 'palace_project' ? theme.tokens.colors.tertiary['500-text'] : textColor } }} /> : null}
                                             </SelectContent>
                                        </SelectPortal>
                                   </Select>
                              </FormControl>
                         </HStack>
                    </ScrollView>
               </Box>
          );
     };

     const displaySectionHeader = (title) => {
          if (title === 'Pending') {
               return (
                    <Box bgColor={colorMode === 'light' ? '$warmGray50' : '$coolGray800'} borderBottomWidth="$1" borderColor={colorMode === 'light' ? '$coolGray200' : '$warmGray600'} flexWrap="nowrap" maxWidth="100%" p="$2">
                         <Heading pb="$1" pt="$3" color={textColor}>
                              {getTermFromDictionary(language, 'pending_holds')}
                         </Heading>
                         <Alert borderRadius="$sm" action="info" mb="$2">
                              <HStack p="$3">
                                   <AlertIcon as={InfoIcon} mr="$3" />
                                   <AlertText fontSize="$xs">{getTermFromDictionary(language, 'pending_holds_message')}</AlertText>
                              </HStack>
                         </Alert>
                         {actionButtons('pending')}
                    </Box>
               );
          } else {
               return (
                    <Box bgColor={colorMode === 'light' ? '$warmGray50' : '$coolGray800'} borderBottomWidth="$1" borderColor={colorMode === 'light' ? '$coolGray200' : '$warmGray600'} flexWrap="nowrap" maxWidth="100%" p="$2">
                         <Heading pb="$1" color={textColor}>
                              {getTermFromDictionary(language, 'holds_ready_for_pickup')}
                         </Heading>
                         <Alert borderRadius="$sm" action="info" mb="$2">
                              <HStack p="$3">
                              <AlertIcon as={InfoIcon} mr="$3" />
                              <AlertText fontSize="$xs">{getTermFromDictionary(language, 'holds_ready_for_pickup_message')}</AlertText>
                              </HStack>
                         </Alert>
                         {actionButtons('ready')}
                    </Box>
               );
          }
     };

     const noHolds = (title) => {
          if (title === 'Pending') {
               return (
                    <Center p="$2">
                         <Text color={textColor} bold fontSize="$lg">
                              {getTermFromDictionary(language, 'pending_holds_none')}
                         </Text>
                    </Center>
               );
          } else {
               return (
                    <Center p="$2">
                         <Text color={textColor} bold fontSize="$lg">
                              {getTermFromDictionary(language, 'holds_ready_for_pickup_none')}
                         </Text>
                    </Center>
               );
          }
     };

     const displaySectionFooter = (title) => {
          const sectionData = find(filteredSections, { title: title });
          const sectionItems = sectionData?.data ?? [];
          if (title === 'Pending') {
               if (isEmpty(sectionItems)) {
                    return noHolds(title);
               } else {
                    return <Box mb="300px"></Box>;
               }
          } else if (title === 'Ready') {
               if (isEmpty(sectionItems)) {
                    return noHolds(title);
               }
          }
          return null;
     };

     const showSystemMessage = () => {
          if (isArray(systemMessages)) {
               return systemMessages.map((obj, index, collection) => {
                    if (obj.showOn === '0' || obj.showOn === '1' || obj.showOn === '3') {
                         return <DisplaySystemMessage key={`system-msg-${obj.id || index}`} style={obj.style} message={obj.message} dismissable={obj.dismissable} id={obj.id} all={systemMessages} url={library.baseUrl} updateSystemMessages={updateSystemMessages} queryClient={queryClient} />;
                    }
               });
          }
          return null;
     };

     const showLoading = isLoading || (isEmpty(holds) && isFetchingHolds);

     return (
          <Box flex={1}>
               {showLoading ? (
                    <LoadingSpinner />
               ) : (
                    <>
                         {actionButtons('none')}
                         <Box>
                              <CheckboxGroup
                                   style={{
                                        maxWidth: '100%',
                                        alignItems: 'center',
                                        _text: {
                                             textAlign: 'left',
                                        },
                                        padding: 0,
                                        margin: 0,
                                        paddingBottom: size(systemMessages) >= 2 ? 300 : 30,
                                   }}
                                   name="Holds"
                                   value={values}
                                   accessibilityLabel={getTermFromDictionary(language, 'multiple_holds')}
                                   onChange={(newValues) => {
                                        saveGroupValue(newValues);
                                   }}>
                                   {isObject(holds) ? (
                                        <SectionList
                                             style={{ width: '100%' }}
                                             sections={filteredSections}
                                             renderItem={({ item, section: { title } }) => <MyHold data={item} resetGroup={resetGroup} language={language} pickupLocations={pickupLocations} section={title} />}
                                             stickySectionHeadersEnabled={true}
                                             renderSectionHeader={({ section: { title } }) => displaySectionHeader(title)}
                                             renderSectionFooter={({ section: { title } }) => displaySectionFooter(title)}
                                             contentContainerStyle={{ paddingBottom: 30 }}
                                             keyExtractor={(item, index) => {
                                                  const source = item.source ?? '';
                                                  const itemId = item.cancelId ?? item.id;

                                                  // If we have at least one valid identifier, combine them
                                                  if (source || itemId) {
                                                       return `${source}-${itemId}`;
                                                  }

                                                  // Fallback to index if the unique identifiers are totally missing
                                                  return `hold-fallback-${index}`;
                                             }}
                                        />
                                   ) : null}
                              </CheckboxGroup>
                         </Box>
                    </>
               )}
          </Box>
     );
};
