import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { loadingSpinner } from '../../components/loadingSpinner';
import { refreshProfile, submitLocalIllRequest } from '../../util/api/user';
import { useLibraryLocation } from '../../hooks/useLibraryBranchData';
import { useLibrary } from '../../hooks/useLibrarySystemData';
import { useUserState, useUpdateUserProfile } from '../../hooks/useUserData';
import { loadError } from '../../components/loadError';
import { getLocalIllForm } from '../../util/api/system';
import { logDebugMessage, logErrorMessage, logInfoMessage, getErrorMessage } from '../../util/logging';
import { stripHTML } from '../../helpers/helpers';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { useTheme } from '../../themes/theme';
import { ThemedAlert as Alert, ThemedAlertText as AlertText } from '../../components/themed/ThemedAlert';
import { Box } from '@/components/ui/box';
import { ThemedButton as Button, ThemedButtonSpinner as ButtonSpinner, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { ThemedCheckbox as Checkbox, ThemedCheckboxIcon as CheckboxIcon, ThemedCheckboxIndicator as CheckboxIndicator, ThemedCheckboxLabel as CheckboxLabel } from '../../components/themed/ThemedCheckbox';
import { HStack } from '@/components/ui/hstack';
import { ThemedFormControl as FormControl, ThemedInput as Input, ThemedInputField as InputField, ThemedFormControlLabelText as FormControlLabelText, ThemedFormControlLabel as FormControlLabel } from '../../components/themed/ThemedFormControls';
import { ThemedScrollView as ScrollView } from '@/src/components/themed/ThemedScrollView';
import { ThemedSelect as Select, ThemedSelectBackdrop as SelectBackdrop, ThemedSelectContent as SelectContent, ThemedSelectDragIndicator as SelectDragIndicator, ThemedSelectDragIndicatorWrapper as SelectDragIndicatorWrapper, ThemedSelectInput as SelectInput, ThemedSelectItem as SelectItem, ThemedSelectPortal as SelectPortal, ThemedSelectScrollView as SelectScrollView, ThemedSelectTrigger as SelectTrigger } from '../../components/themed/ThemedSelect';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { ThemedTextarea as Textarea, ThemedTextareaInput as TextareaInput } from '../../components/themed/ThemedTextarea';
import { screenContentContainerStyle } from '@/src/components/ScreenContainer';

/**
 * CreateLocalIllRequest component that fetches the local ILL form configuration and renders a request form for users to submit local ILL requests. It handles form submission, error handling, and user profile updates.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const CreateLocalIllRequest = () => {
     const [formConfig, setFormConfig] = React.useState([]);
      const [hasError, setHasError] = React.useState(false);
     const library = useLibrary();
     const location = useLibraryLocation();
     const route = useRoute();

     const id = route.params.id;
     const title = route.params.workTitle ?? null;
     const volumeId = route.params.volumeId ?? null;
     const volumeName = route.params.volumeName ?? null;

     if (String(location.localIllFormId) === '-1' || location.localIllFormId === null) {
          return loadError('The ILL System is not setup properly, please contact your library to place a request', '');
     }

     logInfoMessage("Local ILL Form Id " + location.localIllFormId);
     logInfoMessage("ID " + route.params.id);
     logInfoMessage("Volume ID " + volumeId);
     logInfoMessage("Volume Name " + volumeName);

     const { status, data, error, isFetching, refetch } = useQuery({
          queryKey: ['localIllForm', location.localIllFormId, library.baseUrl],
          queryFn: () => getLocalIllForm(library.baseUrl, location.localIllFormId),
          onSuccess: (data) => {
               try {
                    if (data.ok) {
                         setFormConfig(data.data.result);
                    }
               } catch (e) {
                    setHasError(true);
                    logDebugMessage('Error fetching local ILL form configuration');
                    logDebugMessage(data);
                    getErrorMessage(data.code, data.data.result);
               }
          },
          onError: (error) => {
               logDebugMessage('Error fetching local ILL form configuration');
               logErrorMessage(error);
          } });

     useFocusEffect(
          React.useCallback(() => {
               try {
                    if (data.ok) {
                         setFormConfig(data.data.result);
                    }
               } catch (e) {
                    refetch();
               }
          }, [])
     );

     return <>{status === 'loading' || isFetching ? loadingSpinner() : (hasError || status === 'error') ? loadError('The ILL System is not setup properly, please contact your library to place a request', '') : <Request config={formConfig} workId={id} workTitle={title} volumeId={volumeId} volumeName={volumeName} />}</>;
};

/**
 * Request component that renders the form for creating a local interlibrary loan (ILL) request. It manages the state of the form fields and handles the submission of the request.
 * @param payload
 * @returns {React.JSX.Element}
 * @constructor
 */
const Request = (payload) => {
     const [title, setTitle] = React.useState('');
     const [note, setNote] = React.useState('');
     const [acceptFee, setAcceptFee] = React.useState(false);
     const [pickupLocation, setPickupLocation] = React.useState();
      const [isSubmitting, setIsSubmitting] = React.useState(false);
     const [errorMessage, setErrorMessage] = React.useState('');
     const library = useLibrary();
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const updateUserProfile = useUpdateUserProfile();
     const language = useActiveLanguage();
     const { textColor, brand, neutrals } = useTheme();
     const navigation = useNavigation();
     const queryClient = useQueryClient();

     const { config, workId, workTitle, volumeId, volumeName } = payload;

     const refreshAndSaveUserProfile = React.useCallback(async () => {
          const profileResponse = await refreshProfile(library.baseUrl);
          if (profileResponse?.ok && profileResponse?.data?.result?.profile) {
               await updateUserProfile(profileResponse.data.result.profile);
          }
     }, [library.baseUrl, updateUserProfile]);

     // Make sure we have a valid config object before trying to render the form
     if (!config || !config.fields || typeof config.fields !== 'object') {
          logDebugMessage('Local ILL Form configuration is invalid');
          logDebugMessage(config);
          return loadError('The ILL System is not setup properly, please contact your library to place a request', '');
     }

     const handleSubmission = async () => {
          const request = {
               title: title ?? workTitle,
               acceptFee: acceptFee,
               note: note ?? null,
               catalogKey: workId ?? null,
               pickupLocation: pickupLocation ?? null,
               volumeId: volumeId };
          await submitLocalIllRequest(library.baseUrl, request).then(async (result) => {
               setIsSubmitting(false);
               if (result.success) {
                    setErrorMessage('');
                    navigation.goBack();
                    queryClient.invalidateQueries({ queryKey: ['holds', user.id, library.baseUrl, language] });
                    await refreshAndSaveUserProfile();
               } else {
                    setErrorMessage(result.message);
               }
          });
     };

     const getIntroText = () => {
          const field = config.fields.introText;
          if (field.display === 'show') {
               return (
                    <Text size="sm" className="pb-3">
                         {stripHTML(field.label)}
                    </Text>
               );
          }
          return null;
     };

     const getTitleField = () => {
          const field = config.fields.title;
          if (field.display === 'show') {
               let fullTitle = workTitle;
               if (volumeName !== undefined) {
                    fullTitle += " " + volumeName;
               }
               return (
                    <FormControl className="my-2" isRequired={field.required}>
                         <FormControlLabel>
                              <FormControlLabelText>{field.label}</FormControlLabelText>
                         </FormControlLabel>
                         <Input>
                              <InputField
                                   name={field.property}
                                   defaultValue={fullTitle}
                                   accessibilityLabel={field.description ?? field.label}
                                   onChangeText={(value) => {
                                        setTitle(value);
                                   }}
                              />
                         </Input>
                    </FormControl>
               );
          }
          return null;
     };

     const getFeeInformation = () => {
          const field = config.fields.feeInformationText;
          if (field.display === 'show' && field.label && field.label.trim() !== '') {
               return (
                    <Text bold>
                         {stripHTML(field.label)}
                    </Text>
               );
          }
          return null;
     };

     const getAcceptFeeCheckbox = () => {
          const field = config.fields.acceptFee;
          if (field.display === 'show') {
               return (
                    <FormControl className="my-2 max-w-[90%]" isRequired={field.required}>
                         <Checkbox
                              value="accept"
                              accessibilityLabel={field.description ?? field.label}
                              onChange={(value) => {
                                   setAcceptFee(value);
                              }}>
                              <CheckboxIndicator className="mr-2">
                                   <CheckboxIcon />
                              </CheckboxIndicator>
                              <CheckboxLabel>
                                   <Text>{field.label}</Text>
                              </CheckboxLabel>
                         </Checkbox>
                    </FormControl>
               );
          }
          return null;
     };

     const getNoteField = () => {
          const field = config.fields.note;
          if (field.display === 'show') {
               return (
                    <FormControl className="my-2" isRequired={field.required}>
                         <FormControlLabel>
                              <FormControlLabelText>{field.label}</FormControlLabelText>
                         </FormControlLabel>
                         <Textarea>
                              <TextareaInput
                                   name={field.property}
                                   value={note}
                                   accessibilityLabel={field.description ?? field.label}
                                   onChangeText={(text) => {
                                        setNote(text);
                                   }}
                              />
                         </Textarea>
                    </FormControl>
               );
          }
          return null;
     };

     const getPickupLocations = () => {
          const field = config.fields.pickupLocation;
          if (field.display === 'show' && Array.isArray(field.options)) {
               const locations = field.options;
               return (
                    <FormControl className="my-2" isRequired={field.required}>
                         <FormControlLabel>
                              <FormControlLabelText>{field.label}</FormControlLabelText>
                         </FormControlLabel>
                         <Select
                              selectedValue={pickupLocation}
                              onValueChange={(itemValue) => {
                                   setPickupLocation(itemValue);
                              }}>
                              <SelectTrigger>
                                   {pickupLocation ? (
                                        locations.map((location, index) => {
                                             if (location.code === pickupLocation) {
                                                  return <SelectInput key={index} value={location.displayName} />;
                                             }
                                        })
                                   ) : (
                                        // TODO(translation): Replace hardcoded placeholder with TranslationService-backed key.
                                        <SelectInput placeholder="Select a pickup location" />
                                   )}
                              </SelectTrigger>
                              <SelectPortal>
                                   <SelectBackdrop />
                                   <SelectContent>
                                        <SelectDragIndicatorWrapper>
                                             <SelectDragIndicator />
                                        </SelectDragIndicatorWrapper>
                                        <SelectScrollView>
                                             {locations.map((location, index) => {
                                                  return <SelectItem key={index} label={location.displayName} value={location.code} style={{ backgroundColor: pickupLocation === location.code ? brand.tertiary[300] : 'transparent' }} textStyle={{ color: pickupLocation === location.code ? brand.tertiary['500-text'] : textColor }} />;
                                             })}
                                        </SelectScrollView>
                                   </SelectContent>
                              </SelectPortal>
                         </Select>
                    </FormControl>
               );
          }
          return null;
     };

     const getCatalogKeyField = () => {
          const field = config.fields.catalogKey;
          if (field.display === 'show') {
               return (
                    <FormControl className="my-2" isDisabled isRequired={field.required}>
                         <FormControlLabel>
                              <FormControlLabelText>{field.label}</FormControlLabelText>
                         </FormControlLabel>
                         <Input>
                              <InputField name={field.property} defaultValue={catalogKey} accessibilityLabel={field.description ?? field.label} />
                         </Input>
                    </FormControl>
               );
          }
          return null;
     };

     const getVolumeIdField = () => {
          const field = config.fields.volumeId;
          if (field.display === 'show') {
               return (
                    <FormControl className="my-2" isDisabled isRequired={field.required}>
                         <FormControlLabel>
                              <FormControlLabelText>{field.label}</FormControlLabelText>
                         </FormControlLabel>
                         <Input>
                              <InputField name={field.property} defaultValue={volumeId} accessibilityLabel={field.description ?? field.label} />
                         </Input>
                    </FormControl>
               );
          }
          return null;
     };

     const getActions = () => {
          return (
               <HStack space="md" className="pt-3">
                    <Button
                         colorScheme="secondary"
                         isDisabled={isSubmitting}
                         onPress={() => {
                              setIsSubmitting(true);
                              handleSubmission();
                         }}>
                        <ButtonText>
                              {isSubmitting ? (
                                   <>
                                        <ButtonSpinner className="mr-2" />
                                        {config.buttonLabelProcessing}
                                   </>
                              ) : (
                                   config.buttonLabel
                              )}
                         </ButtonText>
                    </Button>
                    <Button variant="outline" onPress={() => navigation.goBack()} style={{ borderColor: neutrals.border }}>
                         <ButtonText style={{ color: neutrals.textMain }}>Cancel</ButtonText>
                    </Button>
               </HStack>
          );
     };

     const getErrorMessage = () => {
          if (errorMessage) {
               return (
                    <Alert className="w-full" action="warning" variant="solid">
                         <AlertText action="warning" variant="solid" size="xs" bold>
                              {errorMessage}
                         </AlertText>
                    </Alert>
               );
          }
          return null;
     };

     return (
          <ScrollView contentContainerStyle={screenContentContainerStyle}>
               <Box className="py-5">
                    {errorMessage ? getErrorMessage() : null}
                    {getIntroText()}
                    {getTitleField()}
                    {getNoteField()}
                    {getFeeInformation()}
                    {getAcceptFeeCheckbox()}
                    {getPickupLocations()}
                    {getCatalogKeyField()}
                    {getVolumeIdField()}
                    {getActions()}
               </Box>
          </ScrollView>
     );
};
