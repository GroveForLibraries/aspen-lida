import React from 'react';
import { Box } from '@/components/ui/box';
import { Center } from '@/components/ui/center';
import { FlatList } from '@/components/ui/flat-list';
import { ThemedCheckbox as Checkbox, ThemedCheckboxIcon as CheckboxIcon, ThemedCheckboxIndicator as CheckboxIndicator, ThemedCheckboxLabel as CheckboxLabel } from '@/src/components/themed/ThemedCheckbox';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '@/src/components/themed/ThemedButton';
import { ThemedFormControl as FormControl } from '@/src/components/themed/ThemedFormControls';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { LoadingSpinner } from '@/src/components/loadingSpinner';
import { DisplayErrorAlertDialog } from '@/src/components/loadError';
import { useLibrary } from '@/src/hooks/useLibrarySystemData';
import { useBrowseCategoryList, useUpdateBrowseCategoryList, useToggleBrowseCategoryVisibility, useToggleBrowseCategoryVisibilityBatch, useMaxCategories, useUpdateBrowseCategories } from '@/src/hooks/useBrowseCategoryData';
import { updateBrowseCategoryStatus } from '@/src/util/api/user';
import { getBrowseCategoryListForUser, getHomeScreenFeed } from '@/src/util/api/search';
import { logDebugMessage, logErrorMessage, getErrorMessage } from '@/src/util/logging';
import { popToast } from '@/src/components/feedback';
import { screenContentContainerStyle } from '@/src/components/ScreenContainer';
import { getTermFromDictionary } from '@/src/translations/TranslationService';
import { useActiveLanguage } from '@/src/hooks/useLanguageData';

/**
 * Settings_BrowseCategories component that displays a list of browse categories for the user to manage. It fetches the category list from the API, allows users to toggle visibility of categories, and handles syncing changes with the backend. It also manages loading states and error handling.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const Settings_BrowseCategories = () => {
     const library = useLibrary();
     const list = useBrowseCategoryList();
     const language = useActiveLanguage();
     const listRef = React.useRef(list);
     const updateBrowseCategoryList = useUpdateBrowseCategoryList();
     const toggleCategoryVisibility = useToggleBrowseCategoryVisibility();
     const toggleCategoryVisibilityBatch = useToggleBrowseCategoryVisibilityBatch();
     const maxNum = useMaxCategories();
     const updateBrowseCategories = useUpdateBrowseCategories();

     const [isFetching, setIsFetching] = React.useState(false);
     const [selectedKeys, setSelectedKeys] = React.useState(() => new Set());
     const [isSubmitting, setIsSubmitting] = React.useState(false);
     const [showErrorDialog, setShowErrorDialog] = React.useState(false);
     const [errorTitle, setErrorTitle] = React.useState('');
     const [errorMessage, setErrorMessage] = React.useState('');

     React.useEffect(() => {
          listRef.current = list;
     }, [list]);

     // Fetch category list on mount
     React.useEffect(() => {
          const fetchCategoryList = async () => {
               setIsFetching(true);
               try {
                    const data = await getBrowseCategoryListForUser(library.baseUrl);
                    if (data?.ok) {
                         const categories = [...(data?.data?.result ?? [])].sort((a, b) =>
                              String(a?.title ?? '').localeCompare(String(b?.title ?? ''))
                         );
                         console.log(categories);

                         const existing = Array.isArray(listRef.current) ? listRef.current : [];
                          const hasChanged = JSON.stringify(existing) !== JSON.stringify(categories);
                          if (hasChanged) {
                               await updateBrowseCategoryList(categories);
                               logDebugMessage("Loaded Browse Category List");
                          } else {
                               logDebugMessage("Browse Category List unchanged, skipped SQLite update");
                          }
                    } else {
                         logDebugMessage("Error fetching browse category list for user");
                         logDebugMessage(data);
                         getErrorMessage(data?.code, data?.problem);
                    }
               } catch (error) {
                    logDebugMessage("Error fetching browse category list for user");
                    logErrorMessage(error);
               } finally {
                    setIsFetching(false);
               }
          };

          fetchCategoryList();
     }, [library.baseUrl, updateBrowseCategoryList]);

     const getCategoryKey = React.useCallback((targetCategory) => {
          return targetCategory?.sourceId ?? targetCategory?.key;
     }, []);

     // A selected category also brings along its subcategories (matched by "Parent: Child" title prefix).
     const getCascadeCategories = React.useCallback((selectedCategory) => {
          const title = String(selectedCategory?.title ?? '').trim();
          if (!title) {
               return [selectedCategory];
          }

          const prefix = `${title}:`.toLowerCase();
          const related = (Array.isArray(list) ? list : []).filter((item) => {
               const childTitle = String(item?.title ?? '').trim().toLowerCase();
               return childTitle.startsWith(prefix);
          });

          return [selectedCategory, ...related];
     }, [list]);

     const toggleSelection = React.useCallback((category) => {
          const key = getCategoryKey(category);
          if (!key) {
               return;
          }

          setSelectedKeys((previous) => {
               const next = new Set(previous);
               if (next.has(key)) {
                    next.delete(key);
               } else {
                    next.add(key);
               }
               return next;
          });
     }, [getCategoryKey]);

     if (isFetching) {
          return <LoadingSpinner />;
     }

     const hiddenCategories = (Array.isArray(list) ? list : []).filter((item) => item?.isHidden);

     const listEmptyComponent = () => (
          <Center className="mt-5 mb-5">
               <Text bold size="lg">
                    {getTermFromDictionary(language, 'no_hidden_browse_categories')}
               </Text>
          </Center>
     );

     const handleShowCategories = async () => {
          if (isSubmitting || selectedKeys.size === 0) {
               return;
          }

          setIsSubmitting(true);

          const selectedCategories = hiddenCategories.filter((item) => selectedKeys.has(getCategoryKey(item)));
          const categoriesToShow = selectedCategories.flatMap((category) => getCascadeCategories(category));
          const categoryKeysToShow = [...new Set(categoriesToShow.map((item) => getCategoryKey(item)).filter(Boolean))];


          try {
               const optimisticResult = await toggleCategoryVisibilityBatch(categoryKeysToShow, false);
               if (!optimisticResult?.success) {
                    const error = getErrorMessage({ statusCode: optimisticResult?.error?.status, problem: optimisticResult?.error?.problem });
                    setErrorTitle(error.title);
                    setErrorMessage(error.message);
                    logErrorMessage(optimisticResult?.error);
                    setShowErrorDialog(true);
                    popToast(error.title, error.message, 'error');
                    return;
               }

               setSelectedKeys(new Set());

               const results = await Promise.allSettled(
                    categoryKeysToShow.map((categoryKey) =>
                         updateBrowseCategoryStatus(categoryKey, library.baseUrl).catch(async (error) => {
                              // Rollback locally if the API fails so UI and cache stay consistent.
                              await toggleCategoryVisibility(categoryKey, true);
                              logErrorMessage(error);
                              return Promise.reject(error);
                         })
                    )
               );

               const hadBackgroundFailure = results.some((result) => result.status === 'rejected');
               if (hadBackgroundFailure) {
                    popToast('Update issue', 'Some categories could not be updated.', 'error');
               }

               const requestedMax = maxNum > 0 ? maxNum : 5;
               const homeFeed = await getHomeScreenFeed(requestedMax, library.baseUrl);
               if (homeFeed?.ok) {
                    const nextCategories = homeFeed.data?.result?.browseCategories ?? [];
                    await updateBrowseCategories(nextCategories);
               }
          } finally {
               setIsSubmitting(false);
          }
     };

     return (
          <Box className="py-2">
               {hiddenCategories.length > 0 ? (
                    <Text className="px-2 pb-4">{getTermFromDictionary(language, 'hidden_categories')}</Text>
               ) : null}
               <FlatList
                    contentContainerStyle={screenContentContainerStyle}
                    keyExtractor={(item, index) => {
                         // `sourceId` is the best unique identifier when present; fallback adds index to avoid key collisions.
                         if (item?.sourceId) {
                              return String(item.sourceId);
                         }
                         return `${item?.key ?? item?.title ?? 'browse_category'}-${index}`;
                    }}
                    data={hiddenCategories}
                    renderItem={({ item }) => <DisplayCategory data={item} isSelected={selectedKeys.has(getCategoryKey(item))} onToggleSelect={toggleSelection} />}
                    ListEmptyComponent={listEmptyComponent}
               />
               {showErrorDialog && <DisplayErrorAlertDialog title={errorTitle} message={errorMessage} />}
               {hiddenCategories.length > 0 ? (
                    <Box className="px-4">
                         <Button isDisabled={selectedKeys.size === 0 || isSubmitting} onPress={handleShowCategories}>
                              <ButtonText>{getTermFromDictionary(language, 'show_these_browse_categories')}</ButtonText>
                         </Button>
                    </Box>
               ) : null}
          </Box>
     );
};

const DisplayCategory = ({ data, isSelected, onToggleSelect }) => {
     const category = data;

     return (
          <Box>
               <FormControl>
                    <Checkbox
                         name={category.key}
                         onChange={() => {
                              onToggleSelect(category);
                         }}
                         isChecked={isSelected}>
                         <CheckboxIndicator>
                              <CheckboxIcon />
                         </CheckboxIndicator>
                         <CheckboxLabel>{category.title}</CheckboxLabel>
                    </Checkbox>
               </FormControl>
          </Box>
     );
};
