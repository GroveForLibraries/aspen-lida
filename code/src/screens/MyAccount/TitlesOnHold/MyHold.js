import { ThemedMaterialCommunityIcons as MaterialCommunityIcons, ThemedMaterialIcons as MaterialIcons } from '@/src/components/themed/ThemedMaterialIcons';
import { Image } from 'expo-image';
import _ from 'lodash';
import React from 'react';
import { ThemedActionsheet as Actionsheet, ThemedActionsheetBackdrop as ActionsheetBackdrop, ThemedActionsheetDragIndicator as ActionsheetDragIndicator, ThemedActionsheetDragIndicatorWrapper as ActionsheetDragIndicatorWrapper, ThemedActionsheetItem as ActionsheetItem, ThemedActionsheetContent as ActionsheetContent, ThemedActionsheetItemText as ActionsheetItemText } from '@/src/components/themed/ThemedActionsheet';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../../components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { ThemedCheckbox as Checkbox, ThemedCheckboxIcon as CheckboxIcon, ThemedCheckboxIndicator as CheckboxIndicator } from '../../../components/themed/ThemedCheckbox';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { popAlert } from '@/src/components/feedback';
import { HoldsContext } from '@/src/context/initialContext';
import { useUserState, useSublocations } from '@/src/hooks/useUserData';
import { getAuthor, getBadge, getCleanTitle, getExpirationDate, getFormat, getOnHoldFor, getPickupLocation, getPosition, getOutOfHoldGroupMessage, getTitle, getCallNumber, getVolume, getType, getCollectionName } from '@/src/helpers/item';
import { navigateStack } from '@/src/helpers/RootNavigator';
import { getTermFromDictionary } from '@/src/translations/TranslationService';
import { cancelHold, cancelHolds, freezeHold, freezeHolds, thawHold, thawHolds } from '@/src/util/api/user';
import { formatPickupLocations } from '@/src/util/api/userHelper';
import { formatDiscoveryVersion } from '@/src/helpers/helpers';
import { checkoutItem, getPickupLocations } from '@/src/util/api/user';
import { SelectPickupLocation } from './SelectPickupLocation';
import { SelectThawDate } from './SelectThawDate.js';
import { useQueryClient } from '@tanstack/react-query';
import { useActiveLanguage } from '@/src/hooks/useLanguageData';
import { useTheme } from '@/src/themes/theme';
import { useLibrary } from '@/src/hooks/useLibrarySystemData';

const blurhash = 'MHPZ}tt7*0WC5S-;ayWBofj[K5RjM{ofM_';

/**
 * MyHold component that displays an individual hold with its image, title, author, format, and other details. It handles user interaction to open an action sheet with options to manage the hold, such as checking out, canceling, freezing, thawing, or updating the pickup location. It also manages the state of the action sheet and the loading states for various actions.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
export const MyHold = (props) => {
     const hold = props.data;
     const resetGroup = props.resetGroup;
     const [pickupLocations, setPickupLocations] = React.useState([]);
     const { data: sublocations } = useSublocations();
     const section = props.section;
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const library = useLibrary();
     const { updateHolds } = React.useContext(HoldsContext);
     const language = useActiveLanguage();
     const { neutralPairs, neutrals, brand, colorMode, textColor } = useTheme();
     const [cancelling, startCancelling] = React.useState(false);
     const [checkingOut, startCheckingOut] = React.useState(false);
     const [thawing, startThawing] = React.useState(false);
     const [freezing, startFreezing] = React.useState(false);
     const separatorColor = colorMode === 'light' ? 'transparent' : neutralPairs.iconMuted.dark;
     let label, method, icon, canCancel;
     const [usesHoldPosition, setUsesHoldPosition] = React.useState(false);
     const [holdPosition, setHoldPosition] = React.useState(null);

     const [showActionsheet, setShowActionsheet] = React.useState(false)
     const handleOpen = () => setShowActionsheet(true);
     const handleClose = () => setShowActionsheet(false);

     React.useEffect(() => {
          if (hold.holdQueueLength) {
               let tmp = getTermFromDictionary(language, 'hold_position_with_queue');
               if (hold.holdQueueLength && hold.position) {
                    tmp = tmp.replace('%1%', hold.position);
                    tmp = tmp.replace('%2%', hold.holdQueueLength);
                    setUsesHoldPosition(true);
                    setHoldPosition(tmp);
               }
          }
          const update = async () => {
               await getPickupLocations(library.baseUrl, null, hold.id).then((result) => {
                    if(result.ok) {
                         const pickupLocationsList = formatPickupLocations(result.data.result);
                         if (pickupLocations !== pickupLocationsList.locations) {
                              setPickupLocations(pickupLocationsList.locations);
                         }
                    }
               });
          };
          update();
     }, [language]);

     if (hold.canFreeze === true) {
          if (hold.frozen === true) {
               label = getTermFromDictionary(language, 'thaw_hold');
               method = 'thawHold';
               icon = 'play';
          } else {
               label = getTermFromDictionary(language, 'freeze_hold');
               method = 'freezeHold';
               icon = 'pause';
               if (hold.available) {
                    label = getTermFromDictionary(language, 'overdrive_delay_checkout');
                    method = 'freezeHold';
                    icon = 'pause';
               }
          }
     }

     if (!hold.available && hold.source !== 'ils') {
          canCancel = hold.cancelable;
          if (hold.source === 'axis360') {
               canCancel = true;
          }
     } else {
          canCancel = hold.cancelable;
     }

     if (hold.pendingCancellation) {
          canCancel = !hold.pendingCancellation;
     }

     let allowLinkedAccountAction = true;
     const discoveryVersion = formatDiscoveryVersion(library.discoveryVersion);
     if (discoveryVersion < '22.05.00') {
          if (hold.userId !== user.id) {
               allowLinkedAccountAction = false;
          }
     }

     const freezingHoldLabel = getTermFromDictionary(language, 'freezing_hold');
     const freezeHoldLabel = getTermFromDictionary(language, 'freeze_hold');

     const openGroupedWork = (item, title) => {
          navigateStack('AccountScreenTab', 'MyHold', {
               id: item,
               title: getCleanTitle(title),
               url: library.baseUrl,
               userContext: user,
               libraryContext: library,
               prevRoute: 'MyHolds' });
     };

     const initializeLeftColumn = () => {
          if (hold.coverUrl) {
               let url = library.baseUrl + '/bookcover.php?id=' + hold.source + ':' + hold.recordId + '&size=medium';
               if (hold.upc) {
                    url = url + '&upc=' + hold.upc;
               }
               return (
                    <VStack>
                         <Image
                              alt={hold.title}
                              source={url}
                             placeholder={blurhash}
                             transition={1000}
                             contentFit="cover"
                             className="rounded-lg"
                             style={{ width: 100.0, height: 150.0 }}
                         />
                         {(hold.allowFreezeHolds || canCancel) && allowLinkedAccountAction && section === 'Pending' ? (
                              <Center>
                                   <Checkbox value={method + '|' + hold.recordId + '|' + hold.cancelId + '|' + hold.source + '|' + hold.userId} accessibilityLabel="Check item" className="my-3">
                                        <CheckboxIndicator>
                                             <CheckboxIcon />
                                        </CheckboxIndicator>
                                   </Checkbox>
                              </Center>
                         ) : null}
                    </VStack>
               );
          } else {
               if (section === 'Pending') {
                    return (
                         <Center>
                              <Checkbox value={method + '|' + hold.recordId + '|' + hold.cancelId + '|' + hold.source + '|' + hold.userId} accessibilityLabel="Check item" className="my-3">
                                   <CheckboxIndicator>
                                        <CheckboxIcon />
                                   </CheckboxIndicator>
                              </Checkbox>
                         </Center>
                    );
               }
          }

          return null;
     };

     const createOpenGroupedWorkAction = () => {
          if (hold.groupedWorkId) {
               return (
                    <ActionsheetItem
                         onPress={() => {
                              openGroupedWork(hold.groupedWorkId, hold.title);
                              handleClose();
                         }}>
                         <MaterialIcons name="search" size={18} className="mr-1" />
                         <ActionsheetItemText>{getTermFromDictionary(language, 'view_item_details')}</ActionsheetItemText>
                    </ActionsheetItem>
               );
          } else {
               return null;
          }
     };

     const createCheckoutHoldAction = () => {
          if (hold.source === 'overdrive' && hold.available) {
               return (
                    <ActionsheetItem
                         isLoading={checkingOut}
                         isLoadingText={getTermFromDictionary(language, 'checking_out', true)}
                         onPress={async () => {
                              handleClose();
                              startCheckingOut(true);
                              await checkoutItem(library.baseUrl, hold.sourceId, hold.source, hold.userId, '', '', '', language).then((result) => {
                                   popAlert(result.title, result.message, result.success ? 'success' : 'error');
                                   resetGroup();
                                   startCheckingOut(false);
                              });
                         }}>
                         <MaterialIcons name="book" size={18} className="mr-1" />
                         <ActionsheetItemText>{getTermFromDictionary(language, 'checkout_title')}</ActionsheetItemText>
                    </ActionsheetItem>
               );
          }

          return null;
     };

     const createCancelHoldAction = () => {
          if (canCancel && allowLinkedAccountAction) {
               let label = getTermFromDictionary(language, 'cancel_hold');
               if (hold.type === 'interlibrary_loan') {
                    label = getTermFromDictionary(language, 'ill_cancel_request');
               }

               let record = hold.recordId;
               if(hold.source === 'overdrive') {
                  record = hold.sourceId
               }

               return (
                    <ActionsheetItem
                         isLoading={cancelling}
                         isLoadingText={getTermFromDictionary(language, 'canceling', true)}
                         onPress={() => {
                              handleClose();
                              startCancelling(true);
                              cancelHold(hold.cancelId, record, hold.source, library.baseUrl, hold.userId, language).then(() => {
                                   resetGroup();
                                   startCancelling(false);
                              });
                         }}>
                         <MaterialIcons name="cancel" size={18} className="mr-1" />
                         <ActionsheetItemText>{label}</ActionsheetItemText>
                    </ActionsheetItem>
               );
          } else if (hold.pendingCancellation) {
               return <ActionsheetItem><ActionsheetItemText>{getTermFromDictionary(language, 'pending_cancellation')}</ActionsheetItemText></ActionsheetItem>;
          } else {
               return null;
          }
     };

     const createFreezeHoldAction = () => {
          if (hold.allowFreezeHolds === '1' && allowLinkedAccountAction) {
			  let record = hold.recordId;
			  if(hold.source === 'overdrive') {
				  record = hold.sourceId
			  }
               if (hold.frozen) {
                    return (
                         <ActionsheetItem
                              isLoading={thawing}
                              isLoadingText={getTermFromDictionary(language, 'thawing_hold', true)}
                              onPress={() => {
                                   handleClose();
                                   startThawing(true);
                                   thawHold(hold.cancelId, record, hold.source, library.baseUrl, hold.userId, language).then(() => {
                                        resetGroup();
                                        startThawing(false);
                                   });
                              }}>
                              <MaterialCommunityIcons name={icon} size={18} className="mr-1" />
                              <ActionsheetItemText>{label}</ActionsheetItemText>
                         </ActionsheetItem>
                    );
               } else {
                    if (library.showDateWhenSuspending) {
                         return <SelectThawDate label={null} freezeLabel={freezeHoldLabel} freezingLabel={freezingHoldLabel} language={language} libraryContext={library} holdsContext={updateHolds} onClose={handleClose} freezeId={hold.cancelId} recordId={record} source={hold.source} libraryUrl={library.baseUrl} userId={hold.userId} resetGroup={resetGroup} textColor={textColor} colorMode={colorMode} />;
                    }else{
                         return (
                              <ActionsheetItem
                                   isLoading={freezing}
                                   isLoadingText={getTermFromDictionary(language, 'freezing_hold', true)}
                                   onPress={() => {
                                        handleClose();
                                        startFreezing(true);
                                        freezeHold(hold.cancelId, record, hold.source, library.baseUrl, hold.userId, null, language, library.reactivateDateNotRequired ?? false).then(() => {
                                             resetGroup();
                                             startFreezing(false);
                                        });
                                   }}>
                                   <MaterialCommunityIcons name={icon} size={18} className="mr-1" />
                                   <ActionsheetItemText>{label}</ActionsheetItemText>
                              </ActionsheetItem>
                         );
                    }
               }
          } else {
               return null;
          }
     };

     const createUpdatePickupLocationAction = (canUpdate, available) => {
          if (canUpdate && !available) {
               return <SelectPickupLocation isOpen={showActionsheet} language={language} libraryContext={library} holdsContext={updateHolds} locations={pickupLocations} sublocations={sublocations} onClose={handleClose} userId={hold.userId} currentPickupId={hold.pickupLocationId} holdId={hold.cancelId} resetGroup={resetGroup} textColor={textColor} colorMode={colorMode} neutralPairs={neutralPairs} brand={brand} />;
          } else {
               return null;
          }
     };

     return (
          <>
               <Pressable onPress={handleOpen} className="pl-4 py-2" style={{ borderBottomWidth: 1, borderColor: separatorColor, paddingRight: 80 }}>
                    <HStack space="sm" className="max-w-[95%]">
                         {initializeLeftColumn()}
                         <VStack>
                              {getTitle(hold.title)}
                              {getBadge(hold.status, hold.frozen, hold.available, hold.source, hold.statusMessage ?? '')}
                              {getCallNumber(hold.callNumber)}
                              {getVolume(hold.volume)}
                              {getAuthor(hold.author)}
                              {getFormat(hold.format)}
                              {getCollectionName(hold.source, hold.collectionName ?? null)}
                              {getType(hold.type)}
                              {getOnHoldFor(hold.user)}
                              {getPickupLocation(hold.currentPickupName, hold.source)}
                              {getExpirationDate(hold.expirationDate, hold.available)}
                              {getOutOfHoldGroupMessage(hold.outOfHoldGroupMessage)}
                              {getPosition(hold.position, hold.available, hold.holdQueueLength, holdPosition, usesHoldPosition,hold.outOfHoldGroupMessage)}
                         </VStack>
                    </HStack>
               </Pressable>
               <Actionsheet isOpen={showActionsheet} onClose={handleClose} zIndex={999}>
                    <ActionsheetBackdrop />
                    <ActionsheetContent>
                        <ActionsheetItem className="h-15 px-4">
                             <ActionsheetItemText bold>{hold.title}</ActionsheetItemText>
                         </ActionsheetItem>
                         {createCheckoutHoldAction()}
                         {createOpenGroupedWorkAction()}
                         {createCancelHoldAction()}
                         {createFreezeHoldAction()}
                         {createUpdatePickupLocationAction(hold.locationUpdateable ?? false, hold.available)}
                    </ActionsheetContent>
               </Actionsheet>
          </>
     );
};

/**
 * ManageSelectedHolds component that displays a button to manage selected holds. When clicked, it opens an action sheet with options to cancel, freeze, or thaw the selected holds. It handles the state of the action sheet and the loading states for various actions.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
export const ManageSelectedHolds = (props) => {
     const { selectedValues, resetGroup } = props;
     const language = useActiveLanguage();
     const library = useLibrary();
     const { updateHolds } = React.useContext(HoldsContext);
     const { neutrals, brand, colorMode, textColor } = useTheme();

     const [showActionsheet, setShowActionsheet] = React.useState(false)
     const handleOpen = () => setShowActionsheet(true);
     const handleClose = () => setShowActionsheet(false);
     const [cancelling, startCancelling] = React.useState(false);
     const [thawing, startThawing] = React.useState(false);
     const [freezing, startFreezing] = React.useState(false);

     let titlesToFreeze = [];
     let titlesToThaw = [];
     let titlesToCancel = [];

     let numToCancel = 0;
     let numToFreeze = 0;
     let numToThaw = 0;
     let numSelected = 0;

     if (_.isArray(selectedValues)) {
          _.map(selectedValues, function (item) {
               if (item.includes('freeze')) {
                    const arr = item.split('|');
                    titlesToFreeze.push({
                         action: arr[0],
                         recordId: arr[1],
                         cancelId: arr[2],
                         source: arr[3],
                         patronId: arr[4] });
               }
               if (item.includes('thaw')) {
                    const arr = item.split('|');
                    titlesToThaw.push({
                         action: arr[0],
                         recordId: arr[1],
                         cancelId: arr[2],
                         source: arr[3],
                         patronId: arr[4] });
               }

               const arr = item.split('|');
               titlesToCancel.push({
                    action: arr[0],
                    recordId: arr[1],
                    cancelId: arr[2],
                    source: arr[3],
                    patronId: arr[4] });
          });

          numToCancel = titlesToCancel.length;
          numToFreeze = titlesToFreeze.length;
          numToThaw = titlesToThaw.length;
          numSelected = _.toString(selectedValues.length);
     }

     const numToCancelLabel = getTermFromDictionary(language, 'cancel_selected_holds') + ' (' + numToCancel + ')';
     const numToFreezeLabel = getTermFromDictionary(language, 'freeze_selected_holds') + ' (' + numToFreeze + ')';
     const numToThawLabel = getTermFromDictionary(language, 'thaw_selected_holds') + ' (' + numToThaw + ')';
     const numSelectedLabel = getTermFromDictionary(language, 'manage_selected') + ' (' + numSelected + ')';
     const freezingHoldLabel = getTermFromDictionary(language, 'freezing_hold');
     const freezeHoldLabel = getTermFromDictionary(language, 'freeze_hold');

     const cancelActionItem = () => {
          if (numToCancel > 0) {
               return (
                    <ActionsheetItem
                         onPress={() => {
                              handleClose();
                              startCancelling(true);
                              cancelHolds(titlesToCancel, library.baseUrl, language).then(() => {
                                   resetGroup();
                                   startCancelling(false);
                              });
                         }}
                         isLoading={cancelling}
                         isLoadingText={getTermFromDictionary(language, 'canceling', true)}>
                         <ActionsheetItemText>{numToCancelLabel}</ActionsheetItemText>
                    </ActionsheetItem>
               );
          } else {
               return <ActionsheetItem isDisabled><ActionsheetItemText>{getTermFromDictionary(language, 'cancel_holds')}</ActionsheetItemText></ActionsheetItem>;
          }
     };

     const thawActionItem = () => {
          if (numToThaw > 0) {
               return (
                    <ActionsheetItem
                         onPress={() => {
                              handleClose();
                              startThawing(true);
                              thawHolds(titlesToThaw, library.baseUrl, language).then(() => {
                                   resetGroup();
                                   startThawing(false);
                              });
                         }}
                         isLoading={thawing}
                         isLoadingText={getTermFromDictionary(language, 'thawing_hold', true)}>
                         <ActionsheetItemText>{numToThawLabel}</ActionsheetItemText>
                    </ActionsheetItem>
               );
          } else {
               return <ActionsheetItem isDisabled><ActionsheetItemText>{numToThawLabel}</ActionsheetItemText></ActionsheetItem>;
          }
     };

     const freezeActionItem = () => {
          if (numToFreeze > 0) {
               if (library.showDateWhenSuspending) {
                    return <SelectThawDate label={numToFreezeLabel} freezeLabel={freezeHoldLabel} freezingLabel={freezingHoldLabel} language={language} holdsContext={updateHolds} libraryContext={library} resetGroup={resetGroup} onClose={handleClose} count={numToFreeze} numSelected={numSelected} data={titlesToFreeze} textColor={textColor} colorMode={colorMode} />;
               }else{
                    return (
                         <ActionsheetItem
                              isLoading={freezing}
                              isLoadingText={getTermFromDictionary(language, 'freezing_hold', true)}
                              onPress={() => {
                                   handleClose();
                                   startFreezing(true);
                                   freezeHolds(titlesToFreeze, library.baseUrl, null,'en', library.reactivateDateNotRequired ?? false).then(() => {
                                        resetGroup();
                                        startFreezing(false);
                                   });
                              }}>
                              <ActionsheetItemText>{numToFreezeLabel}</ActionsheetItemText>
                         </ActionsheetItem>
                    );
               }
          } else {
               return <ActionsheetItem isDisabled><ActionsheetItemText>{numToFreezeLabel}</ActionsheetItemText></ActionsheetItem>;
          }
     }

     return (
          <Center>
               <Button onPress={handleOpen} size="sm" variant="solid" colorScheme="primary" className="mr-1">
                    <ButtonText>{numSelectedLabel}</ButtonText>
               </Button>
               <Actionsheet isOpen={showActionsheet} onClose={handleClose} zIndex={999}>
                    <ActionsheetBackdrop />
                    <ActionsheetContent
                         zIndex={999}
                    >
                         <ActionsheetDragIndicatorWrapper>
                              <ActionsheetDragIndicator />
                         </ActionsheetDragIndicatorWrapper>
                         {cancelActionItem()}
                         {freezeActionItem()}
                         {thawActionItem()}
                    </ActionsheetContent>
               </Actionsheet>
          </Center>
     );
};

/**
 * ManageAllHolds component that displays a button to manage all holds. When clicked, it opens an action sheet with options to cancel, freeze, or thaw all holds. It handles the state of the action sheet and the loading states for various actions.
 * @param props
 * @returns {React.JSX.Element|null}
 * @constructor
 */
export const ManageAllHolds = (props) => {
     const queryClient = useQueryClient();
     const { resetGroup } = props;
     const language = useActiveLanguage();
     const { holds, updateHolds } = React.useContext(HoldsContext);
     const library = useLibrary();
     const { neutrals, brand, colorMode, textColor } = useTheme();
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};

     const [showActionsheet, setShowActionsheet] = React.useState(false)
     const handleOpen = () => setShowActionsheet(true);
     const handleClose = () => setShowActionsheet(false);
     const [cancelling, startCancelling] = React.useState(false);
     const [thawing, startThawing] = React.useState(false);
     const [freezing, startFreezing] = React.useState(false);

     let titlesToFreeze = [];
     let titlesToThaw = [];
     let titlesToCancel = [];

     const holdsNotReady = holds[1].data;

     if (_.isArray(holdsNotReady)) {
          _.map(holdsNotReady, function (item) {
               let record = item.recordId;
               if(item.source === 'overdrive') {
                  record = item.sourceId
               }
               if (item.canFreeze) {
                    if (item.frozen) {
                         titlesToThaw.push({
                              recordId: record,
                              cancelId: item.cancelId,
                              source: item.source,
                              patronId: item.userId });
                    } else {
                         titlesToFreeze.push({
                              recordId: record,
                              cancelId: item.cancelId,
                              source: item.source,
                              patronId: item.userId });
                    }
               }

               if (item.cancelable) {
                    titlesToCancel.push({
                         recordId: record,
                         cancelId: item.cancelId,
                         source: item.source,
                         patronId: item.userId });
               }
          });
     }

     let numToCancel = titlesToCancel.length;
     let numToFreeze = titlesToFreeze.length;
     let numToThaw = titlesToThaw.length;

     let numToManage = numToCancel + numToFreeze + numToThaw;

     const numToCancelLabel = getTermFromDictionary(language, 'cancel_all_holds') + ' (' + numToCancel + ')';
     const numToFreezeLabel = getTermFromDictionary(language, 'freeze_all_holds') + ' (' + numToFreeze + ')';
     const numToThawLabel = getTermFromDictionary(language, 'thaw_all_holds') + ' (' + numToThaw + ')';
     const freezingHoldLabel = getTermFromDictionary(language, 'freezing_hold');
     const freezeHoldLabel = getTermFromDictionary(language, 'freeze_hold');

     const freezeAllActionItem = () => {
          if (numToFreeze > 0) {
               if (library.showDateWhenSuspending) {
                    return <SelectThawDate label={numToFreezeLabel} freezeLabel={freezeHoldLabel} freezingLabel={freezingHoldLabel} language={language} holdsContext={updateHolds} libraryContext={library} resetGroup={resetGroup} onClose={handleClose} count={numToFreeze} numSelected={numToManage} data={titlesToFreeze} textColor={textColor} colorMode={colorMode} />;
               }else{
                    return (
                         <ActionsheetItem
                              isLoading={freezing}
                              isLoadingText={getTermFromDictionary(language, 'freezing_hold', true)}
                              onPress={() => {
                                   handleClose();
                                   startFreezing(true);
                                   freezeHolds(titlesToFreeze, library.baseUrl, null,'en', library.reactivateDateNotRequired ?? false).then(() => {
                                        resetGroup();
                                        startFreezing(false);
                                   });
                                   queryClient.invalidateQueries({ queryKey: ['holds', user.id, library.baseUrl, language] });
                              }}>
                              <ActionsheetItemText>{numToFreezeLabel}</ActionsheetItemText>
                         </ActionsheetItem>
                    );
               }
          } else {
               return <ActionsheetItem isDisabled><ActionsheetItemText>{freezeHoldLabel}</ActionsheetItemText></ActionsheetItem>;
          }
     }

     if (numToManage >= 1) {
          return (
               <Center>
                    <Button size="sm" variant="solid" colorScheme="primary" className="mr-1" onPress={handleOpen}>
                         <ButtonText>{getTermFromDictionary(language, 'hold_manage_all')}</ButtonText>
                    </Button>
                    <Actionsheet isOpen={showActionsheet} onClose={handleClose} zIndex={999}>
                         <ActionsheetBackdrop />
                         <ActionsheetContent
                              zIndex={999}
                         >
                              <ActionsheetDragIndicatorWrapper>
                                   <ActionsheetDragIndicator />
                              </ActionsheetDragIndicatorWrapper>
                              <ActionsheetItem
                                   isLoading={cancelling}
                                   isLoadingText={getTermFromDictionary(language, 'canceling', true)}
                                   onPress={() => {
                                        handleClose();
                                        startCancelling(true);
                                        cancelHolds(titlesToCancel, library.baseUrl, language).then(() => {
                                             resetGroup();
                                             startCancelling(false);
                                        });
                                        queryClient.invalidateQueries({ queryKey: ['holds', user.id, library.baseUrl, language] });
                                   }}>
                                   <ActionsheetItemText>{numToCancelLabel}</ActionsheetItemText>
                              </ActionsheetItem>

                              {freezeAllActionItem()}

                              <ActionsheetItem
                                   isLoading={thawing}
                                   isLoadingText={getTermFromDictionary(language, 'thaw_hold', true)}
                                   onPress={() => {
                                        handleClose();
                                        startThawing(true);
                                        thawHolds(titlesToThaw, library.baseUrl, language).then(() => {
                                             resetGroup();
                                             startThawing(false);
                                        });
                                        queryClient.invalidateQueries({ queryKey: ['holds', user.id, library.baseUrl, language] });
                                   }}>
                                   <ActionsheetItemText>{numToThawLabel}</ActionsheetItemText>
                              </ActionsheetItem>
                         </ActionsheetContent>
                    </Actionsheet>
               </Center>
          );
     }

     return null;
};
