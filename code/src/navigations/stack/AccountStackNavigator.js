import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { PalaceProjectInstructions } from '../../components/Action/CheckOut/PalaceProjectInstructions';
import { EventScreen } from '../../screens/Event/Event';
import { GroupedWorkScreen } from '../../screens/GroupedWork/GroupedWork';
import { WhereIsIt } from '../../screens/GroupedWork/WhereIsIt';
import { MyCheckouts } from '../../screens/MyAccount/CheckedOutTitles/MyCheckouts';
import { MyEvents } from '../../screens/MyAccount/Events/Events';
import { MyList } from '../../screens/MyAccount/Lists/MyList';
import { MyLists } from '../../screens/MyAccount/Lists/MyLists';
import { NotificationHistoryMessageModal } from '../../screens/MyAccount/NotificationHistory/NotificationHistoryMessage';
import { MyNotificationHistory } from '../../screens/MyAccount/NotificationHistory/NotificationHistory';
import { MyProfile } from '../../screens/MyAccount/Profile/MyProfile';
import { MyReadingHistory } from '../../screens/MyAccount/ReadingHistory/ReadingHistory';
import { LoadSavedSearch } from '../../screens/MyAccount/SavedSearches/LoadSavedSearch';
import { MySavedSearch } from '../../screens/MyAccount/SavedSearches/MySavedSearch';
import { MySavedSearches } from '../../screens/MyAccount/SavedSearches/MySavedSearches';
import { Settings_BrowseCategories } from '../../screens/MyAccount/Settings/BrowseCategories';
import { MyLinkedAccounts } from '../../screens/MyAccount/LinkedAccounts/LinkedAccounts';
import { Settings_NotificationOptions } from '../../screens/MyAccount/Settings/NotificationOptions';
import { PreferencesScreen } from '../../screens/MyAccount/Settings/Preferences';
import { MyHolds } from '../../screens/MyAccount/TitlesOnHold/MyHolds';
import { useTheme } from '../../themes/theme';
import { BackIcon } from '../../themes/ThemeSwitcher';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { EditionsModal } from './BrowseStackNavigator';
import { MyCampaigns } from '../../screens/MyAccount/Campaigns/Campaigns';
import { useActiveLanguage } from '../../hooks/useLanguageData';

import TitleWithLogo from '../../components/TitleWithLogo'
import { ModalHeader } from '../../components/Headers/ModalHeader';

const Stack = createNativeStackNavigator();

/**
 * AccountStackNavigator component for managing the navigation stack related to user account features.
 * @returns {React.JSX.Element}
 * @constructor
 */
const AccountStackNavigator = () => {
     const language = useActiveLanguage();
     return (
          <Stack.Navigator
               initialRouteName="MyPreferences"
               screenOptions={{
                    headerShown: true,
                    headerBackButtonDisplayMode: 'minimal',
                    gestureEnabled: false,
                    headerBackImage: () => <BackIcon />,
               }}>
               <Stack.Group>
                    <Stack.Screen
                         name="MyPreferences"
                         component={PreferencesScreen}
                         options={{
                              header: () => {
                                   const title = getTermFromDictionary(language, 'preferences');
                                   return <TitleWithLogo title={title} hideBack={true} />;
                              },
                         }}
                    />
                    <Stack.Screen
                         name="SettingsBrowseCategories"
                         component={Settings_BrowseCategories}
                         options={{
                              header: () => {
                                   const title = getTermFromDictionary(language, 'manage_browse_categories');
                                   return <TitleWithLogo title={title} hideBack={true} />;
                              },
                         }}
                    />
                    <Stack.Screen
                         name="SettingsNotificationOptions"
                         component={Settings_NotificationOptions}
                         options={{
                              header: () => {
                                   const title = getTermFromDictionary(language, 'notification_settings');
                                   return <TitleWithLogo title={title} hideBack={true} />;
                              },
                         }}
                    />
               </Stack.Group>
               <Stack.Group>
                    <Stack.Screen
                         name="MyProfile"
                         component={MyProfile}
                         options={{
                              header: () => {
                                   const title = getTermFromDictionary(language, 'contact_information');
                                   return <TitleWithLogo title={title} hideBack={true} />;
                              },
                         }}
                    />
               </Stack.Group>
               <Stack.Group>
                    <Stack.Screen
                         name="MyLinkedAccounts"
                         component={MyLinkedAccounts}
                         options={{
                              header: () => {
                                   const title = getTermFromDictionary(language, 'linked_accounts');
                                   return <TitleWithLogo title={title} hideBack={true} />;
                              },
                         }}
                    />
               </Stack.Group>
               <Stack.Group>
                    <Stack.Screen
                         name="MyHolds"
                         component={MyHolds}
                         options={{
                              header: () => {
                                   const title = getTermFromDictionary(language, 'titles_on_hold');
                                   return <TitleWithLogo title={title} hideBack={true} />;
                              },
                              title: getTermFromDictionary(language, 'titles_on_hold'),
                         }}
                    />
                    <Stack.Screen
                         name="MyHold"
                         component={GroupedWorkScreen}
                         options={({ route }) => ({
                              header: () => {
                                   const title = route.params.title ?? getTermFromDictionary(language, 'item_details');
                                   return <TitleWithLogo title={title} />;
                              },
                         })}
                         initialParams={{ prevRoute: 'MyHolds' }}
                    />
               </Stack.Group>
               <Stack.Group>
                    <Stack.Screen
                         name="MyCheckouts"
                         component={MyCheckouts}
                         options={{
                              header: () => {
                                   const title = getTermFromDictionary(language, 'checked_out_titles');
                                   return <TitleWithLogo title={title} hideBack={true} />;
                              },
                         }}
                    />
                    <Stack.Screen
                         name="MyCheckout"
                         component={GroupedWorkScreen}
                         options={({ route }) => ({
                              header: () => {
                                   const title = route.params.title ?? getTermFromDictionary(language, 'item_details');
                                   return <TitleWithLogo title={title} />;
                              },
                         })}
                         initialParams={{ prevRoute: 'MyCheckouts' }}
                    />
                    <Stack.Screen
                         name="PalaceProjectInstructionsModal"
                         component={PalaceProjectInstructionsModal}
                         options={{
                              headerShown: false,
                              presentation: 'modal',
                              header: ({ navigation }) => (
                                   <ModalHeader
                                        title={getTermFromDictionary(language, 'using_palace_project')}
                                        onBack={() => navigation.goBack()}
                                        onClose={() => {
                                             const parent = navigation.getParent();
                                             if (parent?.canGoBack()) parent.goBack();
                                             else if (navigation.canGoBack()) navigation.goBack();
                                        }}
                                        showBack={false}
                                        showClose={true}
                                   />
                              ),
                         }}
                    />
               </Stack.Group>
               <Stack.Group>
                    <Stack.Screen
                         name="MyLists"
                         component={MyLists}
                         options={{
                              header: () => {
                                   const title = getTermFromDictionary(language, 'lists');
                                   return <TitleWithLogo title={title} hideBack={true} />;
                              },
                         }}
                    />
                    <Stack.Screen
                         name="MyList"
                         component={MyList}
                         options={({ route }) => ({
                              header: () => {
                                   const title = route.params.title;
                                   return <TitleWithLogo title={title} />;
                              },
                              title: route.params.title,
                         })}
                    />
                    <Stack.Screen
                         name="ListItem"
                         component={GroupedWorkScreen}
                         options={({ route }) => ({
                              header: () => {
                                   const title = route.params.title ?? getTermFromDictionary(language, 'item_details');
                                   return <TitleWithLogo title={title} />;
                              },
                         })}
                         initialParams={{ prevRoute: 'MyList' }}
                    />
                    <Stack.Screen
                         name="ListItemEvent"
                         component={EventScreen}
                         options={({ route }) => ({
                              header: () => {
                                   const title = route.params.title ?? getTermFromDictionary(language, 'item_details');
                                   return <TitleWithLogo title={title} />;
                              },
                         })}
                         initialParams={{ prevRoute: 'MyList' }}
                    />
               </Stack.Group>
               <Stack.Group>
                    <Stack.Screen
                         name="MySavedSearches"
                         component={MySavedSearches}
                         options={{
                              header: () => {
                                   const title = getTermFromDictionary(language, 'saved_searches');
                                   return <TitleWithLogo title={title} />;
                              },
                         }}
                    />
                    <Stack.Screen
                         name="MySavedSearch"
                         component={MySavedSearch}
                         options={({ route }) => ({
                              header: () => {
                                   const title = route.params.title;
                                   return <TitleWithLogo title={title} />;
                              },
                         })}
                         initialParams={{ prevRoute: 'MySavedSearches' }}
                    />
                    <Stack.Screen
                         name="SavedSearchItem"
                         component={GroupedWorkScreen}
                         options={({ route }) => ({
                              header: () => {
                                   const title = route.params.title ?? getTermFromDictionary(language, 'item_details');
                                   return <TitleWithLogo title={title} />;
                              },
                         })}
                         initialParams={{ prevRoute: 'MySavedSearch' }}
                    />
               </Stack.Group>
               <Stack.Group>
                    <Stack.Screen
                         name="MyReadingHistory"
                         component={MyReadingHistory}
                         options={{
                              header: () => {
                                   const title = getTermFromDictionary(language, 'my_reading_history');
                                   return <TitleWithLogo title={title} hideBack={true} />;
                              },
                              //title: getTermFromDictionary(language, 'my_reading_history'),
                         }}
                    />
                    <Stack.Screen
                         name="ItemDetails"
                         component={GroupedWorkScreen}
                         options={({ route }) => ({
                              header: () => {
                                   const title = route.params.title ?? getTermFromDictionary(language, 'item_details');
                                   return <TitleWithLogo title={title} />;
                              },
                              //title: route.params.title ?? getTermFromDictionary(language, 'item_details'),
                         })}
                         initialParams={{ prevRoute: 'MyReadingHistory' }}
                    />
               </Stack.Group>
               <Stack.Group>
                    <Stack.Screen
                         name="MyEvents"
                         component={MyEvents}
                         options={{
                              header: () => {
                                   const title = getTermFromDictionary(language, 'my_events');
                                   return <TitleWithLogo title={title} hideBack={true} />;
                              },
                              //title: getTermFromDictionary(language, 'my_events'),
                         }}
                    />
                    <Stack.Screen
                         name="EventDetails"
                         component={EventScreen}
                         initialParams={{ prevRoute: 'MyEvents' }}
                         options={({ route }) => ({
                              header: () => {
                                   const title = route.params.title ?? getTermFromDictionary(language, 'event_details');
                                   return <TitleWithLogo title={title} />;
                              },
                              //title: route.params.title ?? getTermFromDictionary(language, 'event_details'),
                         })}
                    />
               </Stack.Group>
               <Stack.Screen
                    name="MyCampaigns"
                    component={MyCampaigns}
                    options={{
                         header: () => {
                              const title = getTermFromDictionary(language, 'campaigns');
                              return <TitleWithLogo title={title} hideBack={true} />;
                         },
                    }}
               />
               <Stack.Screen
                    name="MyNotificationHistory"
                    component={MyNotificationHistory}
                    options={{
                         header: () => {
                              const title = getTermFromDictionary(language, 'my_notification_history');
                              return <TitleWithLogo title={title} hideBack={true} />;
                         },
                         //title: getTermFromDictionary(language, 'my_notification_history'),
                    }}
               />
               <Stack.Screen
                    name="MyNotificationHistoryMessageModal"
                    component={NotificationHistoryMessageModal}
                    options={({ navigation }) => ({
                         title: getTermFromDictionary(language, 'notification'),
                         headerShown: true,
                         presentation: 'modal',
                         headerBackButtonDisplayMode: 'minimal',
                         header: ({ navigation }) => (
                              <ModalHeader
                                   title={getTermFromDictionary(language, 'notification')}
                                   onBack={() => navigation.goBack()}
                                   onClose={() => {
                                        if (navigation.canGoBack()) {
                                             navigation.goBack();
                                        } else {
                                             navigation.navigate('MyNotificationHistory');
                                        }
                                   }}
                                   showBack={false}
                                   showClose={true}
                              />
                         ),
                    })}
               />
               <Stack.Screen
                    name="LoadSavedSearch"
                    component={LoadSavedSearch}
                    options={({ route }) => ({
                         title: route.params.name,
                    })}
               />
               <Stack.Screen
                    name="CopyDetails"
                    component={WhereIsIt}
                    options={({ navigation }) => ({
                         title: getTermFromDictionary(language, 'where_is_it'),
                         headerShown: true,
                         presentation: 'modal',
                         header: ({ navigation }) => (
                              <ModalHeader
                                   title={getTermFromDictionary(language, 'where_is_it')}
                                   onBack={() => navigation.goBack()}
                                   onClose={() => {
                                        const parent = navigation.getParent();
                                        if (parent?.canGoBack()) parent.goBack();
                                        else if (navigation.canGoBack()) navigation.goBack();
                                   }}
                                   showBack={false}
                                   showClose={true}
                              />
                         ),
                    })}
               />
               <Stack.Screen
                    name="EditionsModal"
                    component={EditionsModal}
                    options={{
                         headerShown: false,
                         presentation: 'modal',
                         header: ({ navigation }) => (
                              <ModalHeader
                                   title={getTermFromDictionary(language, 'editions')}
                                   onBack={() => navigation.goBack()}
                                   onClose={() => {
                                        const parent = navigation.getParent();
                                        if (parent?.canGoBack()) parent.goBack();
                                        else if (navigation.canGoBack()) navigation.goBack();
                                   }}
                                   showBack={false}
                                   showClose={true}
                              />
                         ),
                    }}
               />
          </Stack.Navigator>
     );
};

const PalaceProjectStack = createNativeStackNavigator();
/**
 * PalaceProjectInstructionsModal component for displaying the Palace Project instructions in a modal.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const PalaceProjectInstructionsModal = () => {
     const language = useActiveLanguage();
     return (
          <PalaceProjectStack.Navigator
               id="PalaceProjectStack"
               screenOptions={({ navigation, route }) => ({
                    headerShown: false,
                    animationTypeForReplace: 'push',
                    gestureEnabled: false,
                    header: ({ navigation }) => (
                         <ModalHeader
                              title={getTermFromDictionary(language, 'palace_project')}
                              onBack={() => navigation.goBack()}
                              onClose={() => {
                                   const parent = navigation.getParent();
                                   if (parent?.canGoBack()) parent.goBack();
                                   else if (navigation.canGoBack()) navigation.goBack();
                              }}
                              showBack={false}
                              showClose={true}
                         />
                    ),
               })}>
               <PalaceProjectStack.Screen
                    name="Instructions"
                    component={PalaceProjectInstructions}
                    options={{
                         title: getTermFromDictionary(language, 'using_palace_project'),
                         headerShown: true,
                         presentation: 'card',
                    }}
               />
          </PalaceProjectStack.Navigator>
     );
};

const MyNotificationHistoryMessageStack = createNativeStackNavigator();
/**
 * MyNotificationHistoryMessageModal component for displaying the notification history message in a modal.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const MyNotificationHistoryMessageModal = () => {
     const language = useActiveLanguage();
     const { brand } = useTheme();
     return (
          <MyNotificationHistoryMessageStack.Navigator
               id="MyNotificationHistoryMessageStack"
               screenOptions={({ navigation, route }) => ({
                    headerShown: false,
                    animationTypeForReplace: 'push',
                    gestureEnabled: false,
               })}>
               <MyNotificationHistoryMessageStack.Screen
                    name="MyNotificationHistoryMessage"
                    component={NotificationHistoryMessageModal}
                    options={{
                         title: getTermFromDictionary(language, 'my_message'),
                         headerShown: true,
                         presentation: 'card',
                         headerStyle: {
                              backgroundColor: brand.primary[500],
                         },
                         headerTintColor: brand.primary['500-text'],
                    }}
               />
          </MyNotificationHistoryMessageStack.Navigator>
     );
};

export default AccountStackNavigator;
