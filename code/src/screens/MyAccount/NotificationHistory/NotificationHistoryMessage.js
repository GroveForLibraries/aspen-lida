import React from 'react';
import { useRoute } from '@react-navigation/native';
import { useTheme } from '@/src/themes/theme';
import { Box } from '@/components/ui/box';
import { screenContentContainerStyle } from '@/src/components/ScreenContainer';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { ThemedScrollView as ScrollView } from '@/src/components/themed/ThemedScrollView';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { VStack } from '@/components/ui/vstack';

/**
 * NotificationHistoryMessageModal component that displays the details of a notification message, including title, content, and date sent. It retrieves the message data from the navigation route parameters and formats the date for display.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const NotificationHistoryMessageModal = () => {
     const {  } = useTheme();
     const defaultMessage = {
          title: '',
          content: '',
          isRead: 0,
          dateSent: null };

     const route = useRoute();
     const message = route.params?.message ?? defaultMessage;

     const formatDate = (timestamp) => {
          if (!timestamp) return '';
          // Convert Unix timestamp (seconds) to milliseconds
          const date = new Date(timestamp * 1000);
          return date.toLocaleDateString(undefined, {
               year: 'numeric',
               month: 'long',
               day: 'numeric',
               hour: '2-digit',
               minute: '2-digit'
          });
     };

     return (
          <ScrollView contentContainerStyle={screenContentContainerStyle}>
               <Box className="py-5">
                    <VStack space="md">
                         <Heading size="lg">{message.title}</Heading>
                         <Text>{message.content}</Text>
                         {message.dateSent && (
                              <Text size="sm" style={{ opacity: 0.7 }}>
                                   {formatDate(message.dateSent)}
                              </Text>
                         )}
                    </VStack>
               </Box>
          </ScrollView>
     );
};
