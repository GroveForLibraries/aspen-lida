import React from 'react';
import _ from 'lodash';
import { useRoute, useNavigation } from '@react-navigation/native';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LoadingSpinner } from '../../components/loadingSpinner';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { getSelfRegistrationForm, submitSelfRegistration } from '../../util/api/registration';
import { logDebugMessage, getErrorMessage } from '../../util/logging';
import { useTheme } from '../../themes/theme';
import { Box } from '@/components/ui/box';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { HStack } from '@/components/ui/hstack';
import { ThemedScrollView as ScrollView } from '@/src/components/themed/ThemedScrollView';
import { ThemedSelect as Select, ThemedSelectBackdrop as SelectBackdrop, ThemedSelectContent as SelectContent, ThemedSelectDragIndicator as SelectDragIndicator, ThemedSelectDragIndicatorWrapper as SelectDragIndicatorWrapper, ThemedSelectInput as SelectInput, ThemedSelectItem as SelectItem, ThemedSelectPortal as SelectPortal, ThemedSelectScrollView as SelectScrollView, ThemedSelectTrigger as SelectTrigger } from '../../components/themed/ThemedSelect';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { ThemedFormControl as FormControl, ThemedInput as Input, ThemedInputField as InputField, ThemedFormControlLabelText as FormControlLabelText, ThemedFormControlHelper as FormControlHelper, ThemedFormControlHelperText as FormControlHelperText, ThemedFormControlLabel as FormControlLabel } from '../../components/themed/ThemedFormControls';
/**
 * SelfRegistration component that handles the self-registration process for a library, including form rendering, input handling, and submission.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const SelfRegistration = () => {
	const insets = useSafeAreaInsets();
	const { neutrals } = useTheme();
	const surfaceBg = neutrals.surface;
	const borderColor = neutrals.border;
	const route = useRoute();
	const navigation = useNavigation();
	const libraryUrl = route?.params?.libraryUrl ?? '';
	const [isLoading, setIsLoading] = React.useState(true);
	const [fields, setFields] = React.useState([]);
	const [isSubmitting, setIsSubmitting] = React.useState(false);
	const [valuesToSubmit, setValuesToSubmit] = React.useState([]);
	const [values, setValues] = React.useState([]);
	const [showResults, setShowResults] = React.useState(false);
	const [results, setResults] = React.useState('');
     const [hasError, setHasError] = React.useState(false);

	React.useEffect(() => {
		(async () => {
			await getSelfRegistrationForm(libraryUrl).then((response) => {
				if(response.ok) {
                         const formFields = response.data.result ?? [];
                         setFields(formFields);
                         let object = {};
                         _.map(formFields, function(section) {
                              const properties = section.properties;
                              _.forEach(properties, function (field) {
                                   let prop = field.property;
                                   const property = {
                                        [prop]: '' };
                                   _.merge(object, property);
                              });
                         });
                         setValues(object);
                    } else {
                         logDebugMessage("Error loading fields for self registration");
                         logDebugMessage(response);
                         setIsSubmitting(false);
                         const error = getErrorMessage({ statusCode: response.status, problem: response.problem, sendToSentry: true });
                         setResults(error.message);
                         setHasError(true);
                    }
			});
			setIsLoading(false);
		})();
	}, []);

	const handleInputChange = (index, value) => {
		let tmp = values;
		tmp[index] = value;
		setValuesToSubmit(tmp);
	}

	const getFields = () => {
		if(_.size(fields) > 0) {
			return (
				<>
					{_.map(fields, function(section) {
						const {label, properties} = section;
						return (
							<Box className="mb-5">
							<Text bold size="md">{label}</Text>
							{_.map(properties, function(field, key) {
							const {type, description, maxLength, required, property} = field;
							const fieldLabel = field.label;
							if (type === 'text') {
								return (
									<FormControl className="my-2" isRequired={required}>
										<FormControlLabel><FormControlLabelText>{fieldLabel}</FormControlLabelText></FormControlLabel>
										<Input style={{ borderColor }}><InputField type='text'
										                   key={key}
										                   name={property}
										                   maxLength={maxLength ? parseInt(maxLength) : undefined}
										                   accessibilityLabel={description}
										                   returnKeyType="next"
										                   onChangeText={(value) => {
											                   handleInputChange(property, value);
										                   }}/></Input>
										{!_.isEmpty(description) ? (
											<FormControlHelper>
												<FormControlHelperText>
													{description}
												</FormControlHelperText>
											</FormControlHelper>
										) : null}
									</FormControl>
								)
							} else if (type === 'password') {
								return (
									<FormControl className="my-2" isRequired={required}>
										<FormControlLabel><FormControlLabelText>{fieldLabel}</FormControlLabelText></FormControlLabel>
										<Input style={{ borderColor }}><InputField type='password'
										                   key={property}
										                   name={property}
										                   maxLength={maxLength ? parseInt(maxLength) : undefined}
										                   accessibilityLabel={description}
										                   onChangeText={(value) => {
											                   handleInputChange(property, value);
										                   }}/>
										</Input>
										{!_.isEmpty(description) ? (
											<FormControlHelper>
												<FormControlHelperText>
													{description}
												</FormControlHelperText>
											</FormControlHelper>
										) : null}
									</FormControl>
								)
							}  else if (type === 'email') {
								return (
									<FormControl className="my-2" isRequired={required}>
										<FormControlLabel><FormControlLabelText>{fieldLabel}</FormControlLabelText></FormControlLabel>
										<Input style={{ borderColor }}><InputField type='email'
										                   key={property}
										                   name={property}
										                   maxLength={maxLength ? parseInt(maxLength) : undefined}
										                   accessibilityLabel={description}
										                   onChangeText={(value) => {
											                   handleInputChange(property, value);
										                   }} /></Input>
										{!_.isEmpty(description) ? (
											<FormControlHelper>
												<FormControlHelperText>
													{description}
												</FormControlHelperText>
											</FormControlHelper>
										) : null}
									</FormControl>
								)
							} else if (type === 'enum') {
								const enumOptions = field.values ?? {};
								return (
									<FormControl className="my-2" isRequired={required}>
										<FormControlLabel><FormControlLabelText>{fieldLabel}</FormControlLabelText></FormControlLabel>
										<Select
											name={property}
											selectedValue={values[property]}
											accessibilityLabel={description}
											onValueChange={(value) => {
												handleInputChange(property, value);
											}}
										>
											<SelectTrigger>
															{/* TODO(translation): Replace hardcoded placeholder with TranslationService-backed key. */}
												<SelectInput placeholder="Select option"/>
											</SelectTrigger>
											<SelectPortal>
												<SelectBackdrop />
												<SelectContent>
													<SelectDragIndicatorWrapper>
														<SelectDragIndicator />
													</SelectDragIndicatorWrapper>
													<SelectScrollView>
														{_.map(enumOptions, function (item, index) {
															return <SelectItem key={index} value={index} label={item} selectedValue={values[property]} />;
														})}
													</SelectScrollView>
												</SelectContent>
											</SelectPortal>
										</Select>
										{!_.isEmpty(description) ? (
                                                       <FormControlHelper>
                                                            <FormControlHelperText>
                                                                 {description}
                                                            </FormControlHelperText>
                                                       </FormControlHelper>
										) : null}
									</FormControl>
								)
							}
						})}
							</Box>
						)
					})}
				</>
			)
		}

		return null;
	}

	const handleSubmission = async () => {
		await submitSelfRegistration(libraryUrl, valuesToSubmit).then((response) => {
			if(response.ok) {
                    setResults(response.data.result);
                    if(response.data.result) {
                         setShowResults(true);
                    }
                    setIsSubmitting(false);
                    setHasError(false)
               } else {
                    logDebugMessage("Error submitting self registration");
                    logDebugMessage(response);
                    setIsSubmitting(false);
                    const error = getErrorMessage({ statusCode: response.status, problem: response.problem, sendToSentry: true });
                    setResults(error.message);
                    setHasError(true);
               }
		});
	};

	return (
		<Box style={{ flex: 1, paddingBottom: insets.bottom }}>
			{isLoading ? (
				<LoadingSpinner />
			) : (
				<KeyboardAvoidingView
					behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
					className="flex-1"
				>
					<ScrollView contentContainerStyle={{ flexGrow: 1 }}>
						<Box className="p-3">
						{!showResults ? (
							<Text className="mb-3">{getTermFromDictionary('en', 'self_registration_message')}</Text>
						) : null}
						{showResults && !hasError ? (
							<>
								{results.success === true ? (
									<Text className="mb-3">{getTermFromDictionary('en', 'self_registration_success')}</Text>
								) : (
									<Text className="mb-3">{getTermFromDictionary('en', 'self_registration_error')}</Text>
								)}

								{results.message ? (
									<Text className="mb-3">{results.message}</Text>
								) : null}

								{results.barcode ? (
									<HStack space="xs" className="mb-3">
										<Text>Your library card is</Text>
										<Text bold>{results.barcode}</Text>
									</HStack>
								) : null}

								{results.username ? (
									<HStack space="xs" className="mb-3">
										<Text>Your username is</Text>
										<Text bold>{results.username}</Text>
									</HStack>
								) : null}

								{results.password ? (
									<HStack space="xs" className="mb-3">
										<Text>Your initial password is</Text>
										<Text bold>{results.password}</Text>
									</HStack>
								) : null}

								{results.requirePinReset ? (
									<Text className="mb-3">To login to the catalog, you must reset your PIN.</Text>
								) : null}

								<Button colorScheme="secondary" variant="outline" onPress={() => {
									navigation.goBack();
									setShowResults(false);
									setResults('');
								}}>
									<ButtonText>{getTermFromDictionary('en', 'close_window')}</ButtonText>
								</Button>
							</>
						) : showResults && hasError ? (
                                   <>
                                        <Text className="mb-3">{results}</Text>
                                        <Button colorScheme="secondary" variant="outline" onPress={() => {
                                             navigation.goBack();
                                             setShowResults(false);
                                             setResults('');
                                             setHasError(false);
                                        }}>
                                             <ButtonText>{getTermFromDictionary('en', 'close_window')}</ButtonText>
                                        </Button>
                                   </>
                              ) :  (
							<>
								{getFields()}
								<ButtonGroup className="pt-3 pb-5">
									<Button
										colorScheme="secondary"
										isLoading={isSubmitting}
										isLoadingText="Registering..."
										onPress={() => {
											setIsSubmitting(true);
											handleSubmission();
										}}>
										<ButtonText>{getTermFromDictionary('en', 'register')}</ButtonText>
									</Button>
									<Button colorScheme="secondary" variant="outline" onPress={() => navigation.goBack()}>
										<ButtonText>{getTermFromDictionary('en', 'cancel')}</ButtonText>
									</Button>
								</ButtonGroup>
							</>
						)}
						</Box>
					</ScrollView>
				</KeyboardAvoidingView>
			)}
		</Box>
	);
};
