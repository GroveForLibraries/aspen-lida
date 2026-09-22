import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import {
     Box,
     createConfig,
     HStack,
     Button,
     ButtonIcon,
     ButtonText,
     ChevronLeftIcon,
     Menu,
     MenuItem,
     MenuItemLabel,
     Spinner,
     Text, Icon,
} from '@gluestack-ui/themed';
import { config as defaultConfig } from '@gluestack-ui/config';
import { GLOBALS } from '../util/globals';
import {
     useThemeState,
     useUpdateThemeColorMode,
     useUpdateThemeColors,
     useUpdateThemeTextColor,
     useResetThemeState,
     useAvailableThemes,
} from '../hooks/useThemeData';
import { useLibraryLocation } from '../hooks/useLibraryBranchData';

import { logDebugMessage } from '../util/logging.js';
import { getThemeInfo } from '../util/api/system';
import { loadThemeCatalog } from '../util/db';
import { buildSwatchFromThemeTokens } from '../helpers/helpers';

export function useColorModeValue(lightValue, darkValue) {
     const { colorMode } = useThemeState();
     return colorMode === 'dark' ? darkValue : lightValue;
}

export const BackIcon = (props) => {
     const { theme } = useThemeForDisplay();
     return <ChevronLeftIcon size="md" ml={1} {...props} color={theme['tokens']['colors']['primary']['baseContrast']} />;
};

function buildAlertTheme(actionType) {
     const actionColors = {
          error: { bg: '#fecaca', icon: '#dc2625', text: '#000000' },
          warning: { bg: '#ffd7aa', icon: '#ea580b', text: '#000000' },
          success: { bg: '#bbf7d0', icon: '#17a34a', text: '#000000' },
          info: { bg: '#bae6fe', icon: '#0084c7', text: '#000000' },
          none: { bg: '#e6e7ea', icon: '#4f5562', text: '#000000' },
     };

     const colors = actionColors[actionType] || actionColors.info;

     return {
          backgroundColor: colors.bg,
          '_icon': {
               color: colors.icon,
          },
          '_text': {
               color: colors.text,
          },
     };
}

function buildBadgeTheme(actionType) {
     const actionColors = {
          error: { bg: '#fee2e2', text: '#991b1b' },
          warning: { bg: '#fef3c7', text: '#92400e' },
          success: { bg: '#dcfce7', text: '#166534' },
          info: { bg: '#e0f2fe', text: '#075985' },
          muted: { bg: '#f3f4f6', text: '#1f2937' },
          none: { bg: '#e5e7eb', text: '#1f2937' }
     };

     const colors = actionColors[actionType] || actionColors.muted;

     return {
          backgroundColor: colors.bg,
          borderRadius: 'sm',
          _text: {
               color: colors.text,
               fontSize: '$xs',
               fontWeight: 'medium',
               textTransform: 'none'
          },
     };
}

function buildConfigFromColors(colors) {
     return createConfig({
          ...defaultConfig,
          tokens: {
               ...defaultConfig.tokens,
               colors: {
                    ...defaultConfig.tokens.colors,
                    primary: colors?.primary ?? defaultConfig.tokens.colors.primary,
                    secondary: colors?.secondary ?? defaultConfig.tokens.colors.secondary,
                    tertiary: colors?.tertiary ?? defaultConfig.tokens.colors.tertiary,
               },
          },
          components: {
               ...defaultConfig.components,
               Alert: {
                    theme: {
                         variants: {
                              action: {
                                   error: buildAlertTheme('error'),
                                   warning: buildAlertTheme('warning'),
                                   success: buildAlertTheme('success'),
                                   info: buildAlertTheme('info'),
                                   none: buildAlertTheme('none')
                              },
                         },
                    },
               },
               ButtonText: {
                    ...defaultConfig.components.ButtonText,
                    theme: {
                         ...defaultConfig.components.ButtonText?.theme,
                         baseStyle: {
                              ...defaultConfig.components.ButtonText?.theme?.baseStyle,
                              fontSize: '$sm',
                              fontWeight: '$normal',
                         },
                    },
               },
               Badge: {
                    ...defaultConfig.components.Badge,
                    theme: {
                         ...defaultConfig.components.Badge?.theme,
                         variants: {
                              ...defaultConfig.components.Badge?.theme?.variants,
                              action: {
                                   ...(defaultConfig.components.Badge?.theme?.variants?.action ?? {}),
                                   error: buildBadgeTheme('error'),
                                   warning: buildBadgeTheme('warning'),
                                   success: buildBadgeTheme('success'),
                                   info: buildBadgeTheme('info'),
                                   muted: buildBadgeTheme('muted'),
                                   none: buildBadgeTheme('none'),
                              },
                         },
                    },
               },
          },
     });
}

function normalizeThemeColors(response = []) {
     return {
          primary: response?.[0] ?? null,
          secondary: response?.[1] ?? null,
          tertiary: response?.[2] ?? null,
     };
}

export async function buildThemeForLibrary(url = null, locationId = null) {
     const response = await getThemeInfo(url, locationId);
     const themeColors = normalizeThemeColors(response?.palettes);
     const theme = buildConfigFromColors(themeColors);
     return {
          theme,
          themeColors,
          themeId: response?.themeId ?? Number(GLOBALS.themeId ?? 1),
          locationId: response?.locationId ?? null,
          header: response?.header ?? null,
     };
}

/**
 * Build a themeColors + gluestack config pair from a single theme_catalog entry
 * ({id, themeId, name, baseMode, logo, header, primary, secondary, tertiary}). Goes through
 * buildConfigFromColors so Alert/Badge/etc. component theming stays consistent with the
 * single-theme flow.
 * @param themeEntry
 * @returns {{id, themeId, name, baseMode, logo, header, themeColors, theme}}
 */
export function buildThemeConfigFromCatalogEntry(themeEntry = {}) {
     const themeColors = {
          primary: buildSwatchFromThemeTokens(themeEntry?.primary),
          secondary: buildSwatchFromThemeTokens(themeEntry?.secondary),
          tertiary: buildSwatchFromThemeTokens(themeEntry?.tertiary),
     };

     return {
          id: themeEntry?.id ?? null,
          themeId: themeEntry?.themeId ?? themeEntry?.id ?? null,
          name: themeEntry?.name ?? null,
          baseMode: themeEntry?.baseMode ?? null,
          logo: themeEntry?.logo ?? null,
          header: themeEntry?.header ?? null,
          themeColors,
          theme: buildConfigFromColors(themeColors),
     };
}

/**
 * Build a ready-to-apply gluestack config for every theme available at a location (from the
 * locally stored theme catalog), so the app can switch between them without a network round trip.
 * @param locationId
 * @returns {Promise<Array>}
 */
export async function loadThemeConfigsForLocation(locationId) {
     const themes = await loadThemeCatalog(locationId);
     return themes.map(buildThemeConfigFromCatalogEntry);
}

export function useThemeForDisplay() {
     const { themeColors, colorMode, textColor, themeId, header } = useThemeState();
     const theme = React.useMemo(() => {
          if (!themeColors?.primary || !themeColors?.secondary || !themeColors?.tertiary) {
               return defaultConfig;
          }
          return buildConfigFromColors(themeColors);
     }, [themeColors]);

     return {
          theme,
          themeColors,
          themeId,
          colorMode,
          textColor,
          header,
     };
}

export function useTheme() {
     const { theme, themeColors, themeId, colorMode, textColor, header } = useThemeForDisplay();
     const updateThemeColors = useUpdateThemeColors();
     const updateColorModeValue = useUpdateThemeColorMode();
     const updateTextColorValue = useUpdateThemeTextColor();
     const resetThemeState = useResetThemeState();

     const updateTheme = React.useCallback(async (data, themeId, locationId, header) => {
          const primary = data?.tokens?.colors?.primary;
          const secondary = data?.tokens?.colors?.secondary;
          const tertiary = data?.tokens?.colors?.tertiary;
          if (!primary || !secondary || !tertiary) {
               return;
          }
          // themeId/locationId/header are optional: omit them to preserve whatever is already
          // stored (e.g. when the caller already persisted the correct values itself, or is just
          // re-applying cached colors) rather than stamping a static fallback over real values.
          await updateThemeColors(
               { primary, secondary, tertiary },
               themeId,
               locationId,
               header
          );
     }, [updateThemeColors]);

     const updateColorMode = React.useCallback(async (mode) => {
          await updateColorModeValue(mode);
          const nextTextColor = mode === 'light' ? '#1c1917' : '#f3f4f6';
          await updateTextColorValue(nextTextColor);
     }, [updateColorModeValue, updateTextColorValue]);

     const updateTextColor = React.useCallback(async (value) => {
          await updateTextColorValue(value);
     }, [updateTextColorValue]);

     const resetTheme = React.useCallback(async () => {
          await resetThemeState();
     }, [resetThemeState]);

     const forceRefreshTheme = React.useCallback(async (url = null, locationId = null) => {
          const builtTheme = await buildThemeForLibrary(url, locationId);
          await updateTheme(builtTheme.theme, builtTheme.themeId, builtTheme.locationId, builtTheme.header);
          return builtTheme;
     }, [updateTheme]);

     return {
          theme,
          themeColors,
          themeId,
          colorMode,
          textColor,
          header,
          updateTheme,
          updateColorMode,
          updateTextColor,
          resetTheme,
          forceRefreshTheme,
     };
}

export function UseColorMode(props) {
     const { showText } = props;
     const { colorMode, theme } = useThemeForDisplay();
     const location = useLibraryLocation();
     const themes = useAvailableThemes(location?.locationId);
     const updateTextColor = useUpdateThemeTextColor();
     const currentMode = colorMode === 'dark' ? 'wb-sunny' : 'nightlight-round';
     const currentColorMode = colorMode === 'dark' ? 'Dark' : 'Light';
     const currentModeB = colorMode === 'dark' ? 'nightlight-round' : 'wb-sunny';
     const iconColor = colorMode === 'dark' ? "$warmGray50" : "$coolGray700";
     const updateColorMode = useUpdateThemeColorMode();

     // If Aspen LiDA Themes are present and 2 or more exist, then display ThemeSwitcher
     if (Array.isArray(themes) && themes.length > 1) {
          return <ThemeSwitcher showText={showText} />;
     }

     // if Aspen LiDA Themes are present, but only 1 exists, we display nothing.
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
          await updateColorMode(newColorMode);
          await updateTextColor(newColorMode === 'light' ? '#1c1917' : '#f3f4f6');
     };

     if (showText) {
          return (
               <HStack alignItems="center">
                    <Button onPress={switchColorMode} borderRadius="$full" size="sm" bg="transparent">
                         <ButtonIcon as={MaterialIcons} name={currentModeB} size="sm" color={theme.tokens.colors.primary['500']} />
                         <ButtonText fontSize="$sm" color={iconColor}> {currentColorMode}</ButtonText>
                    </Button>
               </HStack>
          );
     }

     return (
          <Box alignItems="center">
               <Button onPress={switchColorMode} borderRadius="$full" size="sm" bg="transparent">
                    <ButtonIcon as={MaterialIcons} name={currentMode} size="sm" color={theme.tokens.colors.primary['500']} />
               </Button>
          </Box>
     );
}

/**
 * Lets the user switch between the themes available at their location (from the locally
 * stored theme catalog), applying the selected theme's colors and baseMode immediately.
 * Mirrors LanguageSwitcher's menu + switching-overlay pattern.
 * @param showText whether to show the active theme's name next to the trigger icon, mirroring UseColorMode's prop
 */
export const ThemeSwitcher = ({ showText = true } = {}) => {
     const { theme, themeId, colorMode, textColor } = useTheme();
     const location = useLibraryLocation();
     const themes = useAvailableThemes(location?.locationId);
     const updateThemeColors = useUpdateThemeColors();
     const updateColorMode = useUpdateThemeColorMode();

     const [isThemeMenuOpen, setIsThemeMenuOpen] = React.useState(false);
     const [isSwitchingTheme, setIsSwitchingTheme] = React.useState(false);

     const buttonRef = React.useRef(null);
     const [buttonY, setButtonY] = React.useState(0);

     const measureButton = React.useCallback(() => {
          if (buttonRef.current) {
               buttonRef.current.measureInWindow((x, y, width, height) => {
                    setButtonY(y + height + 8); // 8 for small padding below button
               });
          }
     }, []);

     const selectedThemeKey = React.useMemo(() => {
          if (themeId != null && themes.some((t) => t.id === themeId)) {
               return new Set([String(themeId)]);
          }
          if (Array.isArray(themes) && themes.length > 0) {
               return new Set([String(themes[0].id)]);
          }
          return new Set();
     }, [themeId, themes]);
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
               {isThemeMenuOpen && (
                    <Modal transparent animationType="fade" visible={isThemeMenuOpen}>
                         <View
                              style={{
                                   flex: 1,
                              }}
                              onTouchEnd={() => setIsThemeMenuOpen(false)}>
                              <Box flex={1} justifyContent="flex-end" alignItems="flex-start" pb="$12" pl="$10">
                                   <Box bgColor={colorMode === 'light' ? '$warmGray50' : '$coolGray700'} borderRadius="$md" p="$1" height={themes.length > 4 ? '150px' : undefined} width="200">
                                        <ScrollView nestedScrollEnabled={true} scrollEnabled={true}>
                                             {themes.map((themeEntry) => {
                                                  const isActive = themeEntry.id === themeId;
                                                  return (
                                                       <Box
                                                            key={themeEntry.id}
                                                            px="$4"
                                                            py="$3"
                                                            onTouchEnd={() => {
                                                                 setIsThemeMenuOpen(false);
                                                                 changeTheme(themeEntry);
                                                            }}>
                                                            <HStack space="md">
                                                                 <Text color={textColor}>{themeEntry.name}</Text>
                                                                 {isActive ? <Icon as={MaterialIcons} name="check" size="md" color={textColor} /> : null}
                                                            </HStack>
                                                       </Box>
                                                  );
                                             })}
                                        </ScrollView>
                                   </Box>
                              </Box>
                         </View>
                    </Modal>
               )}
               <Box alignItems="center">
                    <Button
                         ref={buttonRef}
                         size="sm"
                         borderRadius="$full"
                         isDisabled={isSwitchingTheme}
                         onPress={() => {
                              measureButton();
                              setIsThemeMenuOpen(true);
                         }}
                         bg="transparent">
                         <ButtonIcon as={MaterialIcons} name="palette" color={theme['tokens']['colors']['primary']['500']} />
                         {showText ? <ButtonText color={theme['tokens']['colors']['primary']['500']}> {activeThemeName}</ButtonText> : null}
                    </Button>
               </Box>
               <Modal transparent animationType="fade" visible={isSwitchingTheme}>
                    <View style={[themeSwitcherStyles.overlay, colorMode === 'dark' ? themeSwitcherStyles.overlayDark : themeSwitcherStyles.overlayLight]}>
                         <Box bg={colorMode === 'dark' ? '$coolGray800' : '$warmGray50'} borderRadius="$xl" px="$6" py="$5" alignItems="center" justifyContent="center">
                              <Spinner size="large" color={theme['tokens']['colors']['primary']['500']} />
                              <Text mt="$3" color={textColor}>
                                   Switching theme...
                              </Text>
                         </Box>
                    </View>
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

export const THEME_STALE_MS = 12 * 60 * 60 * 1000;
