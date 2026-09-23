import React from 'react';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { ThemedMaterialIcons as MaterialIcons } from '@/src/components/themed/ThemedMaterialIcons';
import { Platform } from 'react-native';
import { freezeHold, freezeHolds } from '@/src/util/api/user';
import { getTermFromDictionary } from '@/src/translations/TranslationService';
import {logWarnMessage} from '@/src/util/logging';
import { useActiveLanguage } from '@/src/hooks/useLanguageData';
import { useTheme } from '@/src/themes/theme';
import { ThemedCloseIcon as CloseIcon, ThemedFormControl as FormControl, ThemedFormControlLabelText as FormControlLabelText, ThemedFormControlLabel as FormControlLabel } from '@/src/components/themed/ThemedFormControls';
import { ThemedActionsheetItem as ActionsheetItem, ThemedActionsheetItemText as ActionsheetItemText } from '@/src/components/themed/ThemedActionsheet';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { ThemedCheckbox as Checkbox, ThemedCheckboxIcon as CheckboxIcon, ThemedCheckboxIndicator as CheckboxIndicator, ThemedCheckboxLabel as CheckboxLabel } from '../../../components/themed/ThemedCheckbox';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { ThemedModal as Modal, ThemedModalBackdrop as ModalBackdrop, ThemedModalBody as ModalBody, ThemedModalCloseButton as ModalCloseButton, ThemedModalContent as ModalContent, ThemedModalFooter as ModalFooter, ThemedModalHeader as ModalHeader } from '@/src/components/themed/ThemedModal';

/**
 * SelectThawDate component that allows users to select a date for thawing a frozen hold. It manages the visibility of the date picker modal, handles the selection of a date, and triggers the freezing of holds based on the selected date. It also provides an option for freezing holds indefinitely.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
export const SelectThawDate = (props) => {
     const { freezingLabel, freezeLabel, label, libraryContext, onClose, freezeId, recordId, source, userId, resetGroup } = props;
     let data = props.data;
     const language = useActiveLanguage();
     const { colorMode, neutrals } = useTheme();
     const [loading, setLoading] = React.useState(false);
     const [isDatePickerVisible, setDatePickerVisibility] = React.useState(false);
     const [showIndefiniteWarning, setShowIndefiniteWarning] = React.useState(false);
     const [freezeIndefinite, setFreezeIndefinite] = React.useState(false);

     let actionLabel = freezeLabel;
     if (label) {
          actionLabel = label;
     }


     const today = new Date();
     const [date, setDate] = React.useState(today);
     const pickerThemeProps = Platform.OS === 'ios'
          ? {
               themeVariant: colorMode === 'dark' ? 'dark' : 'light',
               textColor: colorMode === 'dark' ? neutrals.white : undefined,
          }
          : {};


     const showDatePicker = () => {
          if(libraryContext.reactivateDateNotRequired ?? false)
          {
               setShowIndefiniteWarning(true);
          }
          else
          {
               //setShowIndefiniteWarning(true);
               setDatePickerVisibility(true);
          }

     };

     const hideDatePicker = () => {
          setDatePickerVisibility(false);
          setShowIndefiniteWarning(false);
     };

     const onSelectDate = (date) => {
          hideDatePicker();
          setLoading(true);
          logWarnMessage('A date has been picked: ', date);
          setDate(date);
          onClose();
          if (data) {
               freezeHolds(data, libraryContext.baseUrl, date, language, libraryContext.reactivateDateNotRequired ?? false).then((result) => {
                    setLoading(false);
                    resetGroup();
                    hideDatePicker();
               });
          } else {
               freezeHold(freezeId, recordId, source, libraryContext.baseUrl, userId, date, language, libraryContext.reactivateDateNotRequired ?? false).then((result) => {
                    setLoading(false);
                    resetGroup();
                    hideDatePicker();
               });
          }
     };

     return (
          <>
               <ActionsheetItem onPress={showDatePicker}>
                    {data ? null : (
                         <MaterialIcons name="pause" size={18} className="mr-1" />
                    )}
                    <ActionsheetItemText>{actionLabel}</ActionsheetItemText>
               </ActionsheetItem>

               {/* Moved avoidKeyboard to ModalContent where v1 tracks layouts */}
               <Modal isOpen={showIndefiniteWarning} onClose={hideDatePicker} size="full">
                    <ModalBackdrop />
                    <ModalContent
                        className="max-w-[95%]"
                        avoidKeyboard
                    >
                         <ModalHeader>
                             <Heading>{actionLabel}</Heading>
                             <ModalCloseButton onPress={hideDatePicker}>
                                  <CloseIcon />
                             </ModalCloseButton>
                         </ModalHeader>

                         <ModalBody>
                              <FormControl>
                                   <FormControlLabel>
                                        <FormControlLabelText>
                                             {getTermFromDictionary("en", "freeze_indefinite_warning")}
                                        </FormControlLabelText>
                                   </FormControlLabel>

                                   <Checkbox
                                        isChecked={freezeIndefinite}
                                        onChange={(value) => setFreezeIndefinite(value)}
                                        aria-label={getTermFromDictionary("en", "freeze_indefinite_checkbox")}
                                        value="freeze-indefinite"
                                   >
                                        <CheckboxIndicator>
                                             <CheckboxIcon />
                                        </CheckboxIndicator>
                                        <CheckboxLabel className="pl-2">
                                             {getTermFromDictionary("en", "freeze_indefinite_checkbox")}
                                        </CheckboxLabel>
                                   </Checkbox>
                              </FormControl>
                         </ModalBody>

                         <ModalFooter>
                              {/* Streamlined ButtonGroup for v1 (Removed the conflicting HStack component wrapper) */}
                              <ButtonGroup space="md" className="flex-row">
                                   <Button
                                       colorScheme="primary"
                                        onPress={hideDatePicker}
                                   >
                                       <ButtonText>
                                             {getTermFromDictionary("en", "cancel")}
                                        </ButtonText>
                                   </Button>

                                   <Button
                                        colorScheme="primary"
                                        onPress={() => {
                                             if (freezeIndefinite) {
                                                  onSelectDate();
                                             } else {
                                                  setDatePickerVisibility(true);
                                             }
                                        }}
                                   >
                                        <ButtonText>
                                             {freezeIndefinite
                                                  ? getTermFromDictionary("en", "freeze_hold_without_reactivation")
                                                  : getTermFromDictionary("en", "freeze_hold_choose_reactivation")}
                                        </ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </ModalFooter>
                    </ModalContent>
               </Modal>

               <DateTimePickerModal
                    isVisible={isDatePickerVisible}
                    date={date}
                    mode="date"
                    onConfirm={onSelectDate}
                    onCancel={hideDatePicker}
                    isDarkModeEnabled={colorMode === "dark"}
                    minimumDate={today}
                    confirmTextIOS={loading ? freezingLabel : actionLabel}
                    {...pickerThemeProps}
               />
          </>
     );
};
