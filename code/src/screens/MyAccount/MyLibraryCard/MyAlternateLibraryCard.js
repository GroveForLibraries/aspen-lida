
import { EyeOff, Eye } from 'lucide-react-native';
import { Pressable, ChevronLeftIcon, Box, ScrollView, ButtonGroup, Button, ButtonText, FormControl, FormControlLabel, FormControlLabelText, Input, InputField, InputSlot, InputIcon } from '@gluestack-ui/themed';
import React from 'react';
import { useWindowDimensions } from 'react-native';
import RenderHtml from 'react-native-render-html';
import { useQueryClient } from '@tanstack/react-query';
import { useRoute, useNavigation, CommonActions, StackActions } from '@react-navigation/native';
import { LoadingSpinner } from '../../../components/loadingSpinner';
import { SystemMessagesContext } from '../../../context/initialContext';

// custom components and helper files
import { useUserState, useUpdateUserProfile } from '../../../hooks/useUserData';
import { DisplaySystemMessage } from '../../../components/Notifications';
import { getTermFromDictionary } from '../../../translations/TranslationService';
import { refreshProfile, updateAlternateLibraryCard } from '../../../util/api/user';
import { decodeHTML } from '../../../helpers/helpers';
import { logDebugMessage, logWarnMessage, getErrorMessage } from '../../../util/logging';
import { useLibrary } from '../../../hooks/useLibrarySystemData';
import { useActiveLanguage } from '../../../hooks/useLanguageData';
import { useTheme } from '../../../themes/theme';

export const MyAlternateLibraryCard = () => {
     const navigation = useNavigation();
     const route = useRoute();
     const library = useLibrary();
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const updateUserProfile = useUpdateUserProfile();
     const language = useActiveLanguage();
     const { theme, textColor, colorMode } = useTheme();
     const queryClient = useQueryClient();
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
     let alternateLibraryCardStyle = 'none';

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

     if (library?.alternateLibraryCardConfig?.alternateLibraryCardStyle) {
          alternateLibraryCardStyle = library.alternateLibraryCardConfig.alternateLibraryCardStyle;
     }

     const showSystemMessage = () => {
          if (Array.isArray(systemMessages)) {
               return systemMessages.map((obj, index, collection) => {
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
          <ScrollView>
               {isLoading ? (
                    <LoadingSpinner />
               ) : (
                    <Box p="$5">
                         {showSystemMessage()}
                         <Box>
                              {formMessage ? <RenderHtml contentWidth={width} source={source} tagsStyles={tagsStyles} /> : null}
                              <FormControl mb="$2">
                                   <FormControlLabel>
                                        <FormControlLabelText color={textColor} size="sm">
                                             {cardLabel}
                                        </FormControlLabelText>
                                   </FormControlLabel>
                                   <Input borderColor={colorMode === 'light' ? "$coolGray500" : "$warmGray300"}>
                                        <InputField textContentType="none" color={textColor} name="card" value={card} accessibilityLabel={cardLabel} onChangeText={(value) => setCard(value)} />
                                   </Input>
                              </FormControl>
                              {showAlternateLibraryCardPassword ? (
                                   <FormControl mb="$2">
                                        <FormControlLabel>
                                             <FormControlLabelText color={textColor} size="sm">
                                                  {passwordLabel}
                                             </FormControlLabelText>
                                        </FormControlLabel>
                                        <Input borderColor={colorMode === 'light' ? "$coolGray500" : "$warmGray300"}>
                                             <InputField textContentType="none" type={showPassword ? 'text' : 'password'} color={textColor} name="password" value={password} accessibilityLabel={passwordLabel} onChangeText={(value) => setPassword(value)} />
                                             <InputSlot onPress={toggleShowPassword}>
                                                  <InputIcon as={showPassword ? Eye : EyeOff} mr="$2" color={textColor} />
                                             </InputSlot>
                                        </Input>
                                   </FormControl>
                              ) : null}
                              <ButtonGroup>
                                   <Button
                                        bgColor={theme.tokens.colors.primary['500']}
                                        onPress={() => {
                                             setIsLoading(true);
                                             updateCard().then(() => {
                                                  setIsLoading(false);
                                             });
                                        }}>
                                        <ButtonText color={theme.tokens.colors.primary['500-text']}>{getTermFromDictionary(language, 'update')}</ButtonText>
                                   </Button>
                                   <Button
                                        bgColor="$error700"
                                        onPress={() => {
                                             setIsLoading(true);
                                             deleteCard().then(() => {
                                                  setIsLoading(false);
                                             });
                                        }}>
                                        <ButtonText color="$white">{getTermFromDictionary(language, 'delete')}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </Box>
                    </Box>
               )}
          </ScrollView>
     );
};
