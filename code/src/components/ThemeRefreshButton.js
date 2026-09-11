import React from 'react';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from './themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { useTheme } from '../themes/theme';
import { loadLibraryUrl } from '../util/db';
import { GLOBALS, LIBRARY } from '../util/globals';
import { logDebugMessage, logErrorMessage } from '../util/logging';

/**
 * ThemeRefreshButton component for refreshing the theme.
 * @param param0
 * @param param0.label
 * @param param0.refreshingLabel
 * @param param0.onRefreshed
 * @param param0.buttonProps
 * @returns {React.JSX.Element}
 * @constructor
 */
export const ThemeRefreshButton = ({
     label = 'Refresh Theme',
     refreshingLabel = 'Refreshing Theme...',
     onRefreshed,
     ...buttonProps
}) => {
     const { forceRefreshTheme } = useTheme();
     const [isRefreshing, setIsRefreshing] = React.useState(false);

     const onPress = React.useCallback(async () => {
          if (isRefreshing) {
               return;
          }

          setIsRefreshing(true);
          try {
               const persistedLibraryUrl = await loadLibraryUrl();
               const themeUrl = LIBRARY.url || persistedLibraryUrl || GLOBALS.url || null;
               logDebugMessage(`Theme refresh button: forcing theme refresh using url=${themeUrl ?? 'none'}`);
               await forceRefreshTheme(themeUrl);
               if (typeof onRefreshed === 'function') {
                    onRefreshed();
               }
          } catch (error) {
               logErrorMessage('Theme refresh button: refresh failed');
               logErrorMessage(error);
          } finally {
               setIsRefreshing(false);
          }
     }, [forceRefreshTheme, isRefreshing, onRefreshed]);

     return (
          <Center>
               <Button
                    onPress={onPress}
                    isDisabled={isRefreshing}
                    colorScheme="primary"
                    {...buttonProps}>
                    <ButtonText>
                         {isRefreshing ? refreshingLabel : label}
                    </ButtonText>
               </Button>
          </Center>
     );
};
