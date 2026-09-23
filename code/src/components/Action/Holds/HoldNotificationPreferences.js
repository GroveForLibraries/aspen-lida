import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTermFromDictionary } from '../../../translations/TranslationService';
import { useTranslationWithValues } from '../../../hooks/useTranslationWithValues';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { ThemedSelect as Select, ThemedSelectBackdrop as SelectBackdrop, ThemedSelectContent as SelectContent, ThemedSelectDragIndicator as SelectDragIndicator, ThemedSelectDragIndicatorWrapper as SelectDragIndicatorWrapper, ThemedSelectInput as SelectInput, ThemedSelectItem as SelectItem, ThemedSelectPortal as SelectPortal, ThemedSelectScrollView as SelectScrollView, ThemedSelectTrigger as SelectTrigger } from '../../themed/ThemedSelect';
import { ThemedCheckbox as Checkbox, ThemedCheckboxIcon as CheckboxIcon, ThemedCheckboxIndicator as CheckboxIndicator, ThemedCheckboxLabel as CheckboxLabel } from '../../themed/ThemedCheckbox';
import { ThemedFormControl as FormControl, ThemedInput as Input, ThemedInputField as InputField, ThemedFormControlLabelText as FormControlLabelText, ThemedFormControlHelper as FormControlHelper, ThemedFormControlHelperText as FormControlHelperText, ThemedFormControlLabel as FormControlLabel } from '../../themed/ThemedFormControls';

/**
 * HoldNotificationPreferences component for displaying notification preferences for holds.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
export const HoldNotificationPreferences = (props) => {
     const { textColor, brand, user, language, emailNotification, setEmailNotification, phoneNotification, setPhoneNotification, smsNotification, setSMSNotification, smsCarrier, setSMSCarrier, smsNumber, setSMSNumber, phoneNumber, setPhoneNumber } = props;

     const holdNotificationInfo = user.holdNotificationInfo;
     const smsCarriers = Object.values(holdNotificationInfo.smsCarriers ?? {});

     const { text: emailNotificationLabel } = useTranslationWithValues(
          'hold_email_notification',
          user.email ?? null,
          { enabled: !!user.email, addToDictionary: true, initialValue: 'Yes, by email' }
     );

     return (
          <>
               <Text size="sm" className="mb-2">
                    {getTermFromDictionary(language, 'hold_notify_for_pickup')}
               </Text>
               {user.email ? (
                    <FormControl className="mb-2">
                         <Checkbox
                              name="emailNotification"
                              defaultIsChecked={emailNotification}
                              onChange={(value) => {
                                   setEmailNotification(value);
                              }}>
                              <CheckboxIndicator className="mr-2">
                                   <CheckboxIcon />
                              </CheckboxIndicator>
                              <CheckboxLabel>{emailNotificationLabel}</CheckboxLabel>
                         </Checkbox>
                    </FormControl>
               ) : null}
               <FormControl className="mb-2">
                    <Checkbox
                         name="phoneNotification"
                         defaultIsChecked={phoneNotification}
                         onChange={(value) => {
                              setPhoneNotification(value);
                         }}>
                         <CheckboxIndicator className="mr-2">
                              <CheckboxIcon />
                         </CheckboxIndicator>
                         <CheckboxLabel>{getTermFromDictionary(language, 'hold_phone_notification')}</CheckboxLabel>
                    </Checkbox>
               </FormControl>
               {phoneNotification ? (
                    <>
                         <FormControl className="mb-2">
                              <FormControlLabel>
                                   <FormControlLabelText size="sm">
                                        {getTermFromDictionary(language, 'hold_phone_number')}
                                   </FormControlLabelText>
                              </FormControlLabel>
                              <Input>
                                   <InputField name="phoneNumber" defaultValue={phoneNumber} accessibilityLabel={getTermFromDictionary(language, 'hold_phone_number')} onChangeText={(value) => setPhoneNumber(value)} />
                              </Input>
                         </FormControl>
                    </>
               ) : null}
                {smsCarriers.length > 0 ? (
                    <>
                         <FormControl className="mb-1">
                              <Checkbox
                                   name="smsNotification"
                                   defaultIsChecked={smsNotification}
                                   onChange={(value) => {
                                        setSMSNotification(value);
                                   }}>
                                   <CheckboxIndicator className="mr-2">
                                        <CheckboxIcon />
                                   </CheckboxIndicator>
                                   <CheckboxLabel>{getTermFromDictionary(language, 'hold_sms_notification')}</CheckboxLabel>
                              </Checkbox>
                         </FormControl>
                         {smsNotification ? (
                              <>
                                   <FormControl className="mb-1">
                                        <FormControlLabel>
                                             <FormControlLabelText size="sm">
                                                  {getTermFromDictionary(language, 'hold_sms_carrier')}
                                             </FormControlLabelText>
                                        </FormControlLabel>

                                        <Select name="smsCarrier" selectedValue={smsCarrier} accessibilityLabel={getTermFromDictionary(language, 'hold_sms_select_carrier')} onValueChange={(itemValue) => setSMSCarrier(itemValue)}>
                                             <SelectTrigger>
                                                  {smsCarrier && smsCarrier !== -1 ? (
                                                       smsCarriers.map((carrier, selectedIndex) => {
                                                            if (selectedIndex === smsCarrier) {
                                                                 // TODO(translation): Replace hardcoded placeholder with TranslationService-backed key.
                                                                 return <SelectInput placeholder="Select a Carrier" value={carrier} />;
                                                            }
                                                       })
                                                  ) : (
                                                       // TODO(translation): Replace hardcoded placeholder with TranslationService-backed key.
                                                       <SelectInput placeholder="Select a Carrier" />
                                                  )}
                                             </SelectTrigger>
                                             <SelectPortal useRNModal={true}>
                                                  <SelectBackdrop />
                                                  <SelectContent>
                                                       <SelectDragIndicatorWrapper>
                                                            <SelectDragIndicator />
                                                       </SelectDragIndicatorWrapper>
                                                       <SelectScrollView>
                                                            {smsCarriers.map((carrier, index) => {
                                                                 if (index === smsCarrier) {
                                                                      return <SelectItem key={index} label={carrier} value={index} style={{ backgroundColor: brand.tertiary[300] }} textStyle={{ color: brand.tertiary['500-text'] }} />;
                                                                 }
                                                                 return <SelectItem key={index} label={carrier} value={index} style={{ backgroundColor: smsCarrier === index ? brand.tertiary[300] : 'transparent' }} textStyle={{ color: smsCarrier === index ? brand.tertiary['500-text'] : textColor }} />;
                                                            })}
                                                       </SelectScrollView>
                                                  </SelectContent>
                                             </SelectPortal>
                                        </Select>
                                        <FormControlHelper className="mb-2">
                                             <FormControlHelperText size="xs" style={{ color: textColor }}>
                                                  {getTermFromDictionary(language, 'hold_sms_charges')}
                                             </FormControlHelperText>
                                        </FormControlHelper>
                                   </FormControl>
                                   <FormControl>
                                        <FormControlLabel>
                                             <FormControlLabelText size="sm">
                                                  {getTermFromDictionary(language, 'hold_sms_number')}
                                             </FormControlLabelText>
                                        </FormControlLabel>
                                        <Input>
                                             <InputField name="smsNumber" defaultValue={smsNumber} accessibilityLabel={getTermFromDictionary(language, 'hold_sms_number')} onChangeText={(value) => setSMSNumber(value)} />
                                        </Input>
                                        <FormControlHelper className="mb-2">
                                             <FormControlHelperText size="xs" style={{ color: textColor }}>
                                                  {getTermFromDictionary(language, 'hold_sms_format')}
                                             </FormControlHelperText>
                                        </FormControlHelper>
                                   </FormControl>
                              </>
                         ) : null}
                    </>
               ) : null}
          </>
     );
};
