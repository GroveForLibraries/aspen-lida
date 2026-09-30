import { ThemedMaterialIcons as MaterialIcons } from '@/src/components/themed/ThemedMaterialIcons';
import React from 'react';
import { getTermFromDictionary } from '@/src/translations/TranslationService';
import { changeHoldPickUpLocation, getPickupLocations } from '@/src/util/api/user';
import {SelectExistingHoldSubLocation} from './SelectExistingHoldSubLocation';
import { ThemedCloseIcon as CloseIcon, ThemedFormControl as FormControl, ThemedFormControlLabelText as FormControlLabelText, ThemedFormControlLabel as FormControlLabel } from '@/src/components/themed/ThemedFormControls';
import { ThemedActionsheetItem as ActionsheetItem, ThemedActionsheetItemText as ActionsheetItemText } from '@/src/components/themed/ThemedActionsheet';
import { Box } from '@/components/ui/box';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { ThemedModal as Modal, ThemedModalBackdrop as ModalBackdrop, ThemedModalBody as ModalBody, ThemedModalCloseButton as ModalCloseButton, ThemedModalContent as ModalContent, ThemedModalFooter as ModalFooter, ThemedModalHeader as ModalHeader } from '@/src/components/themed/ThemedModal';
import { ThemedScrollView as ScrollView } from '@/src/components/themed/ThemedScrollView';
import { ThemedSelect as Select, ThemedSelectBackdrop as SelectBackdrop, ThemedSelectContent as SelectContent, ThemedSelectDragIndicator as SelectDragIndicator, ThemedSelectDragIndicatorWrapper as SelectDragIndicatorWrapper, ThemedSelectInput as SelectInput, ThemedSelectItem as SelectItem, ThemedSelectPortal as SelectPortal, ThemedSelectTrigger as SelectTrigger } from '../../../components/themed/ThemedSelect';
import { findByProperty } from '@/src/helpers/helpers';
import { formatPickupLocations } from '@/src/util/api/userHelper';

/**
 * SelectPickupLocation component that renders a modal for selecting a new pickup location for a hold. It displays a list of available locations and sublocations, allows the user to select one, and updates the hold's pickup location when confirmed.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
export const SelectPickupLocation = (props) => {
     const { sublocations, onClose, currentPickupId, holdId, pickupRecordId, libraryContext, holdsContext, resetGroup, language, textColor, colorMode, neutralPairs, userId } = props;

     const [loading, setLoading] = React.useState(false);
     const [loadingLocations, setLoadingLocations] = React.useState(false);
     const [showModal, setShowModal] = React.useState(false);
     const [locations, setLocations] = React.useState([]);
     const [location, setLocation] = React.useState('');
     const [activeSublocation, setActiveSublocation] = React.useState(null);

     const buildInitialLocation = React.useCallback((allLocations) => {
          const matchedLocation = findByProperty(allLocations, 'locationId', currentPickupId);
          if (!matchedLocation) {
               return '';
          }

          const locationId = String(matchedLocation.locationId ?? '');
          const code = String(matchedLocation.code ?? '');
          return `${locationId}_${code}`;
     }, [currentPickupId]);

     const loadLocations = React.useCallback(async () => {
          setLoadingLocations(true);
          const result = await getPickupLocations(libraryContext.baseUrl, null, pickupRecordId);
          if (result?.ok) {
               const pickupLocationsResult = formatPickupLocations(result.data?.result ?? []);
               const validLocations = pickupLocationsResult?.locations ?? [];
               setLocations(validLocations);

               const initialLocation = buildInitialLocation(validLocations);
               if (initialLocation) {
                    setLocation(initialLocation);
               }
          }
          setLoadingLocations(false);
     }, [libraryContext.baseUrl, pickupRecordId, buildInitialLocation]);

     return (
          <>
               <ActionsheetItem
                    isLoading={loadingLocations}
                    onPress={async () => {
                         setShowModal(true);
                         await loadLocations();
                    }}>
                    <MaterialIcons name="location-on" size={18} className="mr-1" />
                   <ActionsheetItemText>{getTermFromDictionary(language, 'change_location')}</ActionsheetItemText>
               </ActionsheetItem>
               <Modal
                    isOpen={showModal}
                    onBackdropPress={() => {
                         setShowModal(false);
                    }}>
                    <ModalBackdrop />
                    <ModalContent>
                         <ModalHeader>
                              <Heading>{getTermFromDictionary(language, 'change_hold_location')}</Heading>
                              <ModalCloseButton onPress={() => { setShowModal(false); }}>
                                  <CloseIcon />
                              </ModalCloseButton>
                         </ModalHeader>
                         <ModalBody>
                              <Box className="pl-4 pr-4">
                                   <FormControl>
                                       <FormControlLabel><FormControlLabelText>{getTermFromDictionary(language, 'select_new_pickup')}</FormControlLabelText></FormControlLabel>
                                        <Select
                                             name="pickupLocations"
                                             selectedValue={location}
                                             minWidth="100%"
                                             accessibilityLabel={getTermFromDictionary(language, 'select_new_pickup')}
                                             className="mt-1 mb-3"
                                             onValueChange={(itemValue) => setLocation(itemValue)}>

                                             <SelectTrigger>
                                                  {locations.map((item, index) => {
                                                       const locationId = String(item.locationId ?? '');
                                                       const code = String(item.code ?? '');
                                                       const id = locationId.concat('_', code);
                                                       if (id === location) {
                                                            return <SelectInput key={index} value={item.name} />;
                                                       }
                                                       return null;
                                                  })}
                                             </SelectTrigger>
                                             <SelectPortal>
                                                  <SelectBackdrop />
                                                  <SelectContent>
                                                       <SelectDragIndicatorWrapper>
                                                            <SelectDragIndicator />
                                                       </SelectDragIndicatorWrapper>
                                                       <ScrollView className="max-h-100 min-w-full">
                                                            {locations.map((item, index) => {
                                                                 const locationId = String(item.locationId ?? '');
                                                                 const code = String(item.code ?? '');
                                                                 const id = locationId.concat('_', code);
                                                                 return (
                                                                     <SelectItem
                                                                          value={id}
                                                                          label={item.name}
                                                                          key={index}
                                                                          selectedValue={location}
                                                                      />
                                                                 );
                                                            })}
                                                       </ScrollView>
                                                  </SelectContent>
                                             </SelectPortal>
                                        </Select>
                                   </FormControl>
                              </Box>
                              <SelectExistingHoldSubLocation location={location} sublocations={sublocations} language={language} activeSublocation={activeSublocation} setActiveSublocation={setActiveSublocation} textColor={textColor} colorMode={colorMode} neutralPairs={neutralPairs} />
                         </ModalBody>
                         <ModalFooter>
                              <ButtonGroup
                                   space="md"
                                   className="flex-row justify-end flex-wrap"
                                   >
                                   <Button colorScheme="primary"
                                        variant="outline"
                                       
                                        onPress={() => {
                                             setShowModal(false);
                                        }}>
                                       <ButtonText>{getTermFromDictionary(language, 'cancel')}</ButtonText>
                                   </Button>
                                   <Button
                                        isDisabled={loadingLocations || !location}
                                        isLoading={loading}
                                       colorScheme="primary"
                                        isLoadingText={getTermFromDictionary(language, 'updating', true)}
                                        onPress={() => {
                                             setLoading(true);
                                             changeHoldPickUpLocation(holdId, location, activeSublocation, libraryContext.baseUrl, userId, language).then((r) => {
                                                  setShowModal(false);
                                                  resetGroup();
                                                  onClose(onClose);
                                                  setLoading(false);
                                             });
                                        }}>
                                       <ButtonText>{getTermFromDictionary(language, 'change_location')}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </ModalFooter>
                    </ModalContent>
               </Modal>
          </>
     );
};
