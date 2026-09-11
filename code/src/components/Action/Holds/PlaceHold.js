import { useQueryClient } from '@tanstack/react-query';
import _ from 'lodash';
import React from 'react';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../themed/ThemedButton';
import { HoldsContext } from '@/src/context/initialContext';
import { useLibrary } from '@/src/hooks/useLibrarySystemData';
import { useUserState, useAccounts, useLocations, useUpdateUserProfile } from '@/src/hooks/useUserData';
import { refreshProfile } from '@/src/util/api/user';
import { completeAction } from '@/src/util/api/userHelper';
import { HoldPrompt } from './HoldPrompt';
import { logDebugMessage } from '@/src/util/logging';
import { useTheme } from '@/src/themes/theme';

/**
 * PlaceHold component for displaying a button that places a hold on an item.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
export const PlaceHold = (props = {}) => {
     const queryClient = useQueryClient();
     const {
          id,
          type,
          volumeInfo = {},
          volumeId,
          volumeName,
          title,
          record,
          holdTypeForFormat,
          variationId,
          prevRoute,
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
          language,
          holdSelectItemResponse,
          setHoldSelectItemResponse,
          holdItemSelectIsOpen,
          setHoldItemSelectIsOpen,
          onHoldItemSelectClose,
          cancelHoldItemSelectRef,
          userHasAlternateLibraryCard,
          shouldPromptAlternateLibraryCard
     } = props;
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const updateUserProfile = useUpdateUserProfile();
     const preferredPickupLocationIsValid = userState?.preferredPickupLocationIsValid ?? true;
     const { data: accounts } = useAccounts();
     const { data: locations } = useLocations();
      const library = useLibrary();
     const holdsContext = React.useContext(HoldsContext) ?? {};
     const holds = holdsContext.holds ?? [];
     const { brand } = useTheme();
     const primary500 = brand.primary[500];
     const primary500Text = brand.primary['500-text'];
      const safeLocations = _.isArray(locations) ? locations : [];
      const safeAccounts = _.isArray(accounts) ? accounts : [];
      const numItemsWithVolumes = _.toNumber(volumeInfo?.numItemsWithVolumes ?? 0);

     const refreshAndSaveUserProfile = React.useCallback(async () => {
          const profileResponse = await refreshProfile(library.baseUrl);
          if (profileResponse?.ok && profileResponse?.data?.result?.profile) {
               await updateUserProfile(profileResponse.data.result.profile);
          }
     }, [library.baseUrl, updateUserProfile]);

     let userPickupLocationId = user.pickupLocationId ?? user.homeLocationId;
     if (_.isNumber(user.pickupLocationId)) {
          userPickupLocationId = _.toString(user.pickupLocationId);
     }

     let pickupLocation = '';
     if (_.size(safeLocations) > 1) {
          const userPickupLocation = _.filter(safeLocations, { locationId: userPickupLocationId });
          if (!_.isUndefined(userPickupLocation && !_.isEmpty(userPickupLocation))) {
               pickupLocation = userPickupLocation[0];
               if (_.isObject(pickupLocation)) {
                    pickupLocation = pickupLocation.code;
               }
          }
     } else {
          pickupLocation = safeLocations[0];
          if (_.isObject(pickupLocation)) {
               pickupLocation = pickupLocation.code;
          }
     }

     logDebugMessage("Pickup Location: " + pickupLocation);

     const [sublocation, setSublocation] = React.useState(null);

     let promptForHoldNotifications = user.promptForHoldNotifications ?? false;

     let loadHoldPrompt = false;
     if (!preferredPickupLocationIsValid) {
          logDebugMessage("Showing Hold Prompt because the user's preferred pickup location is invalid");
          loadHoldPrompt = true;
     }else if (numItemsWithVolumes >= 1 && _.isEmpty(volumeId)) {
          logDebugMessage("Showing Hold Prompt to select volume");
          loadHoldPrompt = true;
     }else if (_.size(safeAccounts) > 0) {
          logDebugMessage("Showing Hold Prompt due to linked accounts");
          loadHoldPrompt = true;
     }else if (_.size(safeLocations) > 1 && user.rememberHoldPickupLocation == 0) {
          logDebugMessage("Showing Hold Prompt due to having locations user.rememberHoldPickupLocation = " + user.rememberHoldPickupLocation);
          loadHoldPrompt = true;
     }else if (promptForHoldNotifications) {
          logDebugMessage("Showing Hold Prompt due to prompt for hold notifications");
          loadHoldPrompt = true;
     }else if ((holdTypeForFormat === 'item' || holdTypeForFormat === 'either') && _.isEmpty(volumeId)){
          logDebugMessage("Showing Hold Prompt due to hold type");
          loadHoldPrompt = true;
     }else if (shouldPromptAlternateLibraryCard && !userHasAlternateLibraryCard) {
          logDebugMessage("Showing Hold Prompt due to alternate library card");
          loadHoldPrompt = true;
     }

     //Check to see if the title is already on hold for the patron
     logDebugMessage("holdTypeForFormat = " + holdTypeForFormat);
     logDebugMessage("record = " + record);
     let alreadyOnHold = false;
     if(holds) {
          holds.forEach(holdSection => {
               holdSection.data.forEach(hold => {
                    if ((hold.source + ':' + hold.sourceId) == record) {
                         alreadyOnHold = true;
                    }
               });
          });
     }
     if (alreadyOnHold) {
          logDebugMessage("Showing Hold Prompt because titles is already on hold");
          loadHoldPrompt = true;
     }


     if (user.rememberHoldPickupLocation) {
          let userPickupLocationId = user.pickupLocationId ?? user.homeLocationId;
          if (_.isNumber(user.pickupLocationId)) {
               userPickupLocationId = _.toString(user.pickupLocationId);
          }
          const userPickupLocation = _.filter(safeLocations, { locationId: userPickupLocationId });
          let pickupLocation = '';
          if (!_.isUndefined(userPickupLocation && !_.isEmpty(userPickupLocation))) {
               pickupLocation = userPickupLocation[0];
               if (_.isObject(pickupLocation)) {
                    pickupLocation = pickupLocation.locationId;
               }
          } else {
               // soft check on valid pickup location, if nothing is returned out of the locations array, its probably invalid
               logDebugMessage("Showing Hold Prompt because current pickup location is invalid");
               loadHoldPrompt = true;
          }
     }

     if (loadHoldPrompt) {
          logDebugMessage("Need to load hold prompt");
          return (
               <HoldPrompt
                    language={language}
                    id={record}
                    title={title}
                    action={type}
                    holdTypeForFormat={holdTypeForFormat}
                    variationId={variationId}
                    volumeInfo={volumeInfo}
                    volumeId={volumeId}
                    volumeName={volumeName}
                    prevRoute={prevRoute}
                    isEContent={false}
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
                    alreadyOnHold={alreadyOnHold}
               />
          );
     } else {
          logDebugMessage("Hold can be placed without prompting");
          let holdType = 'default';
          if (!_.isEmpty(volumeId)) {
               holdType = 'volume';
          }
          // The hold can be placed without additional prompting to the user.
          // See HoldPrompt.js for actions if a pickup location etc. is needed.
          return (
               <>
                    <Button
                         size="md"
                         variant="solid"
                         style={{ backgroundColor: primary500, minWidth: '100%', maxWidth: '100%' }}
                         onPress={async () => {
                              await completeAction(record, type, user.id, '', '', pickupLocation, sublocation, user.rememberHoldPickupLocation, library.baseUrl, volumeId, holdType).then(async (ilsResponse) => {
                                   setResponse(ilsResponse);

                                   if (ilsResponse?.confirmationNeeded && ilsResponse.confirmationNeeded) {
                                        setHoldConfirmationResponse({
                                             message: ilsResponse.api?.message ?? ilsResponse.message,
                                             title: ilsResponse.api?.title ?? ilsResponse.title,
                                             confirmationNeeded: ilsResponse.confirmationNeeded ?? false,
                                             confirmationId: ilsResponse.confirmationId ?? null,
                                             recordId: record ?? null });
                                   }
                                   if (ilsResponse?.shouldBeItemHold && ilsResponse.shouldBeItemHold) {
                                        setHoldSelectItemResponse({
                                             message: ilsResponse.message,
                                             title: 'Select an Item',
                                             patronId: user.id,
                                             pickupLocation: pickupLocation,
                                             bibId: record ?? null,
                                             items: ilsResponse.items ?? [] });
                                   }

                                   if (ilsResponse?.success === true || ilsResponse?.success === 'true') {
                                        //Refresh the hold and user if the hold was successful
                                        queryClient.invalidateQueries({ queryKey: ['holds', user.id, library.baseUrl, language] });
                                        await refreshAndSaveUserProfile();

                                        const timeoutId = setTimeout(() => {
                                             // Also refresh in 45 seconds for Sierra since hold can take a minute to show up on the account
                                             queryClient.invalidateQueries({ queryKey: ['holds', user.id, library.baseUrl, language] });
                                             refreshAndSaveUserProfile();
                                        }, 45 * 1000);
                                   }

                                   if (ilsResponse?.confirmationNeeded && ilsResponse.confirmationNeeded) {
                                        setHoldConfirmationIsOpen(true);
                                   } else if (ilsResponse?.shouldBeItemHold && ilsResponse.shouldBeItemHold) {
                                        setHoldItemSelectIsOpen(true);
                                   } else {
                                        setResponseIsOpen(true);
                                   }
                              });
                         }}>
                         <ButtonText style={{ color: primary500Text, textAlign: 'center' }}>
                              {title}
                         </ButtonText>
                    </Button>
               </>
          );
     }
};
