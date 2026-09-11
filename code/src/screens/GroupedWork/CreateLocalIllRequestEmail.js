import { useRoute, useNavigation } from '@react-navigation/native';
import React from 'react';
import { submitLocalIllRequestEmail } from '../../util/api/user';
import { useLibrary } from '../../hooks/useLibrarySystemData';
import { popAlert } from '../../components/feedback';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { useTheme } from '../../themes/theme';
import { ThemedFormControl as FormControl, ThemedInput as Input, ThemedInputField as InputField, ThemedFormControlLabelText as FormControlLabelText, ThemedFormControlLabel as FormControlLabel } from '../../components/themed/ThemedFormControls';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { ThemedScrollView as ScrollView } from '@/src/components/themed/ThemedScrollView';
import { ThemedTextarea as Textarea, ThemedTextareaInput as TextareaInput } from '../../components/themed/ThemedTextarea';
import { VStack } from '@/components/ui/vstack';
import { screenContentContainerStyle } from '@/src/components/ScreenContainer';

/**
 * CreateLocalIllRequestEmail component that renders a form for creating a local interlibrary loan (ILL) request email. It retrieves work details from the route parameters and allows the user to submit the request with optional volume name and note.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const CreateLocalIllRequestEmail = () => {
     const route = useRoute();
     const id = route.params.id;
     const title = route.params.workTitle ?? null;
     const author = route.params.workAuthor ?? null;
     const volumeName = route.params.volumeName ?? null;
     const recordId = route.params.recordId ?? null;

     return <Request workId={id} workTitle={title} author={author} volumeName={volumeName} recordId={recordId}/>;
};

/**
 * Request component that renders the form for creating a local interlibrary loan (ILL) request email. It manages the state of the form fields and handles the submission of the request.
 * @param payload
 * @returns {React.JSX.Element}
 * @constructor
 */
const Request = (payload) => {
     const navigation = useNavigation();
     const { workTitle, author, volumeName, recordId} = payload;
     const library = useLibrary();
     const language = useActiveLanguage();
     const {theme} = useTheme();

     const [userVolumeName, setUserVolumeName] = React.useState(volumeName);
     const [userNote, setUserNote] = React.useState('');

     const [isSubmitting, setIsSubmitting] = React.useState(false);

     const handleSubmission = async () => {
          const request = {
               title: workTitle,
               author: author ?? null,
               volumeName: userVolumeName ?? null,
               note: userNote ?? null,
               recordId: recordId ?? null
          };
          //logDebugMessage("Submitting local ill request email");
          //logDebugMessage(request);
          await submitLocalIllRequestEmail(library.baseUrl, request).then(async (result) => {
               setIsSubmitting(false);
               //logDebugMessage("Result from submitting local ill request email");
               //logDebugMessage(result);
               if (result.success) {
                    navigation.goBack();
               } else {
                    popAlert(result.api.title, result.api.message, 'error');
               }
          });
     };

     return (
          <ScrollView contentContainerStyle={screenContentContainerStyle}>
               <VStack space="md" className="py-4">
                    <FormControl className="my-2">
                         <FormControlLabel>
                              <FormControlLabelText size="sm">
                                   {getTermFromDictionary(language, 'title')}
                              </FormControlLabelText>
                         </FormControlLabel>
                         <Input isReadOnly={true}>
                              <InputField
                                   id="title"
                                   size="$lg"
                                   value={workTitle}
                                   defaultValue={workTitle}
                                   isReadOnly={true}
                              />
                         </Input>
                    </FormControl>
                    <FormControl className="my-2">
                         <FormControlLabel>
                              <FormControlLabelText size="sm">
                                   {getTermFromDictionary(language, 'author')}
                              </FormControlLabelText>
                         </FormControlLabel>
                         <Input isReadOnly={true}>
                              <InputField
                                   id="author"
                                   size="$lg"
                                   value={author}
                                   defaultValue={author}
                              />
                         </Input>
                    </FormControl>
                    <FormControl className="my-2">
                         <FormControlLabel>
                              <FormControlLabelText size="sm">
                                   {getTermFromDictionary(language, 'volume')}
                              </FormControlLabelText>
                         </FormControlLabel>
                         <Input>
                              <InputField
                                   id="volume"
                                   size="$lg"
                                   value={userVolumeName}
                                   defaultValue={volumeName}
                                   onChangeText={(text) => {
                                        setUserVolumeName(text);
                                   }}
                              />
                         </Input>
                    </FormControl>
                    <FormControl className="my-2">
                         <FormControlLabel>
                              <FormControlLabelText size="sm">
                                   {getTermFromDictionary(language, 'note')}
                              </FormControlLabelText>
                         </FormControlLabel>
                         <Textarea
                              id="note"
                              size="lg"
                         >
                              <TextareaInput
                                   value={userNote}
                                   defaultValue={userNote}
                                   onChangeText={(text) => {
                                        setUserNote(text);
                                   }}
                              />
                         </Textarea>
                    </FormControl>
                    <ButtonGroup>
                         <Button
                              isLoading={isSubmitting}
                              isLoadingText={getTermFromDictionary(language, 'saving', true)}
                              onPress={() => {
                                   setIsSubmitting(true);
                                   handleSubmission();
                              }}>
                              <ButtonText>{getTermFromDictionary(language, 'submit')}</ButtonText>
                         </Button>
                         <Button
                              variant="outline"
                              onPress={() => {
                                   navigation.goBack()
                              }}>
                              <ButtonText>{getTermFromDictionary(language, 'close_window')}</ButtonText>
                         </Button>
                    </ButtonGroup>
               </VStack>
          </ScrollView>
     );
};
