import _ from 'lodash';
import React from 'react';
import { useWindowDimensions } from 'react-native';
import RenderHtml from 'react-native-render-html';
import { useQueryClient } from '@tanstack/react-query';
import { useRoute, useNavigation, CommonActions, StackActions } from '@react-navigation/native';
import { Box } from '@/components/ui/box';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { ThemedScrollView as ScrollView } from '@/src/components/themed/ThemedScrollView';
import { screenContentContainerStyle } from '@/src/components/ScreenContainer';
import { LoadingSpinner } from '@/src/components/loadingSpinner';
import { SystemMessagesContext } from '@/src/context/initialContext';
import { useUserState, useUpdateUserProfile } from '@/src/hooks/useUserData';
import { DisplaySystemMessage } from '@/src/components/Notifications';
import { getTermFromDictionary } from '@/src/translations/TranslationService';
import { refreshProfile, updateAlternateLibraryCard } from '@/src/util/api/user';
import { decodeHTML } from '@/src/helpers/helpers';
import { logDebugMessage, logWarnMessage, getErrorMessage } from '@/src/util/logging';
import { useLibrary } from '@/src/hooks/useLibrarySystemData';
import { useActiveLanguage } from '@/src/hooks/useLanguageData';
import { useTheme } from '@/src/themes/theme';
import { PasswordVisibilityToggle, ThemedFormControl as FormControl, ThemedInput as Input, ThemedInputField as InputField, ThemedFormControlLabelText as FormControlLabelText, ThemedFormControlLabel as FormControlLabel } from '@/src/components/themed/ThemedFormControls';
/**
 * MyAlternateLibraryCard component that allows users to manage their alternate library card information. It provides input fields for the alternate library card number and password, and buttons to update or delete the card information. The component also handles system messages, loading states, and updates the user profile upon changes.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const MyAlternateLibraryCard = () => {
     const navigation = useNavigation();
     const route = useRoute();
     const library = useLibrary();
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const updateUserProfile = useUpdateUserProfile();
     const language = useActiveLanguage();
     const { neutralPairs, textColor, neutrals } = useTheme();
     const queryClient = useQueryClient();
     const inputBorderColor = neutrals.border;
     const { systemMessages, updateSystemMessages } = React.useContext(SystemMessagesContext);
     const { width } = useWindowDimensions();
     const [card, setCard] = React.useState(user?.alternateLibraryCard ?? '');
     const [password, setPassword] = React.useState(user?.alternateLibraryCardPassword ?? '');

     React.useEffect(() => {
          setCard(user?.alternateLibraryCard ?? '');
          setPassword(user?.alternateLibraryCardPassword ?? '');
     }, [user]);

     const [isLoading, setIsLoading] = React.useState(false);
     const [showPassword, setShowPassword] = React.useState(false);
     const toggleShowPassword = () => setShowPassword(!showPassword);

     const handleGoBack = () => {
          logDebugMessage("Handling go back");
          logDebugMessage(route?.params);
          if (route?.params?.prevRoute === 'AccountDrawer') {
               navigation.dispatch(CommonActions.setParams({ prevRoute: null }));
               navigation.dispatch(StackActions.replace('LibraryCard'));
          } else {
               navigation.goBack();
          }
     };

     let cardLabel = getTermFromDictionary(language, 'alternate_library_card');
     let passwordLabel = getTermFromDictionary(language, 'password');
     let formMessage = '';
     let showAlternateLibraryCardPassword = false;
     if (library?.alternateLibraryCardConfig?.alternateLibraryCardLabel) {
          cardLabel = library.alternateLibraryCardConfig.alternateLibraryCardLabel;
     }

     if (library?.alternateLibraryCardConfig?.alternateLibraryCardPasswordLabel) {
          passwordLabel = library.alternateLibraryCardConfig.alternateLibraryCardPasswordLabel;
     }

     if (library?.alternateLibraryCardConfig?.alternateLibraryCardFormMessage) {
          formMessage = decodeHTML(library.alternateLibraryCardConfig.alternateLibraryCardFormMessage);
     }

     if (library?.alternateLibraryCardConfig?.showAlternateLibraryCardPassword) {
          if (library.alternateLibraryCardConfig.showAlternateLibraryCardPassword === '1' || library.alternateLibraryCardConfig.showAlternateLibraryCardPassword === 1) {
               showAlternateLibraryCardPassword = true;
          }
     }

     const showSystemMessage = () => {
          if (_.isArray(systemMessages)) {
               return systemMessages.map((obj, index) => {
                    if (obj.showOn === '0' || obj.showOn === '1' || obj.showOn === '5') {
                         return <DisplaySystemMessage key={obj.id || index} style={obj.style} message={obj.message} dismissable={obj.dismissable} id={obj.id} all={systemMessages} url={library.baseUrl} updateSystemMessages={updateSystemMessages} queryClient={queryClient} />;
                    }
               });
          }
          return null;
     };

     const source = {
          baseUrl: library.baseUrl,
          html: formMessage };

     const tagsStyles = {
          body: {
               color: textColor },
          a: {
               color: textColor,
               textDecorationColor: textColor } };

     const deleteCard = async () => {
          await updateAlternateLibraryCard('', '', true, library.baseUrl, language);
          await refreshProfile(library.baseUrl).then(async (data) => {
               if(data.ok) {
                    await updateUserProfile(data.data.result.profile);
               } else {
                    logWarnMessage('Could not refresh profile after deleting alternate library card.');
                    logDebugMessage(data);
                    getErrorMessage(data.code ?? 0, data.problem);
               }
          });
     };

     const updateCard = async () => {
          await updateAlternateLibraryCard(card, password, false, library.baseUrl, language);
          await refreshProfile(library.baseUrl).then(async (data) => {
               if(data.ok) {
                    await updateUserProfile(data.data.result.profile);
               } else {
                    logWarnMessage('Could not refresh profile after updating alternate library card.');
                    logDebugMessage(data);
                    getErrorMessage(data.code ?? 0, data.problem);
               }
          });
     };

     return (
          <ScrollView contentContainerStyle={screenContentContainerStyle}>
               {isLoading ? (
                    <LoadingSpinner />
               ) : (
                    <Box className="py-5">
                         {showSystemMessage()}
                         <Box>
                              {formMessage ? <RenderHtml contentWidth={width} source={source} tagsStyles={tagsStyles} /> : null}
                              <FormControl className="mb-2">
                                   <FormControlLabel>
                                        <FormControlLabelText size="sm">
                                             {cardLabel}
                                        </FormControlLabelText>
                                   </FormControlLabel>
                                   <Input style={{ borderColor: inputBorderColor }}>
                                        <InputField textContentType="none" name="card" value={card} accessibilityLabel={cardLabel} onChangeText={(value) => setCard(value)} />
                                   </Input>
                              </FormControl>
                              {showAlternateLibraryCardPassword ? (
                                   <FormControl className="mb-2">
                                        <FormControlLabel>
                                             <FormControlLabelText size="sm">
                                                  {passwordLabel}
                                             </FormControlLabelText>
                                        </FormControlLabel>
                                        <Input style={{ borderColor: inputBorderColor }}>
                                             <InputField textContentType="none" type={showPassword ? 'text' : 'password'} name="password" value={password} accessibilityLabel={passwordLabel} onChangeText={(value) => setPassword(value)} />
                                             <PasswordVisibilityToggle showPassword={showPassword} onPress={toggleShowPassword} />
                                        </Input>
                                   </FormControl>
                              ) : null}
                              <ButtonGroup>
                                   <Button
                                        colorScheme="primary"
                                        onPress={() => {
                                             setIsLoading(true);
                                             updateCard().then(() => {
                                                  setIsLoading(false);
                                             });
                                        }}>
                                        <ButtonText>{getTermFromDictionary(language, 'update')}</ButtonText>
                                   </Button>
                                   <Button
                                        style={{ backgroundColor: neutralPairs.danger }}
                                        onPress={() => {
                                             setIsLoading(true);
                                             deleteCard().then(() => {
                                                  setIsLoading(false);
                                             });
                                        }}>
                                        <ButtonText style={{ color: neutralPairs.white }}>{getTermFromDictionary(language, 'delete')}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </Box>
                    </Box>
               )}
          </ScrollView>
     );
};
