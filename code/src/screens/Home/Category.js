import { FlatList, View } from 'react-native';
import { ThemedScrollView as ScrollView } from '@/src/components/themed/ThemedScrollView';
import _ from 'lodash';
import React from 'react';
import { useLibrary } from '../../hooks/useLibrarySystemData';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { Image } from 'expo-image';
import { ThemedMaterialIcons as MaterialIcons } from '@/src/components/themed/ThemedMaterialIcons';
import { navigateStack } from '../../helpers/RootNavigator';
import { getHomeScreenFeed } from '../../util/api/search';
import { updateBrowseCategoryStatus } from '../../util/api/user';
import { logDebugMessage, logErrorMessage, getErrorMessage } from '../../util/logging';
import { useMaxCategories, useToggleBrowseCategoryVisibility, useUpdateBrowseCategories } from '../../hooks/useBrowseCategoryData';
import { popToast } from '../../components/feedback';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { useTheme } from '../../themes/theme';
import { Box } from '@/components/ui/box';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { ThemedBadge as Badge, ThemedBadgeText as BadgeText } from '../../components/themed/ThemedBadge';

const loggedEmptyCategoryKeys = new Set();

/**
 * DisplayBrowseCategory component that renders a browse category with its records and subcategories. It handles the display of records, subcategories, and provides functionality to hide categories or subcategories. It also manages the state of selected subcategory and refreshes the home feed when necessary.
 * @param param0
 * @param param0.category
 * @returns {React.JSX.Element|null}
 * @constructor
 */
const DisplayBrowseCategory = ({category}) => {
     const { neutralPairs, colorMode } = useTheme();
     const language = useActiveLanguage();
     const library = useLibrary();
     const maxNum = useMaxCategories();
     const toggleCategoryVisibility = useToggleBrowseCategoryVisibility();
     const updateBrowseCategories = useUpdateBrowseCategories();

     const [selectedSubCategoryIndex, setSelectedSubCategoryIndex] = React.useState(0);
     const handleSelectSubCategory = (index) => setSelectedSubCategoryIndex(index);

     React.useEffect(() => {
          // Reset selected tab when the parent category changes.
          setSelectedSubCategoryIndex(0);
     }, [category?.id, category?.textId, category?.sourceListId]);

     const subCategories = category.subCategories ?? [];
     const records = category.records ?? [];

     if(records.length === 0 && subCategories.length === 0) {
          const emptyKey = category.textId ?? category.id ?? category.label ?? 'unknown_category';
          if (!loggedEmptyCategoryKeys.has(emptyKey)) {
               // Avoid repeated logs for the same empty category on re-renders.
               logDebugMessage('No records to show for ' + emptyKey);
               loggedEmptyCategoryKeys.add(emptyKey);
          }
          return null;
     }

     const showSubCategoryRecords =
          subCategories.length > 0 && (subCategories[selectedSubCategoryIndex]?.records?.length > 0 || subCategories[selectedSubCategoryIndex].records?.titles?.length > 0);

     const maxItems = 7;

     const hasMore = records.length > maxItems;
     const displayedData = hasMore ? records.slice(0, maxItems) : records;

     const isSystemBrowseCategory = category.textId === 'system_user_lists' || category.textId === 'system_saved_searches' || category.textId === 'system_recommended_for_you';
     const isListSource = category.source === 'List';

     let subCategoryRecords = [];
     let subCategoryHasMore = false;
     if (showSubCategoryRecords) {
          let allRecords;
          if(category.textId === 'system_user_lists') {
               allRecords = subCategories[selectedSubCategoryIndex].records.titles;
          } else {
               allRecords = subCategories[selectedSubCategoryIndex].records;
          }
          subCategoryHasMore = allRecords.length > maxItems;
          subCategoryRecords = subCategoryHasMore ? allRecords.slice(0, maxItems) : allRecords;
     }

     const id = isListSource ? category.sourceListId : category.textId;

     const refreshHomeFeed = React.useCallback(async () => {
          const requestedMax = maxNum > 0 ? maxNum : 5;
          const response = await getHomeScreenFeed(requestedMax, library.baseUrl);
          if (response?.ok) {
               const result = response.data?.result ?? {};
               await updateBrowseCategories(result.browseCategories ?? []);
          }
     }, [maxNum, library.baseUrl, updateBrowseCategories]);

     const onPressHide = async (textId) => {
          // Optimistic update: toggle visibility immediately
          const result = await toggleCategoryVisibility(textId, true, () =>
               updateBrowseCategoryStatus(textId, library.baseUrl)
          );

          if (!result.success) {
               const error = getErrorMessage({ statusCode: result.error?.status, problem: result.error?.problem });
               logErrorMessage(result.error);
               popToast(error.title, error.message, 'error');
          } else {
               await refreshHomeFeed();
          }
     }

     const onPressHideAll = async (textId) => {
          // Optimistic update: toggle visibility immediately
          const result = await toggleCategoryVisibility(textId, true, () =>
               updateBrowseCategoryStatus(textId, library.baseUrl, 'all')
          );

          if (!result.success) {
               const error = getErrorMessage({ statusCode: result.error?.status, problem: result.error?.problem });
               logErrorMessage(result.error);
               popToast(error.title, error.message, 'error');
          } else {
               await refreshHomeFeed();
          }
     }

     return (
          <View className="pb-12">
               <HStack space="md" className="items-center justify-between pb-2">
                         <DisplayBrowseCategoryTitle category={category.label} key={category.id} textId={id} source={category.source ?? 'GroupedWork'} />
                         {subCategories.length > 0 ? (
                             <Button variant="outline" size="xs" className="py-0" style={{ borderColor: colorMode === 'light' ? neutralPairs.textMuted.light : neutralPairs.white, paddingHorizontal: 6, height: 24 }} onPress={() => onPressHideAll(category.textId)}>
                                  <MaterialIcons name="close" size={14} color={colorMode === 'light' ? neutralPairs.textMuted.light : neutralPairs.white} className="mr-1" />
                                  <ButtonText style={{ color: colorMode === 'light' ? neutralPairs.textMuted.light : neutralPairs.white }}>{getTermFromDictionary(language, 'hide_all')}</ButtonText>
                              </Button>
                         ) : (
                             <Button variant="outline" size="xs" className="py-0" style={{ borderColor: colorMode === 'light' ? neutralPairs.textMuted.light : neutralPairs.white, paddingHorizontal: 6, height: 24 }} onPress={() => onPressHide(category.textId)}>
                                  <MaterialIcons name="close" size={14} color={colorMode === 'light' ? neutralPairs.textMuted.light : neutralPairs.white} className="mr-1" />
                                  <ButtonText style={{ color: colorMode === 'light' ? neutralPairs.textMuted.light : neutralPairs.white }}>{getTermFromDictionary(language, 'hide')}</ButtonText>
                              </Button>
                         )}
                    </HStack>
                    {subCategories.length > 0 ? (
                         <>
                              <ScrollView
                                   horizontal
                                   showsHorizontalScrollIndicator={false}
                                   contentContainerStyle={{ flexDirection: 'row', alignItems: 'center' }}
                              >
                                   <DisplaySubCategoryBar data={subCategoryRecords} subCategories={subCategories} selectedIndex={selectedSubCategoryIndex} onSelect={handleSelectSubCategory} isSystemBrowseCategory={isSystemBrowseCategory} />
                              </ScrollView>
                              {showSubCategoryRecords && <FlatList data={subCategoryRecords} keyExtractor={(item, index) => item.key?.toString() ?? item.id?.toString() ?? `subcategory-${index}`} horizontal renderItem={({ item }) => <DisplayBrowseCategoryRecord record={item} />} ListFooterComponent={subCategoryHasMore ? <DisplayMoreResultsButton category={subCategories[selectedSubCategoryIndex]} /> : null} />}
                         </>
                    ) : records.length > 0 ? (
                         <FlatList contentContainerStyle={{ paddingBottom: 5 }} data={displayedData} keyExtractor={(item, index) => item.id?.toString() ?? item.key?.toString() ?? `record-${index}`} horizontal renderItem={({ item }) => <DisplayBrowseCategoryRecord record={item} />} ListFooterComponent={hasMore ? <DisplayMoreResultsButton category={category} /> : null} />
                    ) : null}
          </View>
     );
};

/**
 * DisplayBrowseCategoryTitle component that renders the title of a browse category. It uses the theme and color mode from the current theme context to style the text appropriately.
 * @param param0
 * @param param0.category
 * @returns {React.JSX.Element}
 * @constructor
 */
const DisplayBrowseCategoryTitle = ({category}) => {
     const { neutrals } = useTheme();

     return (
          <Pressable className="max-w-[80%]" /*onPress={() => onPressCategory(category, textId, source)}*/>
               <Text
                    bold
                    size="lg"
                    className="mb-1"
                    style={{ color: neutrals.textMain }}
                    >
                    {category}
               </Text>
          </Pressable>
     );
}

/**
 * DisplayBrowseCategoryRecord component that renders a single record within a browse category. It handles the display of the record's image, title, and "new" badge if applicable. It also manages navigation to the appropriate screen based on the record's type when pressed.
 * @param param0
 * @param param0.record
 * @returns {React.JSX.Element}
 * @constructor
 */
const DisplayBrowseCategoryRecord = ({record}) => {
     const library = useLibrary();
     const { neutralPairs } = useTheme();
     const language = useActiveLanguage();

     let type = 'grouped_work';
     if (!_.isUndefined(record.source)) {
          if (record.source === 'library_calendar' || record.source === 'springshare_libcal' || record.source === 'communico' || record.source === 'assabet' || record.source === 'aspenEvents' || record.source === 'aspenEvent') {
               type = 'Event';
          } else {
               type = record.source;
          }
     }

     if (!_.isUndefined(record.type)) {
          type = record.type;
     } else if (!_.isUndefined(record.recordtype)) {
          type = record.recordtype;
     }

     let id = record.key ?? record.id;
     if (typeof id === 'string' && (id.startsWith('bc_') || id.startsWith('sbc_'))) {
          id = record.textId;
     }

     if (!_.isUndefined(record.listId) && !_.isUndefined(record.sourceId)) {
          id = record.sourceId;
     }

     if (type === 'Event' || type === 'event') {
          if (_.includes(id, 'lc_')) {
               type = 'library_calendar_event';
          }
          if (_.includes(id, 'libcal_')) {
               type = 'springshare_libcal_event';
          }
          if (_.includes(id, 'communico_')) {
               type = 'communico_event';
          }
          if (_.includes(id, 'assabet_')) {
               type = 'assabet_event';
          }
          if (_.includes(id, 'aspenEvent_')) {
               type = 'aspenEvent_event';
          }
     }

     if(type !== 'aspenEvent_event') {
          type = type.toLowerCase();
     }

     if(type === 'groupedwork') {
          type = 'grouped_work';
     }

     const blurhash = 'MHPZ}tt7*0WC5S-;ayWBofj[K5RjM{ofM_';
     const imageUrl = library.baseUrl + '/bookcover.php?id=' + id + '&size=medium&type=' + type;

     let isNew = false;
     if (typeof record.isNew !== 'undefined') {
          isNew = record.isNew;
     }

     let getTitle = record.title_display ?? record.title;
     if (typeof getTitle === 'undefined') {
          if(record.label) {
               getTitle = record.label;
          } else {
               getTitle = 'Unknown';
          }
     }

     const onPressItem = (key, type, title) => {
          if (type === 'List' || type === 'list') {
               navigateStack('BrowseTab', 'SearchByList', {
                    id: key,
                    title: title,
                    prevRoute: 'HomeScreen' });
          } else if (type === 'SavedSearch' || type === 'savedsearch') {
               navigateStack('BrowseTab', 'SearchBySavedSearch', {
                    id: key,
                    title: title,
                    prevRoute: 'HomeScreen' });
          } else if (type === 'Event' || _.includes(type, '_event')) {
               let eventSource = 'unknown';
               if (type === 'communico_event') {
                    eventSource = 'communico';
               } else if (type === 'library_calendar_event') {
                    eventSource = 'library_calendar';
               } else if (type === 'springshare_libcal_event') {
                    eventSource = 'springshare';
               } else if (type === 'assabet_event') {
                    eventSource = 'assabet';
               } else if (type === 'aspenEvent_event') {
                    eventSource = 'aspenEvents';
               }

               navigateStack('BrowseTab', 'EventScreen', {
                    id: key,
                    title: title,
                    source: eventSource,
                    prevRoute: 'HomeScreen' });
          } else {
               navigateStack('BrowseTab', 'GroupedWorkScreen', {
                    id: key,
                    title: title,
                    prevRoute: 'HomeScreen' });
          }
     }

     return (
          <Pressable
               onPress={() => onPressItem(id, type, getTitle)}
               className="ml-1 mr-3 w-25 h-[150px]">
               <Image
                    alt={getTitle}
                    source={imageUrl}
                    className="rounded-lg"
                    style={{ width: '100%', height: '100%' }}
                    placeholder={blurhash}
                    transition={0}
                    cachePolicy="memory-disk"
                    contentFit="cover"
               />
               {isNew ? (
                    <Box style={{ zIndex: 1, alignItems: 'center' }}>
                         <Badge colorScheme="warning" className="mx-5" style={{ backgroundColor: '#f59e0b', marginTop: -8 }}>
                              <BadgeText colorScheme="warning" bold style={{ color: neutralPairs.white, textTransform: 'none' }}>
                                   {getTermFromDictionary(language, 'flag_new')}
                              </BadgeText>
                         </Badge>
                    </Box>
               ) : null}
          </Pressable>
     )
}

/**
 * DisplaySubCategoryBar component that renders a horizontal bar of subcategories for a browse category. It allows users to select a subcategory and provides functionality to hide individual subcategories. The component uses the theme and color mode from the current theme context to style the buttons appropriately.
 * @param param0
 * @param param0.subCategories
 * @param param0.selectedIndex
 * @param param0.onSelect
 * @param param0.isSystemBrowseCategory
 * @returns {React.JSX.Element}
 * @constructor
 */
const DisplaySubCategoryBar = ({ subCategories, selectedIndex, onSelect, isSystemBrowseCategory }) => {
     const { brand } = useTheme();
     const library = useLibrary();
     const maxNum = useMaxCategories();
     const toggleCategoryVisibility = useToggleBrowseCategoryVisibility();
     const updateBrowseCategories = useUpdateBrowseCategories();

     const refreshHomeFeed = React.useCallback(async () => {
          const requestedMax = maxNum > 0 ? maxNum : 5;
          const response = await getHomeScreenFeed(requestedMax, library.baseUrl);
          if (response?.ok) {
               const result = response.data?.result ?? {};
               await updateBrowseCategories(result.browseCategories ?? []);
          }
     }, [maxNum, library.baseUrl, updateBrowseCategories]);

     const onPressHideSubCategory = async (index) => {
          let activeSubCategory = subCategories[index];
          // Optimistic update: toggle visibility immediately
          const result = await toggleCategoryVisibility(activeSubCategory.textId, true, () =>
               updateBrowseCategoryStatus(activeSubCategory.textId, library.baseUrl)
          );

          if (!result.success) {
               const error = getErrorMessage({ statusCode: result.error?.status, problem: result.error?.problem });
               logErrorMessage(result.error);
               popToast(error.title, error.message, 'error');
          } else {
               await refreshHomeFeed();
          }
     }

     return (
          <ButtonGroup space="sm" className="flex-row items-center pb-2">
               {subCategories.map((subCategory, index) => (
                   <Button key={(subCategory?.id ?? subCategory?.textId ?? subCategory?.label ?? `subcategory-${index}`).toString()} colorScheme="primary" variant="solid" className="px-3" style={{ height: 34, opacity: selectedIndex === index ? 1 : 0.75 }} onPress={() => onSelect(index)}>
                        <ButtonText className="font-medium">
                              {subCategory.label}
                         </ButtonText>
                        {!isSystemBrowseCategory && <MaterialIcons name="close" size={14} color={brand.primary['500-text']} className="ml-4" onPress={() => onPressHideSubCategory(index)} />}
                    </Button>
               ))}
          </ButtonGroup>
     );
}

/**
 * DisplayMoreResultsButton component that renders a button to view more results for a given category. When pressed, it navigates to the appropriate screen based on the category's source. The component uses the theme and color mode from the current theme context to style the button appropriately.
 * @param param0
 * @param param0.category
 * @returns {React.JSX.Element}
 * @constructor
 */
const DisplayMoreResultsButton = ({ category }) => {
     const { brand } = useTheme();
     const language = useActiveLanguage();

     const isListSource = category.source === 'List';

     const onPressMoreResults = (label, key, source) => {
          let screen = 'SearchByCategory';
          if (source === 'List' || source === 'userList') {
               screen = 'SearchByList';
          } else if (source === 'SavedSearch') {
               screen = 'SearchBySavedSearch';
          }

          navigateStack('BrowseTab', screen, {
               title: label,
               id: key });
     }

     return (
          <Pressable
               onPress={() => onPressMoreResults(category.label, isListSource ? category.sourceListId : category.textId, category.source ?? 'GroupedWork')}
               className="ml-1 mr-3 rounded-lg"
               style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: brand.primary[500],
                    width: 100,
                    height: 150 }}>
               <Text bold style={{ color: brand.primary['500-text'] }}>{getTermFromDictionary(language, 'view_more')}</Text>
          </Pressable>
     )
}

/**
 * Export the DisplayBrowseCategory component wrapped in React.memo to optimize rendering. The memoization checks if the category prop has changed, preventing unnecessary re-renders when the category data remains the same.
 */
export default React.memo(DisplayBrowseCategory, (prevProps, nextProps) => _.isEqual(prevProps.category, nextProps.category));
