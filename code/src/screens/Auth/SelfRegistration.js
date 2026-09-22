import React from 'react';
import { forEach, isEmpty, map, merge } from '../../helpers/helpers';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoadingSpinner } from '../../components/loadingSpinner';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { getSelfRegistrationForm, submitSelfRegistration } from '../../util/api/registration';


import { ScrollView, Box, Button, ButtonGroup, ButtonText, FormControl, FormControlHelper, FormControlHelperText, Icon, Input, Text, Select, SelectTrigger, SelectInput, SelectIcon, ChevronDownIcon, SelectPortal, SelectBackdrop, SelectContent, SelectDragIndicatorWrapper, SelectDragIndicator, SelectItem, SelectScrollView, CheckIcon, FormControlLabel, FormControlLabelText, InputField, HStack, KeyboardAvoidingView } from '@gluestack-ui/themed';
import { logDebugMessage, getErrorMessage } from '../../util/logging';
import { useTheme } from '../../themes/theme';

export const SelfRegistration = () => {
	const insets = useSafeAreaInsets();
	const {theme, textColor, colorMode} = useTheme();
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
												 formFields.forEach((section) => {
                              const properties = section.properties;
                              forEach(properties, function (field, key) {
                                   let prop = field.property;
                                   const property = {
                                        [prop]: '' };
                                   merge(object, property);
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
		if(fields.length > 0) {
			return (
				<>
					{map(fields, function(section, index, collection) {
						const {label, properties} = section;
						return (
							<Box mb="$5">
							<Text bold fontSize="$md" color={textColor}>{label}</Text>
							{map(properties, function(field, key) {
							const {type, description, maxLength, required, property} = field;
							const fieldLabel = field.label;
							if (type === 'text') {
								return (
									<FormControl my="$2" isRequired={required}>
										<FormControlLabel><FormControlLabelText color={textColor}>{fieldLabel}</FormControlLabelText></FormControlLabel>
										<Input borderColor={colorMode === 'light' ? "$coolGray500" : "$warmGray300"}><InputField type='text'
										                   key={key}
										                   name={property}
										                   maxLength={maxLength ? parseInt(maxLength) : undefined}
										                   accessibilityLabel={description}
										                   returnKeyType="next"
										                   color={textColor}
										                   onChangeText={(value) => {
											                   handleInputChange(property, value);
										                   }}/></Input>
										{!isEmpty(description) ? (
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
									<FormControl my="$2" isRequired={required}>
										<FormControlLabel><FormControlLabelText color={textColor}>{fieldLabel}</FormControlLabelText></FormControlLabel>
										<Input borderColor={colorMode === 'light' ? "$coolGray500" : "$warmGray300"}><InputField type='password'
										                   key={property}
										                   name={property}
										                   maxLength={maxLength ? parseInt(maxLength) : undefined}
										                   accessibilityLabel={description}
										                   color={textColor}
										                   onChangeText={(value) => {
											                   handleInputChange(property, value);
										                   }}/>
										</Input>
										{!isEmpty(description) ? (
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
									<FormControl my="$2" isRequired={required}>
										<FormControlLabel><FormControlLabelText color={textColor}>{fieldLabel}</FormControlLabelText></FormControlLabel>
										<Input borderColor={colorMode === 'light' ? "$coolGray500" : "$warmGray300"}><InputField type='email'
										                   key={property}
										                   name={property}
										                   maxLength={maxLength ? parseInt(maxLength) : undefined}
										                   accessibilityLabel={description}
										                   color={textColor}
										                   onChangeText={(value) => {
											                   handleInputChange(property, value);
										                   }} /></Input>
										{!isEmpty(description) ? (
											<FormControlHelper>
												<FormControlHelperText>
													{description}
												</FormControlHelperText>
											</FormControlHelper>
										) : null}
									</FormControl>
								)
							} else if (type === 'enum') {
								const values = field.values ?? {};
								return (
									<FormControl my="$2" isRequired={required}>
										<FormControlLabel><FormControlLabelText color={textColor}>{fieldLabel}</FormControlLabelText></FormControlLabel>
										<Select
											name={property}
											accessibilityLabel={description}
											onValueChange={(value) => {
												handleInputChange(property, value);
											}}
										>
											<SelectTrigger variant="outline" size="md">
												<SelectInput py={0} placeholder="Select option" color={textColor}/>
												<SelectIcon mr="$3">
													<Icon as={ChevronDownIcon} color={textColor}/>
												</SelectIcon>
											</SelectTrigger>
											<SelectPortal>
												<SelectBackdrop />
												<SelectContent
													bgColor={colorMode === 'light' ? "$warmGray50" : "$coolGray700"}
													pb={Platform.OS === 'android' ? insets.bottom + 16 : '$4'}
												>
													<SelectDragIndicatorWrapper>
														<SelectDragIndicator />
													</SelectDragIndicatorWrapper>
													<SelectScrollView>
														{map(values, function (item, index, array) {
															return <SelectItem key={index} value={index} label={item} bgColor={property === index ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: property === index ? theme.tokens.colors.tertiary['500-text'] : textColor } }} />;
														})}
													</SelectScrollView>
												</SelectContent>
											</SelectPortal>
										</Select>
										{!isEmpty(description) ? (
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
		<Box flex={1} pb={insets.bottom}>
			{isLoading ? (
				<LoadingSpinner />
			) : (
				<KeyboardAvoidingView
					behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
					style={{ flex: 1 }}
				>
					<ScrollView contentContainerStyle={{ flexGrow: 1 }}>
						<Box p="$3">
						{!showResults ? (
							<Text mb="$3" color={textColor}>{getTermFromDictionary('en', 'self_registration_message')}</Text>
						) : null}
						{showResults && !hasError ? (
							<>
								{results.success === true ? (
									<Text mb="$3" color={textColor}>{getTermFromDictionary('en', 'self_registration_success')}</Text>
								) : (
									<Text mb="$3" color={textColor}>{getTermFromDictionary('en', 'self_registration_error')}</Text>
								)}

								{results.message ? (
									<Text mb="$3" color={textColor}>{results.message}</Text>
								) : null}

								{results.barcode ? (
									<HStack space="xs" mb="$3">
										<Text color={textColor}>Your library card is</Text>
										<Text bold color={textColor}>{results.barcode}</Text>
									</HStack>
								) : null}

								{results.username ? (
									<HStack space="xs" mb="$3">
										<Text color={textColor}>Your username is</Text>
										<Text bold color={textColor}>{results.username}</Text>
									</HStack>
								) : null}

								{results.password ? (
									<HStack space="xs" mb="$3">
										<Text color={textColor}>Your initial password is</Text>
										<Text bold color={textColor}>{results.password}</Text>
									</HStack>
								) : null}

								{results.requirePinReset ? (
									<Text mb="$3" color={textColor}>To login to the catalog, you must reset your PIN.</Text>
								) : null}

								<Button borderColor={theme['tokens']['colors']['secondary']['500']} variant="outline" onPress={() => {
									navigation.goBack();
									setShowResults(false);
									setResults('');
								}}>
									<ButtonText color={theme['tokens']['colors']['secondary']['500']}>{getTermFromDictionary('en', 'close_window')}</ButtonText>
								</Button>
							</>
						) : showResults && hasError ? (
                                   <>
                                        <Text mb="$3" color={textColor}>{results}</Text>
                                        <Button borderColor={theme['tokens']['colors']['secondary']['500']} variant="outline" onPress={() => {
                                             navigation.goBack();
                                             setShowResults(false);
                                             setResults('');
                                             setHasError(false);
                                        }}>
                                             <ButtonText color={theme['tokens']['colors']['secondary']['500']}>{getTermFromDictionary('en', 'close_window')}</ButtonText>
                                        </Button>
                                   </>
                              ) :  (
							<>
								{getFields()}
								<ButtonGroup pt="$3" pb="$5">
									<Button
										bgColor={theme['tokens']['colors']['secondary']['500']}
										isLoading={isSubmitting}
										isLoadingText="Registering..."
										onPress={() => {
											setIsSubmitting(true);
											handleSubmission();
										}}>
										<ButtonText color={theme['tokens']['colors']['secondary']['500-text']}>{getTermFromDictionary('en', 'register')}</ButtonText>
									</Button>
									<Button borderColor={theme['tokens']['colors']['secondary']['500']} variant="outline" onPress={() => navigation.goBack()}>
										<ButtonText color={theme['tokens']['colors']['secondary']['500']}>{getTermFromDictionary('en', 'cancel')}</ButtonText>
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
