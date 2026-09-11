import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query';
import _ from 'lodash';
import React from 'react';
import { SectionList } from 'react-native';
import { ThemedAlert as Alert, ThemedAlertIcon as AlertIcon, ThemedAlertText as AlertText } from '@/src/components/themed/ThemedAlert';
import { Box } from '@/components/ui/box';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../../components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { ThemedCheckboxGroup as CheckboxGroup } from '../../../components/themed/ThemedCheckbox';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { HStack } from '@/components/ui/hstack';
import { ThemedScrollView as ScrollView } from '@/src/components/themed/ThemedScrollView';
import { ThemedSelect as Select, ThemedSelectBackdrop as SelectBackdrop, ThemedSelectContent as SelectContent, ThemedSelectDragIndicator as SelectDragIndicator, ThemedSelectDragIndicatorWrapper as SelectDragIndicatorWrapper, ThemedSelectInput as SelectInput, ThemedSelectItem as SelectItem, ThemedSelectPortal as SelectPortal, ThemedSelectScrollView as SelectScrollView, ThemedSelectTrigger as SelectTrigger } from '../../../components/themed/ThemedSelect';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { ScreenContainer, screenContentContainerStyle } from '@/src/components/ScreenContainer';
import { LoadingSpinner } from '@/src/components/loadingSpinner';
import { DisplaySystemMessage } from '@/src/components/Notifications';
import { HoldsContext, SystemMessagesContext } from '@/src/context/initialContext';
import { useUserState, useLocations, useUpdateLocations, useUpdateSortSettings, useUpdateUserProfile } from '@/src/hooks/useUserData';
import { getTermFromDictionary, getTranslationsWithValues } from '@/src/translations/TranslationService';
import { getPatronHolds, refreshProfile, setSortPreferences } from '@/src/util/api/user';
import { sortHolds, formatHolds, formatPickupLocations } from '@/src/util/api/userHelper';
import { getPickupLocations } from '@/src/util/api/user';
import { ManageAllHolds, ManageSelectedHolds, MyHold } from './MyHold';
import { logDebugMessage, logErrorMessage, getErrorMessage } from '@/src/util/logging';
import { useActiveLanguage } from '@/src/hooks/useLanguageData';
import { useTheme } from '@/src/themes/theme';
import { useLibrary } from '@/src/hooks/useLibrarySystemData';

/**
 * MyHolds component that displays the user's holds, allowing them to sort, filter, and manage their holds. It fetches the user's holds from the API and provides options for sorting and filtering based on various criteria.
 * @returns {React.JSX.Element}
 * @constructor
 */
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
     const [pickupLocations] = React.useState([]);
     const { systemMessages, updateSystemMessages } = React.useContext(SystemMessagesContext);
     const { neutrals, textColor } = useTheme();
     const surfaceBg = neutrals.surface;
     const borderColor = neutrals.border;

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
          onSettle: () => setLoading(false),
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
          if (!_.isNull(value)) {
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
                    let term;

                    term = getTermFromDictionary(language, 'sort_by_title');

                    if (!term.includes('%1%')) {
                         tmp = _.set(tmp, 'title', term);
                         setSortBy(tmp);
                    }

                    term = getTermFromDictionary(language, 'sort_by_author');
                    if (!term.includes('%1%')) {
                         tmp = _.set(tmp, 'author', term);
                         setSortBy(tmp);
                    }

                    term = getTermFromDictionary(language, 'sort_by_format');
                    if (!term.includes('%1%')) {
                         tmp = _.set(tmp, 'format', term);
                         setSortBy(tmp);
                    }

                    term = getTermFromDictionary(language, 'sort_by_status');
                    if (!term.includes('%1%')) {
                         tmp = _.set(tmp, 'status', term);
                         setSortBy(tmp);
                    }

                    term = getTermFromDictionary(language, 'sort_by_date_placed');
                    if (!term.includes('%1%')) {
                         tmp = _.set(tmp, 'date_placed', term);
                         setSortBy(tmp);
                    }

                    term = getTermFromDictionary(language, 'sort_by_position');
                    if (!term.includes('%1%')) {
                         tmp = _.set(tmp, 'position', term);
                         setSortBy(tmp);
                    }

                    term = getTermFromDictionary(language, 'sort_by_pickup_location');
                    if (!term.includes('%1%')) {
                         tmp = _.set(tmp, 'pickup_location', term);
                         setSortBy(tmp);
                    }

                    term = getTermFromDictionary(language, 'sort_by_library_account');
                    if (!term.includes('%1%')) {
                         tmp = _.set(tmp, 'library_account', term);
                         setSortBy(tmp);
                    }

                    term = getTermFromDictionary(language, 'sort_by_expiration');
                    if (!term.includes('%1%')) {
                         tmp = _.set(tmp, 'expiration', term);
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
                        <Box className="p-2">
                             <ScrollView horizontal>
                                   <HStack space="sm" className="items-center">
                                        <Box style={{ width: pendingSortLength }}>
                                            <Select
                                                 name="sortBy"
                                                 selectedValue={userHoldPendingSortMethod}
                                                 accessibilityLabel={getTermFromDictionary(language, 'select_sort_method')}
                                                 onValueChange={(itemValue) => togglePendingSort(itemValue)}>
                                                 <SelectTrigger size="sm">
                                                       <SelectInput value={pendingSortLabel()} />
                                                  </SelectTrigger>
                                                  <SelectPortal>
                                                       <SelectBackdrop />
                                                       <SelectContent>
                                                            <SelectDragIndicatorWrapper>
                                                                 <SelectDragIndicator />
                                                            </SelectDragIndicatorWrapper>
                                                            <SelectScrollView>
                                                                 <SelectItem label={sortBy.title} value="sortTitle" key="pending-manage-sortTitle" selectedValue={userHoldPendingSortMethod} />
                                                                 <SelectItem label={sortBy.author} value="author" key="pending-manage-author" selectedValue={userHoldPendingSortMethod} />
                                                                 <SelectItem label={sortBy.format} value="format" key="pending-manage-format" selectedValue={userHoldPendingSortMethod} />
                                                                 <SelectItem label={sortBy.status} value="status" key="pending-manage-status" selectedValue={userHoldPendingSortMethod} />
                                                                 <SelectItem label={sortBy.date_placed} value="placed" key="pending-manage-placed" selectedValue={userHoldPendingSortMethod} />
                                                                 <SelectItem label={sortBy.position} value="position" key="pending-manage-position" selectedValue={userHoldPendingSortMethod} />
                                                                 <SelectItem label={sortBy.pickup_location} value="location" key="pending-manage-location" selectedValue={userHoldPendingSortMethod} />
                                                                 <SelectItem label={sortBy.library_account} value="libraryAccount" key="pending-manage-libraryAccount" selectedValue={userHoldPendingSortMethod} />
                                                            </SelectScrollView>
                                                       </SelectContent>
                                                  </SelectPortal>
                                             </Select>
                                        </Box>
                                        <ManageSelectedHolds language={language} selectedValues={values} onAllDateChange={handleDateChange} selectedReactivationDate={date} resetGroup={resetGroup} />
                                        <Button size="sm" variant="outline" className="mr-1" style={{ borderColor }} onPress={() => clearGroupValue()}>
                                             <ButtonText style={{ color: textColor }}>{getTermFromDictionary(language, 'holds_clear_selections')}</ButtonText>
                                        </Button>
                                   </HStack>
                             </ScrollView>
                         </Box>
                    );
               }

               return (
                   <Box className="p-2">
                         <ScrollView horizontal>
                              <HStack space="sm" className="items-center">
                                   <Box style={{ width: pendingSortLength }}>
                                        <Select
                                             name="sortBy"
                                             selectedValue={userHoldPendingSortMethod}
                                             defaultValue={userHoldPendingSortMethod}
                                             accessibilityLabel={getTermFromDictionary(language, 'select_sort_method')}
                                             onValueChange={(itemValue) => togglePendingSort(itemValue)}>
                                             <SelectTrigger size="sm">
                                                  <SelectInput value={pendingSortLabel()} />
                                             </SelectTrigger>
                                             <SelectPortal>
                                                  <SelectBackdrop />
                                                  <SelectContent>
                                                       <SelectDragIndicatorWrapper>
                                                            <SelectDragIndicator />
                                                       </SelectDragIndicatorWrapper>
                                                       <SelectScrollView>
                                                            <SelectItem label={sortBy.title} value="sortTitle" key="pending-select-sortTitle" selectedValue={userHoldPendingSortMethod} />
                                                            <SelectItem label={sortBy.author} value="author" key="pending-select-author" selectedValue={userHoldPendingSortMethod} />
                                                            <SelectItem label={sortBy.format} value="format" key="pending-select-format" selectedValue={userHoldPendingSortMethod} />
                                                            <SelectItem label={sortBy.status} value="status" key="pending-select-status" selectedValue={userHoldPendingSortMethod} />
                                                            <SelectItem label={sortBy.date_placed} value="placed" key="pending-select-placed" selectedValue={userHoldPendingSortMethod} />
                                                            <SelectItem label={sortBy.position} value="position" key="pending-select-position" selectedValue={userHoldPendingSortMethod} />
                                                            <SelectItem label={sortBy.pickup_location} value="location" key="pending-select-location" selectedValue={userHoldPendingSortMethod} />
                                                            <SelectItem label={sortBy.library_account} value="libraryAccount" key="pending-select-libraryAccount" selectedValue={userHoldPendingSortMethod} />
                                                       </SelectScrollView>
                                                  </SelectContent>
                                             </SelectPortal>
                                        </Select>
                                   </Box>
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
                   <Box className="p-2">
                         <ScrollView horizontal>
                              <HStack space="sm" className="items-center">
                                   <Box style={{ width: readySortLength }}>
                                        <Select
                                             name="sortBy"
                                             selectedValue={userHoldReadySortMethod}
                                             defaultValue={userHoldReadySortMethod}
                                             accessibilityLabel={getTermFromDictionary(language, 'select_sort_method')}
                                             onValueChange={(itemValue) => toggleReadySort(itemValue)}>
                                             <SelectTrigger size="sm">
                                                  <SelectInput value={readySortLabel()} />
                                             </SelectTrigger>
                                             <SelectPortal>
                                                  <SelectBackdrop />
                                                  <SelectContent>
                                                       <SelectDragIndicatorWrapper>
                                                            <SelectDragIndicator />
                                                       </SelectDragIndicatorWrapper>
                                                 <SelectItem label={sortBy.title} value="sortTitle" key="ready-sortTitle" selectedValue={userHoldReadySortMethod} />
                                                 <SelectItem label={sortBy.author} value="author" key="ready-author" selectedValue={userHoldReadySortMethod} />
                                                 <SelectItem label={sortBy.format} value="format" key="ready-format" selectedValue={userHoldReadySortMethod} />
                                                 <SelectItem label={sortBy.expiration} value="expire" key="ready-expire" selectedValue={userHoldReadySortMethod} />
                                                 <SelectItem label={sortBy.date_placed} value="placed" key="ready-placed" selectedValue={userHoldReadySortMethod} />
                                                 <SelectItem label={sortBy.pickup_location} value="location" key="ready-location" selectedValue={userHoldReadySortMethod} />
                                                 <SelectItem label={sortBy.library_account} value="libraryAccount" key="ready-libraryAccount" selectedValue={userHoldReadySortMethod} />
                                                  </SelectContent>
                                             </SelectPortal>
                                        </Select>
                                   </Box>
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
               <Box className={section === 'none' ? 'px-2 py-2' : 'px-2 py-2'} style={{ backgroundColor: surfaceBg, borderBottomWidth: 1, borderColor, flexWrap: 'nowrap' }}>
                    {showSystemMessage()}
                    <ScrollView horizontal>
                         <HStack space="sm" className="items-center">
                              <Button
                                   size="sm"
                                   variant="outline"
                                   style={{ borderColor }}
                                   onPress={() => {
                                        refreshHolds();
                                   }}>
                                   <ButtonText style={{ color: textColor }}>{getTermFromDictionary(language, 'holds_reload')}</ButtonText>
                              </Button>
                              <Box style={{ width: 245 }}>
                                   <Select name="holdSource" selectedValue={holdSource} defaultValue={holdSource} initialLabel="Test" accessibilityLabel="Filter By Source" onValueChange={(itemValue) => toggleHoldSource(itemValue)}>
                                        <SelectTrigger size="sm">
                                             <SelectInput value={holdSourceLabel()}/>
                                        </SelectTrigger>
                                        <SelectPortal>
                                             <SelectBackdrop />
                                             <SelectContent>
                                                  <SelectDragIndicatorWrapper>
                                                       <SelectDragIndicator />
                                                  </SelectDragIndicatorWrapper>
                                                  <SelectItem label={getTermFromDictionary(language, 'filter_by_all') + ' (' + (user.numHolds ?? 0) + ')'} value="all" key="source-all" selectedValue={holdSource} />
                                                  <SelectItem label={getTermFromDictionary(language, 'filter_by_ils') + ' (' + (user.numHoldsRequestedIls ?? 0) + ')'} value="ils" key="source-ils" selectedValue={holdSource} />
                                                  {user.isValidForOverdrive ? <SelectItem label={filterByLibby + ' (' + (user.numHoldsOverDrive ?? 0) + ')'} value="overdrive" key="source-overdrive" selectedValue={holdSource} /> : null}
                                                  {user.isValidForHoopla ? <SelectItem label={getTermFromDictionary(language, 'filter_by_hoopla') + ' (' + (user.numHolds_Hoopla ?? 0) + ')'} value="hoopla" key="source-hoopla" selectedValue={holdSource} /> : null}
                                                  {user.isValidForCloudLibrary ? <SelectItem label={getTermFromDictionary(language, 'filter_by_cloud_library') + ' (' + (user.numHolds_cloudLibrary ?? 0) + ')'} value="cloud_library" key="source-cloud_library" selectedValue={holdSource} /> : null}
                                                  {user.isValidForAxis360 ? <SelectItem label={getTermFromDictionary(language, 'filter_by_boundless') + ' (' + (user.numHolds_axis360 ?? 0) + ')'} value="axis360" key="source-axis360" selectedValue={holdSource} /> : null}
                                                  {user.isValidForPalaceProject ? <SelectItem label={getTermFromDictionary(language, 'filter_by_palace_project') + ' (' + (user.numHolds_PalaceProject ?? 0) + ')'} value="palace_project" key="source-palace_project" selectedValue={holdSource} /> : null}
                                             </SelectContent>
                                        </SelectPortal>
                                   </Select>
                              </Box>
                         </HStack>
                    </ScrollView>
               </Box>
          );
     };

     const displaySectionHeader = (title) => {
          if (title === 'Pending') {
               return (
                    <Box className="px-2 py-2" style={{ backgroundColor: surfaceBg, borderBottomWidth: 1, borderColor, flexWrap: 'nowrap', maxWidth: '100%' }}>
                         <Heading className="pb-1 pt-3">{getTermFromDictionary(language, 'pending_holds')}</Heading>
                         <Alert action="info">
                              <HStack>
                                   <AlertIcon action="info" />
                                   <AlertText action="info" size="xs">
                                        {getTermFromDictionary(language, 'pending_holds_message')}
                                   </AlertText>
                              </HStack>
                         </Alert>
                         {actionButtons('pending')}
                    </Box>
               );
          } else {
               return (
                    <Box className="px-2 py-2" style={{ backgroundColor: surfaceBg, borderBottomWidth: 1, borderColor, flexWrap: 'nowrap', maxWidth: '100%' }}>
                         <Heading className="pb-1">{getTermFromDictionary(language, 'holds_ready_for_pickup')}</Heading>
                         <Alert action="info">
                              <HStack>
                                   <AlertIcon action="info" />
                                   <AlertText action="info" size="xs">
                                        {getTermFromDictionary(language, 'holds_ready_for_pickup_message')}
                                   </AlertText>
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
                   <Center className="py-2">
                        <Text bold size="lg">
                              {getTermFromDictionary(language, 'pending_holds_none')}
                         </Text>
                    </Center>
               );
          } else {
               return (
                   <Center className="py-2">
                        <Text bold size="lg">
                              {getTermFromDictionary(language, 'holds_ready_for_pickup_none')}
                         </Text>
                    </Center>
               );
          }
     };

     const displaySectionFooter = (title) => {
          const sectionData = _.find(filteredSections, { title: title });
          const sectionItems = sectionData?.data ?? [];
          if (title === 'Pending') {
               if (_.isEmpty(sectionItems)) {
                    return noHolds(title);
               } else {
                    return <Box className="mb-75" />;
               }
          } else if (title === 'Ready') {
               if (_.isEmpty(sectionItems)) {
                    return noHolds(title);
               }
          }
          return null;
     };

     const showSystemMessage = () => {
          if (_.isArray(systemMessages)) {
               return systemMessages.map((obj, index) => {
                    if (obj.showOn === '0' || obj.showOn === '1' || obj.showOn === '3') {
                         return <DisplaySystemMessage key={`system-msg-${obj.id || index}`} style={obj.style} message={obj.message} dismissable={obj.dismissable} id={obj.id} all={systemMessages} url={library.baseUrl} updateSystemMessages={updateSystemMessages} queryClient={queryClient} />;
                    }
               });
          }
          return null;
     };

     const showLoading = isLoading || (_.isEmpty(holds) && isFetchingHolds);

     return (
          <>
               {!showLoading ? actionButtons('none') : null}
               {showLoading ? (
                    <ScreenContainer>
                         <LoadingSpinner />
                    </ScreenContainer>
               ) : (
                    <Box>
                         <CheckboxGroup
                              className="p-0 m-0"
                              style={{
                                   maxWidth: '100%',
                                   alignItems: 'center',
                                   _text: {
                                        textAlign: 'left',
                                   },
                                   paddingBottom: _.size(systemMessages) >= 2 ? 300 : 30,
                              }}
                              name="Holds"
                              value={values}
                              accessibilityLabel={getTermFromDictionary(language, 'multiple_holds')}
                              onChange={(newValues) => {
                                   saveGroupValue(newValues);
                              }}>
                              {_.isObject(holds) ? (
                                   <SectionList
                                        className="w-full"
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
               )}
          </>
     );
};
