import { ThemedMaterialIcons as MaterialIcons } from '@/src/components/themed/ThemedMaterialIcons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { ThemedActionsheet as Actionsheet, ThemedActionsheetBackdrop as ActionsheetBackdrop, ThemedActionsheetItem as ActionsheetItem, ThemedActionsheetContent as ActionsheetContent, ThemedActionsheetItemText as ActionsheetItemText } from '@/src/components/themed/ThemedActionsheet';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { useUserState } from '@/src/hooks/useUserData';
import {
     getAuthor,
     getCheckedOutTo,
     getCleanTitle,
     getDueDate,
     getFormat,
     getRenewalCount,
     getTitle,
     isOverdue,
     willAutoRenew,
     getCollectionName,
     CheckoutAccessLabel
} from '@/src/helpers/item';
import { navigate, navigateStack } from '@/src/helpers/RootNavigator';
import { getTermFromDictionary } from '@/src/translations/TranslationService';
import { renewCheckout, returnCheckout, viewOnlineItem, viewOverDriveItem } from '@/src/util/api/user';
import { stripHTML, formatDiscoveryVersion } from '@/src/helpers/helpers';
import { useActiveLanguage } from '@/src/hooks/useLanguageData';
import { useTheme } from '@/src/themes/theme';
import { useLibrary } from '@/src/hooks/useLibrarySystemData';

/**
 * MyCheckout component that displays information about a checked-out item and provides actions for renewing, returning, or accessing the item. It uses various hooks to manage state, theme, and library data, and it handles user interactions with the checkout item.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
export const MyCheckout = (props) => {
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const library = useLibrary();
     const language = useActiveLanguage();
     const version = formatDiscoveryVersion(library.discoveryVersion);
     const { textColor, neutrals } = useTheme();
     const borderColor = neutrals.border;

     const [access, setAccess] = useState(false);
     const [returning, setReturn] = useState(false);
     const [renewing, setRenew] = useState(false);
     const [isOpen, setIsOpen] = React.useState(false);

     const blurhash = 'MHPZ}tt7*0WC5S-;ayWBofj[K5RjM{ofM_';

     const checkout = props.data;
     const setRenewConfirmationIsOpen = props.setRenewConfirmationIsOpen;
     const setRenewConfirmationResponse = props.setRenewConfirmationResponse;
     const reloadCheckouts = props.reloadCheckouts;

     const openGroupedWork = (item, title) => {
          navigateStack('AccountScreenTab', 'MyCheckout', {
               id: item,
               title: getCleanTitle(title),
               url: library.baseUrl,
               userContext: user,
               libraryContext: library,
               prevRoute: 'MyCheckouts' });
     };
     const toggle = () => {
          setIsOpen(!isOpen);
     };

     let canRenew = !checkout.canRenew;
     let allowLinkedAccountAction = true;
     if (version < '22.05.00') {
          if (checkout.userId !== user.id) {
               allowLinkedAccountAction = false;
          }
     }

     let libbyReaderName = 'Libby';
     if (library.libbyReaderName) {
          libbyReaderName = library.libbyReaderName;
     }

     let returnEarly = false;
     if (checkout.canReturnEarly === 1 || checkout.canReturnEarly === '1' || checkout.canReturnEarly === true || checkout.canReturnEarly === 'true') {
          returnEarly = true;
     }

     let renewMessage = false;
     if (checkout.canRenew) {
          renewMessage = getTermFromDictionary(language, 'checkout_renew');
     } else {
          renewMessage = getTermFromDictionary(language, 'not_eligible_for_renewals');
     }
     if (checkout.autoRenew === '1' || checkout.autoRenew === 1) {
          renewMessage = getTermFromDictionary(language, 'if_eligible_auto_renew');
     }
     if (checkout.autoRenewError) {
          renewMessage = checkout.autoRenewError;
     }
     if (checkout.renewError) {
          renewMessage = checkout.renewError;
     }

     const key = 'medium_' + checkout.source + '_' + checkout.groupedWorkId;
     let url = library.baseUrl + '/bookcover.php?id=' + checkout.fullId + '&size=medium';

     let itemId = checkout.itemId;
     if (checkout.renewalId) {
          itemId = checkout.renewalId;
     }

	let record = checkout.recordId;
	if(checkout.source === 'overdrive') {
		record = checkout.sourceId
	}

     const handleOpenPalaceProjectInstructions = () => {
          navigate('PalaceProjectInstructionsModal');
     };


     return (
         <Pressable onPress={toggle} style={{ borderBottomWidth: 1, borderBottomColor: borderColor }} className="py-2">
              <HStack space="sm" className="w-[75%]">
                    <Image
                         alt={checkout.title}
                         source={url}
                         style={{ width: 100.0, height: 150.0 }}
                         className="rounded-lg"
                         placeholder={blurhash}
                         transition={1000}
                         contentFit="cover"
                    />
                    <VStack>
                         {getTitle(checkout.title)}
                         {isOverdue(checkout.overdue)}
                         {getAuthor(checkout.author)}
                         {getFormat(checkout.format, checkout.source)}
                         {getCollectionName(checkout.source, checkout.collectionName ?? null)}
                         {getCheckedOutTo(checkout.user)}
                         {getDueDate(checkout.dueDate)}
                         {getRenewalCount(checkout.renewCount ?? 0, checkout.maxRenewals ?? null)}
                         {willAutoRenew(checkout.autoRenew ?? false, checkout.renewalDate)}
                    </VStack>
               </HStack>
               <Actionsheet isOpen={isOpen} onClose={toggle} size="full">
                    <ActionsheetBackdrop />
                    <ActionsheetContent>
                         <ActionsheetItem className="h-15 px-4">
                              <ActionsheetItemText className="font-bold">{checkout.title}</ActionsheetItemText>
                         </ActionsheetItem>
                         {checkout.groupedWorkId ? (
                              <ActionsheetItem
                                   onPress={() => {
                                        openGroupedWork(checkout.groupedWorkId, checkout.title);
                                        toggle();
                                   }}
                                   >
                                   <MaterialIcons name="search" size={18} className="mr-1" />
                                   <ActionsheetItemText>{getTermFromDictionary(language, 'view_item_details')}</ActionsheetItemText>
                              </ActionsheetItem>
                         ): null}
                         {renewMessage ? (
                              <ActionsheetItem
                                   className="w-full"
                                   isTruncated
                                   isDisabled={canRenew}
                                   isLoading={renewing}
                                   isLoadingText={getTermFromDictionary(language, 'renewing', true)}
                                   onPress={() => {
                                        setRenew(true);
                                        renewCheckout(checkout.barcode, record, checkout.source, itemId, library.baseUrl, checkout.userId).then((result) => {
                                             setRenew(false);

                                             if (result?.confirmRenewalFee && result.confirmRenewalFee) {
                                                  setRenewConfirmationResponse({
                                                       message: result.api.message,
                                                       title: result.api.title,
                                                       confirmRenewalFee: result.confirmRenewalFee ?? false,
                                                       action: result.api.action,
                                                       recordId: record ?? null,
                                                       barcode: checkout.barcode ?? null,
                                                       source: checkout.source ?? null,
                                                       itemId: itemId ?? null,
                                                       userId: checkout.userId ?? null,
                                                       renewType: 'single' });
                                             }

                                             if (result?.confirmRenewalFee && result.confirmRenewalFee) {
                                                  setRenewConfirmationIsOpen(true);
                                             } else {
                                                  reloadCheckouts();
                                             }

                                             toggle();
                                        });
                                   }}
                                   >
                                   <MaterialIcons name="autorenew" size={18} className="mr-1" />
                                   <ActionsheetItemText>{stripHTML(renewMessage)}</ActionsheetItemText>
                              </ActionsheetItem>
                         ) : null}
                         {checkout.source === 'overdrive' ? (
                              <ActionsheetItem
                                   isLoading={access}
                                   isLoadingText={getTermFromDictionary(language, 'accessing', true)}
                                   onPress={() => {
                                        setAccess(true);
                                        viewOverDriveItem(checkout.userId, checkout.formatId, checkout.overDriveId, library.baseUrl, language).then((result) => {
                                             setAccess(false);
                                             toggle();
                                        });
                                   }}
                                   >
                                   <MaterialIcons name="book" size={18} className="mr-1" />
                                   <CheckoutAccessLabel checkout={checkout} libbyReaderName={libbyReaderName} baseUrl={library.baseUrl} language={language} color={textColor}></CheckoutAccessLabel>
                              </ActionsheetItem>
                         ) : null}
                         {checkout.source === 'palace_project' ? (
                              <ActionsheetItem onPress={() => handleOpenPalaceProjectInstructions()}>
                                   <MaterialIcons name="info" size={18} className="mr-1" />
                                   <ActionsheetItemText>{getTermFromDictionary(language, 'access_instructions')}</ActionsheetItemText>
                              </ActionsheetItem>
                         ) : null}
                         {checkout.accessOnlineUrl != null ? (
                              <>
                                   <ActionsheetItem
                                        isLoading={access}
                                        isLoadingText={getTermFromDictionary(language, 'accessing', true)}
                                        onPress={() => {
                                             setAccess(true);
                                             viewOnlineItem(checkout.userId, checkout.recordId, checkout.source, checkout.accessOnlineUrl, library.baseUrl, language).then((result) => {
                                                  setAccess(false);
                                                  toggle();
                                             });
                                        }}
                                        >
                                        <MaterialIcons name="book" size={18} className="mr-1" />
                                        <CheckoutAccessLabel checkout={checkout} libbyReaderName={libbyReaderName} baseUrl={library.baseUrl} language={language} color={textColor}></CheckoutAccessLabel>
                                   </ActionsheetItem>
                                   <ActionsheetItem
                                        isLoading={returning}
                                        isLoadingText={getTermFromDictionary(language, 'returning', true)}
                                        onPress={() => {
                                             setReturn(true);
                                             returnCheckout(checkout.userId, record, checkout.source, checkout.overDriveId, library.baseUrl, version, checkout.transactionId, language).then((result) => {
                                                  setReturn(false);
                                                  reloadCheckouts();
                                                  toggle();
                                             });
                                        }}
                                        >
                                        <MaterialIcons name="logout" size={18} className="mr-1" />
                                        <CheckoutAccessLabel checkout={checkout} libbyReaderName={libbyReaderName} baseUrl={library.baseUrl} language={language} color={textColor}></CheckoutAccessLabel>
                                        <ActionsheetItemText>{getTermFromDictionary(language, 'checkout_return_now')}</ActionsheetItemText>
                                   </ActionsheetItem>
                              </>
                         ) : null}
                         {returnEarly && allowLinkedAccountAction ? (
                              <>
                                   <ActionsheetItem
                                        isLoading={returning}
                                        isLoadingText={getTermFromDictionary(language, 'returning', true)}
                                        onPress={() => {
                                             setReturn(true);
                                             returnCheckout(checkout.userId, record, checkout.source, checkout.overDriveId, library.baseUrl, version, checkout.transactionId, language).then((result) => {
                                                  setReturn(false);
                                                  reloadCheckouts();
                                                  toggle();
                                             });
                                        }}
                                        >
                                        <MaterialIcons name="logout" size={18} className="mr-1" />
                                        <ActionsheetItemText>{getTermFromDictionary(language, 'checkout_return_now')}</ActionsheetItemText>
                                   </ActionsheetItem>
                              </>
                         ) : null}
                    </ActionsheetContent>
               </Actionsheet>
          </Pressable>
     );
};
