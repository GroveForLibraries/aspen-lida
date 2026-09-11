import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { Uniwind } from 'uniwind';
import { Box } from '@/components/ui/box';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../components/themed/ThemedButton';
import { HStack } from '@/components/ui/hstack';
import { Spinner } from '@/components/ui/spinner';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import {
     useUpdateThemeColorMode,
     useUpdateThemeColors,
     useUpdateThemeColorMode as usePersistThemeColorMode,
     useAvailableThemes,
} from '../hooks/useThemeData';
import { useLibraryLocation } from '../hooks/useLibraryBranchData';
import { logDebugMessage } from '../util/logging.js';
import { buildThemeConfigFromCatalogEntry, useTheme, useThemeForDisplay } from './theme';

/** Back-chevron icon, colored for contrast against a branded header background. */
export const BackIcon = (props) => {
     const { brand } = useThemeForDisplay();
     return <MaterialIcons name="chevron-left" size={24} className="ml-[1px]" {...props} color={brand.primary.baseContrast} />;
};

/**
 * Light/dark toggle button. Renders nothing if the current library has no Aspen LiDA themes
 * configured, or renders `ThemeSwitcher` instead if 2+ themes are configured.
 * @param props.showText whether to show the "Light"/"Dark" label next to the icon
 */
export function UseColorMode(props) {
     const { showText } = props;
     const { colorMode, brand, neutralPairs } = useThemeForDisplay();
     const location = useLibraryLocation();
     const themes = useAvailableThemes(location?.locationId);
     const persistThemeColorMode = usePersistThemeColorMode();
     const currentMode = colorMode === 'dark' ? 'wb-sunny' : 'nightlight-round';
     const currentColorMode = colorMode === 'dark' ? 'Dark' : 'Light';
     const currentModeB = colorMode === 'dark' ? 'nightlight-round' : 'wb-sunny';
     const iconColor = colorMode === 'dark' ? neutralPairs.textMain.dark : neutralPairs.icon.light;

     if (Array.isArray(themes) && themes.length > 1) {
          return <ThemeSwitcher showText={showText} />;
     }

     if (Array.isArray(themes) && themes.length === 1) {
          return null;
     }

     const switchColorMode = async () => {
          let newColorMode;
          if (colorMode === 'light') {
               newColorMode = 'dark';
          }else{
               newColorMode = 'light';
          }

          logDebugMessage("Switching color mode to: " + newColorMode);
          Uniwind.setTheme(newColorMode);
         await persistThemeColorMode(newColorMode);
     };

     if (showText) {
          return (
               <HStack alignItems="center">
                    <Button onPress={switchColorMode} size="sm" className="rounded-full" style={{ backgroundColor: 'transparent' }}>
                         <MaterialIcons name={currentModeB} size={18} color={brand.primary[500]} />
                         <ButtonText style={{ fontSize: 14, color: iconColor }}> {currentColorMode}</ButtonText>
                    </Button>
               </HStack>
          );
     }

     return (
          <Box alignItems="center">
               <Button onPress={switchColorMode} size="sm" className="rounded-full" style={{ backgroundColor: 'transparent' }}>
                   <MaterialIcons name={currentMode} size={18} color={brand.primary[500]} />
               </Button>
          </Box>
     );
}

/**
 * Theme picker button. Opens a menu of the themes available at the user's library location;
 * selecting one applies its colors and light/dark mode immediately, showing a switching-spinner
 * overlay while the change is in flight.
 * @param showText whether to show the active theme's name next to the trigger icon
 */
export const ThemeSwitcher = ({ showText = true } = {}) => {
     const { brand, neutralPairs, neutrals, themeId, colorMode, textColor } = useTheme();
     const location = useLibraryLocation();
     const themes = useAvailableThemes(location?.locationId);
     const updateThemeColors = useUpdateThemeColors();
     const updateColorMode = useUpdateThemeColorMode();

     const [isThemeMenuOpen, setIsThemeMenuOpen] = React.useState(false);
     const [isSwitchingTheme, setIsSwitchingTheme] = React.useState(false);

     const activeTheme = themes.find((entry) => entry.id === themeId);
     const activeThemeName = activeTheme?.name ?? '';

     const changeTheme = async (themeEntry) => {
          if (isSwitchingTheme) return;
          setIsSwitchingTheme(true);
          try {
               logDebugMessage('Switching theme to ' + themeEntry?.id);
               const builtTheme = buildThemeConfigFromCatalogEntry(themeEntry);
               await updateThemeColors(builtTheme.themeColors, builtTheme.themeId, location?.locationId, builtTheme.header);
               if (builtTheme.baseMode === 'dark' || builtTheme.baseMode === 'light') {
                    await updateColorMode(builtTheme.baseMode);
               }
          } catch (error) {
               logDebugMessage('Theme switch failed');
               logDebugMessage(error);
          } finally {
               setIsSwitchingTheme(false);
          }
     };

     if (!Array.isArray(themes) || themes.length === 0) {
          return null;
     }

     return (
          <>
               <Box alignItems="center">
                    <Button
                         size="sm"
                         variant="ghost"
                         colorScheme="primary"
                         isDisabled={isSwitchingTheme}
                         onPress={() => {
                              setIsThemeMenuOpen(true);
                         }}
                         className="rounded-full">
                         <MaterialIcons name="palette" size={18} color={brand.primary[500]} />
                         {showText ? <ButtonText> {activeThemeName}</ButtonText> : null}
                    </Button>
               </Box>
               <Modal transparent animationType="fade" visible={isThemeMenuOpen || isSwitchingTheme}>
                    {isSwitchingTheme ? (
                         <View style={[themeSwitcherStyles.overlay, colorMode === 'dark' ? themeSwitcherStyles.overlayDark : themeSwitcherStyles.overlayLight]}>
                              <Box
                                   className="px-6 py-5"
                                   style={{
                                        backgroundColor: colorMode === 'dark' ? neutralPairs.surface.dark : neutralPairs.surface.light,
                                        borderRadius: 16,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                   }}>
                                   <Spinner size="large" color={brand.primary[500]} />
                                   <Text className="mt-3">
                                        Switching theme...
                                   </Text>
                              </Box>
                         </View>
                    ) : (
                         <View
                              className="flex-1"
                              onTouchEnd={() => setIsThemeMenuOpen(false)}>
                              <Box className="flex-1 justify-end items-start pb-12 pl-10">
                                   <Box
                                        className="rounded-md p-1"
                                        style={{
                                             backgroundColor: neutrals.surface,
                                             height: themes.length > 4 ? 150 : undefined,
                                             width: 200,
                                        }}>
                                        <ScrollView nestedScrollEnabled={true} scrollEnabled={true}>
                                             {themes.map((themeEntry) => {
                                                  const isActive = themeEntry.id === themeId;
                                                  return (
                                                       <Box
                                                            key={themeEntry.id}
                                                            className="px-4 py-3"
                                                            onTouchEnd={() => {
                                                                 setIsThemeMenuOpen(false);
                                                                 changeTheme(themeEntry);
                                                            }}>
                                                            <HStack space="md" alignItems="center">
                                                                 <Text>{themeEntry.name}</Text>
                                                                 {isActive ? <MaterialIcons name="check" size={18} color={textColor} /> : null}
                                                            </HStack>
                                                       </Box>
                                                  );
                                             })}
                                        </ScrollView>
                                   </Box>
                              </Box>
                         </View>
                    )}
               </Modal>
          </>
     );
};

const themeSwitcherStyles = StyleSheet.create({
     overlay: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
     },
     overlayLight: {
          backgroundColor: 'rgba(15, 23, 42, 0.35)',
     },
     overlayDark: {
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
     },
});
