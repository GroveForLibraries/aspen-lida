import { Box, Divider, ScrollView } from '@gluestack-ui/themed';
import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';

// custom components and helper files
import Profile_ContactInformation from './ContactInformation';
import Profile_Identity from './Identity';
import Profile_MainAddress from './MainAddress';
import { SystemMessagesContext } from '../../../context/initialContext';
import { useUserState } from '../../../hooks/useUserData';
import { DisplaySystemMessage } from '../../../components/Notifications';
import { useLibrary } from '../../../hooks/useLibrarySystemData';

export const MyProfile = () => {
     const navigation = useNavigation();
     const library = useLibrary();
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const queryClient = useQueryClient();
     const { systemMessages, updateSystemMessages } = React.useContext(SystemMessagesContext);

     let firstname = '';
     if (user.firstname !== undefined) {
          firstname = user.firstname;
     }

     let lastname = '';
     if (user.lastname !== undefined) {
          lastname = user.lastname;
     }

     React.useLayoutEffect(() => {
          navigation.setOptions({
               headerLeft: () => <Box />,
          });
     }, [navigation]);

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

     return (
          <ScrollView mt="$3" mx="$2">
               <Box flex={1} safeArea={5}>
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
