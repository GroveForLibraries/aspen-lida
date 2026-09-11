import React, { useState, useRef } from 'react';
import { ThemedMaterialIcons as MaterialIcons } from '@/src/components/themed/ThemedMaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// custom components and helper files
import { loadingSpinner } from '../../components/loadingSpinner';
import { placeHold, confirmHold, refreshProfile } from '../../util/api/user';
import { getRecords } from '../../util/api/item';
import { loadError } from '../../components/loadError';
import { navigate, navigateStack } from '../../helpers/RootNavigator';
import { stripHTML } from '../../helpers/helpers';
import { getStatusIndicator } from './StatusIndicator';
import { ActionButton } from '../../components/Action/ActionButton';

import { useLibrary } from '../../hooks/useLibrarySystemData';
import { useUserState, useUpdateUserProfile } from '../../hooks/useUserData';
import { getTermFromDictionary } from '../../translations/TranslationService';

import { logDebugMessage, logWarnMessage, getErrorMessage } from '../../util/logging.js';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { useTheme } from '../../themes/theme';
import { ThemedAlertDialog as AlertDialog, ThemedAlertDialogBackdrop as AlertDialogBackdrop, ThemedAlertDialogBody as AlertDialogBody, ThemedAlertDialogFooter as AlertDialogFooter, ThemedAlertDialogHeader as AlertDialogHeader, ThemedAlertDialogContent as AlertDialogContent } from '@/src/components/themed/ThemedAlertDialog';
import { ThemedBadge as Badge, ThemedBadgeText as BadgeText } from '../../components/themed/ThemedBadge';
import { Box } from '@/components/ui/box';
import { ThemedButton as Button, ThemedButtonIcon as ButtonIcon, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { HStack } from '@/components/ui/hstack';
import { ThemedScrollView as ScrollView } from '@/src/components/themed/ThemedScrollView';
import { ThemedSelect as Select, ThemedSelectBackdrop as SelectBackdrop, ThemedSelectContent as SelectContent, ThemedSelectDragIndicator as SelectDragIndicator, ThemedSelectDragIndicatorWrapper as SelectDragIndicatorWrapper, ThemedSelectInput as SelectInput, ThemedSelectItem as SelectItem, ThemedSelectPortal as SelectPortal, ThemedSelectScrollView as SelectScrollView, ThemedSelectTrigger as SelectTrigger } from '../../components/themed/ThemedSelect';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { VStack } from '@/components/ui/vstack';
import { ScreenContainer } from '@/src/components/ScreenContainer';

export const Editions = () => {
     // 1. Hooks
     const queryClient = useQueryClient();
     const navigation = useNavigation();
     const library = useLibrary();
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const updateUserProfile = useUpdateUserProfile();
     const language = useActiveLanguage();
     const { textColor } = useTheme();
     const insets = useSafeAreaInsets();

     const [isLoading] = useState(false);
     const [confirmingHold, setConfirmingHold] = useState(false);
     const [selectedItem, setSelectedItem] = useState('');
     const [responseIsOpen, setResponseIsOpen] = useState(false);
     const [response, setResponse] = useState('');
     const [holdConfirmationIsOpen, setHoldConfirmationIsOpen] = useState(false);
     const [holdConfirmationResponse, setHoldConfirmationResponse] = useState('');
     const [holdItemSelectIsOpen, setHoldItemSelectIsOpen] = useState(false);
     const [holdSelectItemResponse, setHoldSelectItemResponse] = useState('');
     const [placingItemHold, setPlacingItemHold] = useState(false);

     const cancelResponseRef = useRef(null);
     const cancelHoldConfirmationRef = useRef(null);
     const cancelHoldItemSelectRef = useRef(null);

     // 2. Logic & Params
     let route = navigation.getParent()?.getState()?.routes || [];
     const editionsModalRoute = route.find(r => r.name === 'EditionsModal');
     const params = editionsModalRoute?.params || {};
     const { id, format, source, volumeInfo, prevRoute } = params;

     const { status, data, isFetching } = useQuery({
          queryKey: ['records', id, source, format, language, library.baseUrl],
          queryFn: () => getRecords(id, format, source, language, library.baseUrl),
          enabled: !!id && !!format && !!source });

     // 3. Helper Functions
     const onResponseClose = () => setResponseIsOpen(false);
     const onHoldConfirmationClose = () => setHoldConfirmationIsOpen(false);
     const onHoldItemSelectClose = () => setHoldItemSelectIsOpen(false);
     const closeEditionsModal = () => {
          const parent = navigation.getParent();
          if (parent?.canGoBack()) {
               parent.goBack();
          } else if (navigation.canGoBack()) {
               navigation.goBack();
          }
     };

     let shouldPromptAlternateLibraryCard = false;
     let shouldShowAlternateLibraryCard = false;
     let useAlternateCardForCloudLibrary = false;
     let userHasAlternateLibraryCard = false;

     if (library.showAlternateLibraryCard === '1' || library.showAlternateLibraryCard === 1) {
          shouldShowAlternateLibraryCard = true;
     }

     if (library.useAlternateCardForCloudLibrary === '1' || library.useAlternateCardForCloudLibrary === 1) {
          useAlternateCardForCloudLibrary = true;
     }

     if (shouldShowAlternateLibraryCard && useAlternateCardForCloudLibrary && source === 'cloud_library') {
          shouldPromptAlternateLibraryCard = true;
     }

     if (user.alternateLibraryCard && user.alternateLibraryCard !== '') {
          if (library.alternateLibraryCardConfig?.showAlternateLibraryCardPassword === '1') {
               if (user.alternateLibraryCardPassword !== '') {
                    userHasAlternateLibraryCard = true;
               }
          } else {
               userHasAlternateLibraryCard = true;
          }
     }

     const handleNavigation = (action) => {
          if (prevRoute === 'DiscoveryScreen' || prevRoute === 'SearchResults' || prevRoute === 'HomeScreen') {
               if (action.includes('Checkouts')) {
                    setResponseIsOpen(false);
                    navigateStack('AccountScreenTab', 'MyCheckouts', {});
               } else {
                    setResponseIsOpen(false);
                    navigateStack('AccountScreenTab', 'MyHolds', {});
               }
          } else {
               if (action.includes('Checkouts')) {
                    setResponseIsOpen(false);
                    navigate('MyCheckouts', {});
               } else {
                    setResponseIsOpen(false);
                    navigate('MyHolds', {});
               }
          }
     };

     const decodeMessage = (string) => {
          return stripHTML(string);
     };

     // 4. Render
     if (isLoading) {
          return loadingSpinner();
     }

     const records = data?.records ? (Array.isArray(data.records) ? data.records : Object.values(data.records)) : [];

     return (
          <ScreenContainer>
               <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
                    <Box className="py-3">
                         {isFetching ? (
                              loadingSpinner()
                         ) : status === 'error' ? (
                              loadError('Error', '')
                         ) : records.length === 0 ? (
                              <Center className="p-5">
                                   <Text>Edition information was not found</Text>
                              </Center>
                         ) : (
                              <VStack space="md">
                                   {records.map((record, index) => (
                                        <Edition
                                             key={record.id || index.toString()}
                                             records={record}
                                             id={id}
                                             format={format}
                                             volumeInfo={volumeInfo}
                                             prevRoute={prevRoute}
                                             setResponseIsOpen={setResponseIsOpen}
                                             responseIsOpen={responseIsOpen}
                                             onResponseClose={onResponseClose}
                                             cancelResponseRef={cancelResponseRef}
                                             response={response}
                                             setResponse={setResponse}
                                             setHoldConfirmationIsOpen={setHoldConfirmationIsOpen}
                                             holdConfirmationIsOpen={holdConfirmationIsOpen}
                                             onHoldConfirmationClose={onHoldConfirmationClose}
                                             cancelHoldConfirmationRef={cancelHoldConfirmationRef}
                                             holdConfirmationResponse={holdConfirmationResponse}
                                             setHoldConfirmationResponse={setHoldConfirmationResponse}
                                             setHoldItemSelectIsOpen={setHoldItemSelectIsOpen}
                                             holdItemSelectIsOpen={holdItemSelectIsOpen}
                                             onHoldItemSelectClose={onHoldItemSelectClose}
                                             cancelHoldItemSelectRef={cancelHoldItemSelectRef}
                                             holdSelectItemResponse={holdSelectItemResponse}
                                             setHoldSelectItemResponse={setHoldSelectItemResponse}
                                             userHasAlternateLibraryCard={userHasAlternateLibraryCard}
                                             shouldPromptAlternateLibraryCard={shouldPromptAlternateLibraryCard}
                                             closeEditionsModal={closeEditionsModal}
                                        />
                                   ))}
                              </VStack>
                         )}
                    </Box>
               </ScrollView>
               <Center>
                    <AlertDialog leastDestructiveRef={cancelResponseRef} isOpen={responseIsOpen} onClose={onResponseClose} useRNModal={true}>
                         <AlertDialogBackdrop />
                         <AlertDialogContent>
                              <AlertDialogHeader>
                                   <Heading>{response?.title}</Heading>
                              </AlertDialogHeader>
                              <AlertDialogBody>
                                   <Text>{response?.message}</Text>
                              </AlertDialogBody>
                              <AlertDialogFooter>
                                   <ButtonGroup space="sm">
                                        {response?.action ? (
                                             <Button onPress={() => handleNavigation(response.action)} variant="solid" colorScheme="primary">
                                                  <ButtonText>{response.action}</ButtonText>
                                             </Button>
                                        ) : null}
                                        <Button colorScheme="primary" variant="outline" ref={cancelResponseRef} onPress={() => setResponseIsOpen(false)}>
                                             <ButtonText>{getTermFromDictionary(language, 'button_ok')}</ButtonText>
                                        </Button>
                                   </ButtonGroup>
                              </AlertDialogFooter>
                         </AlertDialogContent>
                    </AlertDialog>
                    <AlertDialog leastDestructiveRef={cancelHoldConfirmationRef} isOpen={holdConfirmationIsOpen} onClose={onHoldConfirmationClose} useRNModal={true}>
                         <AlertDialogBackdrop />
                         <AlertDialogContent>
                              <AlertDialogHeader>
                                   {/* TODO(translation): Replace hardcoded fallback title with TranslationService-backed key. */}
                                   <Heading>{holdConfirmationResponse?.title ? holdConfirmationResponse.title : 'Unknown Error'}</Heading>
                              </AlertDialogHeader>
                              <AlertDialogBody>
                                   {/* TODO(translation): Replace hardcoded fallback error body with TranslationService-backed key. */}
                                   <Text>{holdConfirmationResponse?.message ? decodeMessage(holdConfirmationResponse.message) : 'Unable to place hold for unknown error. Please contact the library.'}</Text>
                              </AlertDialogBody>
                              <AlertDialogFooter>
                                   <ButtonGroup space="md">
                                        <Button colorScheme="primary" variant="link" onPress={() => setHoldConfirmationIsOpen(false)}>
                                             <ButtonText>{getTermFromDictionary(language, 'close_window')}</ButtonText>
                                        </Button>
                                        <Button
                                             isLoading={confirmingHold}
                                             isLoadingText="Placing hold..."
                                             variant="solid"
                                             colorScheme="primary"
                                             onPress={async () => {
                                                  setConfirmingHold(true);
                                                  await confirmHold(holdConfirmationResponse.recordId, holdConfirmationResponse.confirmationId, language, library.baseUrl).then(async (result) => {
                                                       setResponse(result);
                                                       queryClient.invalidateQueries({ queryKey: ['holds', library.baseUrl, language] });
                                                       await refreshProfile(library.baseUrl).then((data) => {
                                                            if(data.ok) {
                                                                 updateUserProfile(data.data.result.profile);
                                                            } else {
                                                                 logWarnMessage('Could not refresh profile after placing hold from volume selection.');
                                                                 logDebugMessage(data);
                                                                 getErrorMessage(data.code ?? 0, data.problem);
                                                            }
                                                       });

                                                       setHoldConfirmationIsOpen(false);
                                                       setConfirmingHold(false);
                                                       if (result) {
                                                            setResponseIsOpen(true);
                                                       }
                                                  });
                                             }}>
                                             <ButtonText>{getTermFromDictionary(language, 'confirm_place_hold')}</ButtonText>
                                        </Button>
                                   </ButtonGroup>
                              </AlertDialogFooter>
                         </AlertDialogContent>
                    </AlertDialog>
                    <AlertDialog leastDestructiveRef={cancelHoldItemSelectRef} isOpen={holdItemSelectIsOpen} onClose={onHoldItemSelectClose} useRNModal={true}>
                         <AlertDialogBackdrop />
                         <AlertDialogContent>
                              <AlertDialogHeader>
                                        {/* TODO(translation): Replace hardcoded fallback title with TranslationService-backed key. */}
                                   <Heading>{holdSelectItemResponse?.title ? holdSelectItemResponse.title : 'Unknown Error'}</Heading>
                              </AlertDialogHeader>
                              <AlertDialogBody>
                                        {/* TODO(translation): Replace hardcoded fallback error body with TranslationService-backed key. */}
                                   <Text>{holdSelectItemResponse?.message ? decodeMessage(holdSelectItemResponse.message) : 'Unable to place hold for unknown error. Please contact the library.'}</Text>
                                   {holdSelectItemResponse?.items ? (
                                        <Select name="itemForHold" minWidth={200} accessibilityLabel={getTermFromDictionary(language, 'select_item')} className="mt-1 mb-2" onValueChange={(itemValue) => setSelectedItem(itemValue)}>
                                             <SelectTrigger>
                                                       {/* TODO(translation): Replace hardcoded placeholder with TranslationService-backed key. */}
                                                  <SelectInput placeholder="Select option" />
                                             </SelectTrigger>
                                             <SelectPortal>
                                                  <SelectBackdrop />
                                                  <SelectContent>
                                                       <SelectDragIndicatorWrapper>
                                                            <SelectDragIndicator />
                                                       </SelectDragIndicatorWrapper>
                                                       <SelectScrollView>
                                                            {(holdSelectItemResponse.items || []).map((item, index) => {
                                                                 let itemLabel = "";
                                                                 if (item.location) {
                                                                      itemLabel = item.location + " - ";
                                                                 }
                                                                 itemLabel += item.callNumber;
                                                                 if (item.status) {
                                                                      itemLabel += " - " + item.status;
                                                                 }
                                                                 return <SelectItem label={itemLabel} value={item.itemNumber} key={index} textStyle={{ color: textColor }} />;
                                                            })}
                                                       </SelectScrollView>
                                                  </SelectContent>
                                             </SelectPortal>
                                        </Select>
                                   ) : null}
                              </AlertDialogBody>
                              <AlertDialogFooter>
                                   <ButtonGroup space="md">
                                        <Button colorScheme="primary" variant="link" onPress={() => setHoldItemSelectIsOpen(false)}>
                                             <ButtonText>{getTermFromDictionary(language, 'close_window')}</ButtonText>
                                        </Button>
                                        <Button
                                             isLoading={placingItemHold}
                                             isLoadingText="Placing hold..."
                                             variant="solid"
                                             colorScheme="primary"
                                             onPress={async () => {
                                                  setPlacingItemHold(true);
                                                  await placeHold(library.baseUrl, selectedItem, 'ils', holdSelectItemResponse.patronId, holdSelectItemResponse.pickupLocation, holdSelectItemResponse.sublocation, false, '', 'item', null, null, null, holdSelectItemResponse.bibId, language).then(async (result) => {
                                                       setResponse(result);
                                                       queryClient.invalidateQueries({ queryKey: ['holds', holdSelectItemResponse.patronId, library.baseUrl, language] });
                                                       await refreshProfile(library.baseUrl).then(async (data) => {
                                                            if (data.ok) {
                                                                 await updateUserProfile(data.data.result.profile);
                                                            } else {
                                                                 logWarnMessage('Could not refresh profile after placing item hold from edition selection.');
                                                                 logDebugMessage(data);
                                                                 getErrorMessage(data.code ?? 0, data.problem);
                                                            }
                                                       });
                                                       setHoldItemSelectIsOpen(false);
                                                       setPlacingItemHold(false);
                                                       if (result) {
                                                            setResponseIsOpen(true);
                                                       }
                                                  });
                                             }}>
                                             <ButtonText>{getTermFromDictionary(language, 'place_hold')}</ButtonText>
                                        </Button>
                                   </ButtonGroup>
                              </AlertDialogFooter>
                         </AlertDialogContent>
                    </AlertDialog>
               </Center>
          </ScreenContainer>
     );
};

const Edition = (props) => {
     // 1. Hooks
     const language = useActiveLanguage();
     const { colorMode, neutralPairs } = useTheme();

     // 2. Props
     const {
          response,
          setResponse,
          responseIsOpen,
          setResponseIsOpen,
          onResponseClose,
          cancelResponseRef,
          holdConfirmationResponse,
          setHoldConfirmationResponse,
          holdConfirmationIsOpen,
          setHoldConfirmationIsOpen,
          onHoldConfirmationClose,
          cancelHoldConfirmationRef,
          holdSelectItemResponse,
          setHoldSelectItemResponse,
          holdItemSelectIsOpen,
          setHoldItemSelectIsOpen,
          onHoldItemSelectClose,
          cancelHoldItemSelectRef,
          userHasAlternateLibraryCard,
          shouldPromptAlternateLibraryCard
     } = props;
     const closeEditionsModal = props.closeEditionsModal;

     const prevRoute = props.prevRoute;
     const records = props.records;
     const id = props.id;
     const format = props.format;
     const source = records.source;
     const recordId = records.recordId;
     const fullRecordId = records.id;
     const volumeInfo = props.volumeInfo;
     const closedCaptioned = records.closedCaptioned;
     const title = records.title ?? null;
     const author = records.author ?? null;
     const publisher = records.publisher ?? null;
     const isbn = records.isbn ?? null;
     const oclcNumber = records.oclcNumber ?? null;
     const holdTypeForFormat = records.holdType ?? 'default';
     const variationId = records.variationId ?? null;
     const status = records.statusIndicator || {};
     const actions = Array.isArray(records.actions) ? records.actions : Object.values(records.actions || {});

     const handleOnPress = () => {
          navigate('WhereIsIt', { id: id, format: format, prevRoute: prevRoute, type: 'record', recordId: fullRecordId, numHolds: status.numHolds, source });
     };

     const statusIndicator = getStatusIndicator(status, language);

     return (
          <Box className="mt-0 mb-0 p-3" style={{ borderBottomWidth: 1, borderColor: neutralPairs.border.light }}>
               <HStack space="sm" className="justify-between items-center flex-1">
                    <VStack space="sm" className="max-w-[40%] flex-1 justify-center">
                         <HStack space="xs" className="flex-wrap">
                              <Text bold size="xs">
                                   {records.publicationDate}
                              </Text>
                              <Text size="xs">
                                   {records.publisher}. {records.edition} {records.physical} {closedCaptioned === '1' ? <MaterialIcons name="closed-caption" size={16} /> : null}
                              </Text>
                         </HStack>
                         <VStack space="sm">
                              <Center>
                                   <Badge colorScheme={statusIndicator.indicator} variant="solid" className="rounded-lg">
                                        <BadgeText colorScheme={statusIndicator.indicator}>{statusIndicator.label}</BadgeText>
                                   </Badge>
                              </Center>
                              {records.source === 'ils' || status.isEContent ? (
                                   <Button variant="link" size="xs" onPress={handleOnPress}>
                                        <MaterialIcons name="location-pin" size={14} color={colorMode === 'light' ? neutralPairs.textMuted.light : neutralPairs.white} className="mr-1" />
                                        <ButtonText style={{ color: colorMode === 'light' ? neutralPairs.textMuted.light : neutralPairs.white }}>{getTermFromDictionary(language, 'where_is_it')}</ButtonText>
                                   </Button>
                              ) : null}
                         </VStack>
                    </VStack>
                    <ButtonGroup space="sm" style={{ flexDirection: actions.length > 1 ? 'column' : 'row', width: '50%', justifyContent: 'center', alignItems: 'stretch' }}>
                         {actions.map((item, index) => (
                              <ActionButton
                                   key={index}
                                   language={language}
                                   groupedWorkId={id}
                                   recordId={recordId}
                                   recordSource={source}
                                   fullRecordId={fullRecordId}
                                   variationId={variationId}
                                   holdTypeForFormat={holdTypeForFormat}
                                   title={title}
                                   author={author}
                                   publisher={publisher}
                                   isbn={isbn}
                                   oclcNumber={oclcNumber}
                                   actions={item}
                                   volumeInfo={volumeInfo}
                                   prevRoute={prevRoute}
                                   setResponseIsOpen={setResponseIsOpen}
                                   responseIsOpen={responseIsOpen}
                                   onResponseClose={onResponseClose}
                                   cancelResponseRef={cancelResponseRef}
                                   response={response}
                                   setResponse={setResponse}
                                   setHoldConfirmationIsOpen={setHoldConfirmationIsOpen}
                                   holdConfirmationIsOpen={holdConfirmationIsOpen}
                                   onHoldConfirmationClose={onHoldConfirmationClose}
                                   cancelHoldConfirmationRef={cancelHoldConfirmationRef}
                                   holdConfirmationResponse={holdConfirmationResponse}
                                   setHoldConfirmationResponse={setHoldConfirmationResponse}
                                   setHoldItemSelectIsOpen={setHoldItemSelectIsOpen}
                                   holdItemSelectIsOpen={holdItemSelectIsOpen}
                                   onHoldItemSelectClose={onHoldItemSelectClose}
                                   cancelHoldItemSelectRef={cancelHoldItemSelectRef}
                                   holdSelectItemResponse={holdSelectItemResponse}
                                   setHoldSelectItemResponse={setHoldSelectItemResponse}
                                   userHasAlternateLibraryCard={userHasAlternateLibraryCard}
                                   shouldPromptAlternateLibraryCard={shouldPromptAlternateLibraryCard}
                                   onBeforeNavigate={closeEditionsModal}
                              />
                         ))}
                    </ButtonGroup>
               </HStack>
          </Box>
     );
};
