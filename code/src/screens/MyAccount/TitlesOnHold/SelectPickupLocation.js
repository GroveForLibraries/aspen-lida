import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { findIndex, get, isNumber, nth } from '../../../helpers/helpers';
import {
     ActionsheetItem,
     ActionsheetItemText,
     Box,
     Button,
     ButtonGroup,
     ButtonText,
     ChevronDownIcon,
     CloseIcon,
     FormControl,
     FormControlLabel,
     FormControlLabelText,
     Heading,
     Icon,
     Select,
     SelectTrigger,
     SelectInput,
     SelectIcon,
     SelectPortal,
     SelectBackdrop,
     SelectContent,
     SelectDragIndicatorWrapper,
     SelectDragIndicator,
     SelectItem,
     ActionsheetIcon,
     Modal,
     ModalBackdrop,
     ModalContent,
     ModalCloseButton,
     ModalHeader,
     ModalBody,
     ModalFooter
} from '@gluestack-ui/themed';
import React from 'react';
import { getTermFromDictionary } from '../../../translations/TranslationService';

import { changeHoldPickUpLocation } from '../../../util/api/user';
import {SelectExistingHoldSubLocation} from './SelectExistingHoldSubLocation';
import { ScrollView } from '@gluestack-ui/themed';

export const SelectPickupLocation = (props) => {
     const { locations, sublocations, onClose, currentPickupId, holdId, userId, libraryContext, holdsContext, resetGroup, language, textColor, colorMode, theme } = props;
     let pickupLocation = findIndex(locations, function (o) {
          return o.locationId === currentPickupId;
     });

     let pickupId = currentPickupId;
     if (isNumber(pickupId)) {
          pickupId = String(pickupId);
     }

     pickupLocation = nth(locations, pickupLocation);
     let pickupLocationCode = get(pickupLocation, 'code', '');
     if (isNumber(pickupLocationCode)) {
          pickupLocationCode = String(pickupLocationCode);
     }
     if (pickupId != false) {
          pickupLocation = `${pickupId}_${pickupLocationCode}`;
     }else{
          pickupLocation = '';
     }

     const [loading, setLoading] = React.useState(false);
     const [showModal, setShowModal] = React.useState(false);
     let [location, setLocation] = React.useState(pickupLocation);
     let [activeSublocation, setActiveSublocation] = React.useState(null);

     return (
          <>
               <ActionsheetItem
                    onPress={() => {
                         setShowModal(true);
                    }}>
                    <ActionsheetIcon>
                         <Icon as={Ionicons} name="location" mr="$1" size="md" color={textColor} />
                    </ActionsheetIcon>
                    <ActionsheetItemText color={textColor}>{getTermFromDictionary(language, 'change_location')}</ActionsheetItemText>
               </ActionsheetItem>
               <Modal

                    isOpen={showModal}
                    avoidKeyboard={true}
                    onBackdropPress={() => {
                         setShowModal(false);
                    }}>
                    <ModalBackdrop />
                    <ModalContent bgColor={colorMode === 'light' ? "$warmGray50" : "$coolGray700"}>
                         <ModalHeader>
                              <Heading size="md" color={textColor}>{getTermFromDictionary(language, 'change_hold_location')}</Heading>
                              <ModalCloseButton p="$3" onPress={() => { setShowModal(false); }}>
                                   <Icon as={CloseIcon} color={textColor} />
                              </ModalCloseButton>
                         </ModalHeader>
                         <ModalBody>
                              <Box pl="$4" pr="$4">
                                   <FormControl>
                                        <FormControlLabel><FormControlLabelText color={textColor}>{getTermFromDictionary(language, 'select_new_pickup')}</FormControlLabelText></FormControlLabel>
                                        <Select
                                             name="pickupLocations"
                                             selectedValue={location}
                                             minWidth="100%"
                                             accessibilityLabel={getTermFromDictionary(language, 'select_new_pickup')}
                                             mt="$1"
                                             mb="$3"
                                             onValueChange={(itemValue) => setLocation(itemValue)}>

                                             <SelectTrigger variant="outline" size="md">
                                                  {locations.map((item, index) => {
                                                       const locationId = item.locationId;
                                                       const code = item.code;
                                                       const id = `${locationId}_${code}`;
                                                       if (id === location) {
                                                            return <SelectInput py={0} value={item.name} color={textColor} />;
                                                       }
                                                  })}
                                                  <SelectIcon mr="$3" as={ChevronDownIcon} color={textColor} />
                                             </SelectTrigger>
                                             <SelectPortal>
                                                  <SelectBackdrop />
                                                  <SelectContent
                                                       bgColor={colorMode === 'light' ? "$warmGray50" : "$coolGray700"}
                                                  >
                                                       <SelectDragIndicatorWrapper>
                                                            <SelectDragIndicator />
                                                       </SelectDragIndicatorWrapper>
                                                       <ScrollView style={{ maxHeight: 400, minWidth: "100%" }}>
                                                            {locations.map((item, index) => {
                                                                 const locationId = item.locationId;
                                                                 const code = item.code;
                                                                 const id = `${locationId}_${code}`;
                                                                 return <SelectItem value={id} label={item.name} key={index}  bgColor={location === (id) ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: location === (id) ? theme.tokens.colors.tertiary['500-text'] : textColor } }}/>;
                                                            })}
                                                       </ScrollView>
                                                  </SelectContent>
                                             </SelectPortal>
                                        </Select>
                                   </FormControl>
                              </Box>
                              <SelectExistingHoldSubLocation location={location} sublocations={sublocations} language={language} activeSublocation={activeSublocation} setActiveSublocation={setActiveSublocation}/>
                         </ModalBody>
                         <ModalFooter>
                              <ButtonGroup
                                   space="$4"
                                   flexDirection="row"
                                   justifyContent="flex-end"
                                   flexWrap="wrap"
                                   >
                                   <Button
                                        variant="outline"
                                        borderColor={theme.tokens.colors.primary['500']}
                                        onPress={() => {
                                             setShowModal(false);
                                        }}>
                                        <ButtonText color={theme.tokens.colors.primary['500']}>{getTermFromDictionary(language, 'cancel')}</ButtonText>
                                   </Button>
                                   <Button
                                        isLoading={loading}
                                        bgColor={theme.tokens.colors.primary['500']}
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
                                        <ButtonText color={theme.tokens.colors.primary['500-text']}>{getTermFromDictionary(language, 'change_location')}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </ModalFooter>
                    </ModalContent>
               </Modal>
          </>
     );
};
