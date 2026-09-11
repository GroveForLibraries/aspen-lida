import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormControl, FormControlLabel, FormControlLabelText, FormControlHelper, Select, SelectTrigger, SelectInput, SelectIcon, SelectPortal, SelectBackdrop, SelectContent, SelectDragIndicatorWrapper, SelectDragIndicator, SelectItem, Icon, ChevronDownIcon, Input, InputField, Checkbox, CheckboxLabel, Text, CheckIcon, CheckboxIndicator, CheckboxIcon, FormControlHelperText, SelectScrollView } from '@gluestack-ui/themed';
import { getTermFromDictionary } from '../../../translations/TranslationService';
import { useTranslationWithValues } from '../../../hooks/useTranslationWithValues';

export const HoldNotificationPreferences = (props) => {
     const { textColor, theme, user, language, emailNotification, setEmailNotification, phoneNotification, setPhoneNotification, smsNotification, setSMSNotification, smsCarrier, setSMSCarrier, smsNumber, setSMSNumber, phoneNumber, setPhoneNumber, colorMode } = props;
     const insets = useSafeAreaInsets();

     const holdNotificationInfo = user.holdNotificationInfo;
     const smsCarriers = Object.values(holdNotificationInfo.smsCarriers ?? {});

     const { text: emailNotificationLabel } = useTranslationWithValues(
          'hold_email_notification',
          user.email ?? null,
          { enabled: !!user.email, addToDictionary: true, initialValue: 'Yes, by email' }
     );

     return (
          <>
               <Text color={textColor} mb="$2" size="sm">
                    {getTermFromDictionary(language, 'hold_notify_for_pickup')}
               </Text>
               {user.email ? (
                    <FormControl mb="$2">
                         <Checkbox
                              size="sm"
                              name="emailNotification"
                              defaultIsChecked={emailNotification}
                              onChange={(value) => {
                                   setEmailNotification(value);
                              }}>
                              <CheckboxIndicator mr="$2">
                                   <CheckboxIcon as={CheckIcon} />
                              </CheckboxIndicator>
                              <CheckboxLabel color={textColor}>{emailNotificationLabel}</CheckboxLabel>
                         </Checkbox>
                    </FormControl>
               ) : null}
               <FormControl mb="$2">
                    <Checkbox
                         size="sm"
                         name="phoneNotification"
                         defaultIsChecked={phoneNotification}
                         onChange={(value) => {
                              setPhoneNotification(value);
                         }}>
                         <CheckboxIndicator mr="$2">
                              <CheckboxIcon as={CheckIcon} />
                         </CheckboxIndicator>
                         <CheckboxLabel color={textColor}>{getTermFromDictionary(language, 'hold_phone_notification')}</CheckboxLabel>
                    </Checkbox>
               </FormControl>
               {phoneNotification ? (
                    <>
                         <FormControl mb="$2">
                              <FormControlLabel>
                                   <FormControlLabelText color={textColor} size="sm">
                                        {getTermFromDictionary(language, 'hold_phone_number')}
                                   </FormControlLabelText>
                              </FormControlLabel>
                              <Input borderColor={colorMode === 'light' ? '$coolGray500' : '$warmGray300'}>
                                   <InputField color={textColor} name="phoneNumber" defaultValue={phoneNumber} accessibilityLabel={getTermFromDictionary(language, 'hold_phone_number')} onChangeText={(value) => setPhoneNumber(value)} />
                              </Input>
                         </FormControl>
                    </>
               ) : null}
                {smsCarriers.length > 0 ? (
                    <>
                         <FormControl mb="$1">
                              <Checkbox
                                   size="sm"
                                   name="smsNotification"
                                   defaultIsChecked={smsNotification}
                                   onChange={(value) => {
                                        setSMSNotification(value);
                                   }}>
                                   <CheckboxIndicator mr="$2">
                                        <CheckboxIcon as={CheckIcon} />
                                   </CheckboxIndicator>
                                   <CheckboxLabel color={textColor}>{getTermFromDictionary(language, 'hold_sms_notification')}</CheckboxLabel>
                              </Checkbox>
                         </FormControl>
                         {smsNotification ? (
                              <>
                                   <FormControl mb="$1">
                                        <FormControlLabel>
                                             <FormControlLabelText size="sm" color={textColor}>
                                                  {getTermFromDictionary(language, 'hold_sms_carrier')}
                                             </FormControlLabelText>
                                        </FormControlLabel>

                                        <Select name="smsCarrier" selectedValue={smsCarrier} accessibilityLabel={getTermFromDictionary(language, 'hold_sms_select_carrier')} onValueChange={(itemValue) => setSMSCarrier(itemValue)}>
                                             <SelectTrigger variant="outline" size="md">
                                                  {smsCarrier && smsCarrier !== -1 ? (
                                                       smsCarriers.map((carrier, selectedIndex) => {
                                                            if (selectedIndex === smsCarrier) {
                                                                 return <SelectInput py={0} placeholder="Select a Carrier" value={carrier} color={textColor} />;
                                                            }
                                                       })
                                                  ) : (
                                                       <SelectInput py={0} placeholder="Select a Carrier" color={textColor} />
                                                  )}
                                                  <SelectIcon mr="$3" as={ChevronDownIcon} color={textColor} />
                                             </SelectTrigger>
                                             <SelectPortal useRNModal={true}>
                                                  <SelectBackdrop />
                                                  <SelectContent bgColor={colorMode === 'light' ? '$warmGray50' : '$coolGray700'} pb={Platform.OS === 'android' ? insets.bottom + 16 : '$4'}>
                                                       <SelectDragIndicatorWrapper>
                                                            <SelectDragIndicator />
                                                       </SelectDragIndicatorWrapper>
                                                       <SelectScrollView>
                                                            {smsCarriers.map((carrier, index) => {
                                                                 if (index === smsCarrier) {
                                                                      return <SelectItem key={index} label={carrier} value={index} bgColor={theme.tokens.colors.tertiary['300']} sx={{ _text: { color: theme.tokens.colors.tertiary['500-text'] } }} />;
                                                                 }
                                                                 return <SelectItem key={index} label={carrier} value={index} bgColor={smsCarrier === index ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: smsCarrier === index ? theme.tokens.colors.tertiary['500-text'] : textColor } }} />;
                                                            })}
                                                       </SelectScrollView>
                                                  </SelectContent>
                                             </SelectPortal>
                                        </Select>
                                        <FormControlHelper mb="$2">
                                             <FormControlHelperText size="xs" color={textColor}>
                                                  {getTermFromDictionary(language, 'hold_sms_charges')}
                                             </FormControlHelperText>
                                        </FormControlHelper>
                                   </FormControl>
                                   <FormControl>
                                        <FormControlLabel>
                                             <FormControlLabelText size="sm" color={textColor}>
                                                  {getTermFromDictionary(language, 'hold_sms_number')}
                                             </FormControlLabelText>
                                        </FormControlLabel>
                                        <Input borderColor={colorMode === 'light' ? '$coolGray500' : '$warmGray300'}>
                                             <InputField color={textColor} name="smsNumber" defaultValue={smsNumber} accessibilityLabel={getTermFromDictionary(language, 'hold_sms_number')} onChangeText={(value) => setSMSNumber(value)} />
                                        </Input>
                                        <FormControlHelper mb="$2">
                                             <FormControlHelperText size="xs" color={textColor}>
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
