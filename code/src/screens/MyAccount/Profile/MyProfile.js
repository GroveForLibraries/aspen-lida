import _ from 'lodash';
import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Box } from '@/components/ui/box';
import { ThemedDivider as Divider } from '@/src/components/themed/ThemedDivider';
import { ThemedScrollView as ScrollView } from '@/src/components/themed/ThemedScrollView';
import Profile_ContactInformation from './ContactInformation';
import Profile_Identity from './Identity';
import Profile_MainAddress from './MainAddress';
import { SystemMessagesContext } from '@/src/context/initialContext';
import { useUserState } from '@/src/hooks/useUserData';
import { DisplaySystemMessage } from '@/src/components/Notifications';
import { useLibrary } from '@/src/hooks/useLibrarySystemData';

/**
 * MyProfile component that displays the user's profile information, including identity, main address, and contact information. It also handles system messages and updates them as needed.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const MyProfile = () => {
     const navigation = useNavigation();
     const library = useLibrary();
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const queryClient = useQueryClient();
     const { systemMessages, updateSystemMessages } = React.useContext(SystemMessagesContext);

     let firstname = '';
     if (!_.isUndefined(user.firstname)) {
          firstname = user.firstname;
     }

     let lastname = '';
     if (!_.isUndefined(user.lastname)) {
          lastname = user.lastname;
     }

     React.useLayoutEffect(() => {
          navigation.setOptions({
               headerLeft: () => <Box />,
          });
     }, [navigation]);

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

     return (
          <ScrollView className="mt-3 px-4">
               <Box className="flex-1">
                    {showSystemMessage()}
                    <Profile_Identity firstName={firstname} lastName={lastname} />
                    <Divider />
                    <Profile_MainAddress address={user.address1} city={user.city} state={user.state} zipCode={user.zip} />
                    <Divider />
                    <Profile_ContactInformation email={user.email} phone={user.phone} />
               </Box>
          </ScrollView>
     );
};
