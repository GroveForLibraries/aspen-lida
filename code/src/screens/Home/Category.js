import { Button, ButtonGroup, ButtonIcon, ButtonText, FlatList, View, HStack, Pressable, Text, SafeAreaView, Box, Badge, BadgeText } from '@gluestack-ui/themed';
import { ScrollView } from 'react-native';
import _ from 'lodash';
import React from 'react';

import { useLibrary } from '../../hooks/useLibrarySystemData';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { navigateStack } from '../../helpers/RootNavigator';
import { getHomeScreenFeed } from '../../util/api/search';
import { updateBrowseCategoryStatus } from '../../util/api/user';
import { logDebugMessage, logErrorMessage, getErrorMessage } from '../../util/logging';
import { useMaxCategories, useToggleBrowseCategoryVisibility, useUpdateBrowseCategories } from '../../hooks/useBrowseCategoryData';
import { popToast } from '../../components/feedback';

import { useActiveLanguage } from '../../hooks/useLanguageData';
import { useTheme } from '../../themes/theme';
import { isValidUrl } from '../../helpers/helpers';

const loggedEmptyCategoryKeys = new Set();

const DisplayBrowseCategory = ({category}) => {
     const { theme, colorMode } = useTheme();
     const language = useActiveLanguage();
     const library = useLibrary();
     const maxNum = useMaxCategories();
     const toggleCategoryVisibility = useToggleBrowseCategoryVisibility();
     const updateBrowseCategories = useUpdateBrowseCategories();

     const [showErrorDialog, setShowErrorDialog] = React.useState(false);
     const [errorTitle, setErrorTitle] = React.useState('');
     const [errorMessage, setErrorMessage] = React.useState('');

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
               setErrorTitle(error.title);
               setErrorMessage(error.message);
               logErrorMessage(result.error);
               setShowErrorDialog(true);
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
               setErrorTitle(error.title);
               setErrorMessage(error.message);
               logErrorMessage(result.error);
               setShowErrorDialog(true);
               popToast(error.title, error.message, 'error');
          } else {
               await refreshHomeFeed();
          }
     }

     return (
          <SafeAreaView>
               <View pb="$3">
                    <HStack space="$3" alignItems="center" justifyContent="space-between" pb="$2">
                         <DisplayBrowseCategoryTitle category={category.label} key={category.id} textId={id} source={category.source ?? 'GroupedWork'} />
                         {subCategories.length > 0 ? (
                              <Button variant="outline" size="xs" borderColor={colorMode === 'light' ? "$coolGray700" : "$warmGray100"} sx={{ paddingHorizontal: 6, paddingVertical: 0, height: 24 }} onPress={() => onPressHideAll(category.textId)}>
                                   <ButtonIcon as={MaterialIcons} name="close" color={colorMode === 'light' ? "$coolGray700" : "$warmGray100"} mr="$1" />
                                   <ButtonText color={colorMode === 'light' ? "$coolGray700" : "$warmGray100"}>{getTermFromDictionary(language, 'hide_all')}</ButtonText>
                              </Button>
                         ) : (
                              <Button variant="outline" size="xs" borderColor={colorMode === 'light' ? "$coolGray700" : "$warmGray100"} sx={{ paddingHorizontal: 6, paddingVertical: 0, height: 24 }} onPress={() => onPressHide(category.textId)}>
                                   <ButtonIcon as={MaterialIcons} name="close" color={colorMode === 'light' ? "$coolGray700" : "$warmGray100"} mr="$1" />
                                   <ButtonText color={colorMode === 'light' ? "$coolGray700" : "$warmGray100"}>{getTermFromDictionary(language, 'hide')}</ButtonText>
                              </Button>
                         )}
                    </HStack>
                    {subCategories.length > 0 ? (
                         <>
                              <ScrollView horizontal>
                                   <DisplaySubCategoryBar data={subCategoryRecords} subCategories={subCategories} selectedIndex={selectedSubCategoryIndex} onSelect={handleSelectSubCategory} isSystemBrowseCategory={isSystemBrowseCategory} />
                              </ScrollView>
                              {showSubCategoryRecords && <FlatList pb="$8" data={subCategoryRecords} keyExtractor={(item, index) => item.key?.toString() ?? item.id?.toString() ?? `subcategory-${index}`} horizontal renderItem={({ item }) => <DisplayBrowseCategoryRecord record={item} />} ListFooterComponent={subCategoryHasMore ? <DisplayMoreResultsButton category={subCategories[selectedSubCategoryIndex]} /> : null} />}
                         </>
                    ) : records.length > 0 ? (
                         <FlatList pb="$8" data={displayedData} keyExtractor={(item, index) => item.id?.toString() ?? item.key?.toString() ?? `record-${index}`} horizontal renderItem={({ item }) => <DisplayBrowseCategoryRecord record={item} />} ListFooterComponent={hasMore ? <DisplayMoreResultsButton category={category} /> : null} />
                    ) : null}
               </View>
          </SafeAreaView>
     );
};

const DisplayBrowseCategoryTitle = ({category, textId, source}) => {
     const { colorMode, theme } = useTheme();

     const isSystemCategory = textId === 'system_user_lists' || textId === 'system_saved_searches' || textId === 'system_recommended_for_you';

     const onPressCategory = (label, key, source) => {
          let screen = 'SearchByCategory';
          if (source === 'List') {
               screen = 'SearchByList';
          } else if (source === 'SavedSearch') {
               screen = 'SearchBySavedSearch';
          }

          navigateStack('BrowseTab', screen, {
               title: label,
               id: key });
     };

     return (
          <Pressable maxWidth="80%" /*onPress={() => onPressCategory(category, textId, source)}*/>
               <Text
                    color={colorMode === 'light' ? "$warmGray600" : "$coolGray200"}
                    bold
                    mb="$1"
                    fontSize="$lg"
                    >
                    {category}
               </Text>
          </Pressable>
     );
}

const DisplayBrowseCategoryRecord = ({record}) => {
     const library = useLibrary();
     const { theme } = useTheme();
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
     let imageUrl = library.baseUrl + '/bookcover.php?id=' + id + '&size=medium&type=' + type;

     if (type === 'Event' || _.includes(type, '_event')) {
          imageUrl = isValidUrl(record.image) ? record.image : (library.baseUrl + '/bookcover.php?id=' + id + '&size=medium&type=' + type);
     }

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
               ml="$1"
               mr="$3"
               sx={{
                    '@base': {
                         width: 100,
                         height: 150 },
                    '@lg': {
                         width: 180,
                         height: 250 } }}>
               <Image
                    alt={getTitle}
                    source={imageUrl}
                    style={{
                         width: '100%',
                         height: '100%',
                         borderRadius: "$sm" }}
                    placeholder={blurhash}
                    transition={0}
                    cachePolicy="memory-disk"
                    contentFit="cover"
               />
               {isNew ? (
                    <Box zIndex={1} alignItems="center">
                         <Badge bgColor="$warning500" mx={5} mt={-8}>
                              <BadgeText bold color="$white" textTransform="none">
                                   {getTermFromDictionary(language, 'flag_new')}
                              </BadgeText>
                         </Badge>
                    </Box>
               ) : null}
          </Pressable>
     )
}

const DisplaySubCategoryBar = ({ subCategories, selectedIndex, onSelect, data, isSystemBrowseCategory }) => {
     const { theme, textColor, colorMode } = useTheme();
     const library = useLibrary();
     const language = useActiveLanguage();
     const maxNum = useMaxCategories();
     const toggleCategoryVisibility = useToggleBrowseCategoryVisibility();
     const updateBrowseCategories = useUpdateBrowseCategories();

     const [showErrorDialog, setShowErrorDialog] = React.useState(false);
     const [errorTitle, setErrorTitle] = React.useState('');
     const [errorMessage, setErrorMessage] = React.useState('');

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
               setErrorTitle(error.title);
               setErrorMessage(error.message);
               logErrorMessage(result.error);
               setShowErrorDialog(true);
               popToast(error.title, error.message, 'error');
          } else {
               await refreshHomeFeed();
          }
     }

     return (
          <ButtonGroup vertical space="sm" pb="$2">
               {subCategories.map((subCategory, index) => (
                    <Button key={(subCategory?.id ?? subCategory?.textId ?? subCategory?.label ?? `subcategory-${index}`).toString()} bgColor={selectedIndex === index ? theme['tokens']['colors']['primary']['600'] : theme['tokens']['colors']['primary']['400']} variant="solid" sx={{ paddingHorizontal: 12, height: 34 }} onPress={() => onSelect(index)}>
                         <ButtonText fontWeight="$medium" color={theme['tokens']['colors']['primary']['500-text']}>
                              {subCategory.label}
                         </ButtonText>
                         {!isSystemBrowseCategory && <ButtonIcon as={MaterialIcons} name="close" onPress={() => onPressHideSubCategory(index)} size="sm" color={theme['tokens']['colors']['primary']['500-text']} ml="$4" />}
                    </Button>
               ))}
          </ButtonGroup>
     );
}

const DisplayMoreResultsButton = ({ category }) => {
     const { theme } = useTheme();
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
               ml="$1"
               alignItems="center"
               justifyContent="center"
               mr="$3"
               bgColor={theme.tokens.colors.primary['500']}
               style={{
                    borderRadius: "$sm" }}
               sx={{
                    '@base': {
                         width: 100,
                         height: 150 },
                    '@lg': {
                         width: 180,
                         height: 250 } }}>
               <Text bold color={theme.tokens.colors.primary['500-text']}>{getTermFromDictionary(language, 'view_more')}</Text>
          </Pressable>
     )
}

export default React.memo(DisplayBrowseCategory, (prevProps, nextProps) => _.isEqual(prevProps.category, nextProps.category));
